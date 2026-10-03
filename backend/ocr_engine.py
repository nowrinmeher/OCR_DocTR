import os
import io
import time
import torch
import numpy as np
from PIL import Image
from typing import List, Dict, Any, Tuple
from doctr.models import ocr_predictor, db_resnet50, crnn_vgg16_bn

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DET_PATH = os.path.join(BASE_DIR, "Models", "db_resnet50_best_V2.pt")
DEFAULT_REC_PATH = os.path.join(BASE_DIR, "Models", "crnn_vgg16_bn_best_English.pt")

HF_BASE_URL = "https://huggingface.co/spaces/nowrinm/ocr/resolve/main/Models"

def ensure_model_file(local_path: str, filename: str):
    if os.path.exists(local_path):
        return local_path
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    print(f"[DocTROCREngine] Model '{filename}' not found locally. Downloading from Hugging Face...")
    import urllib.request
    url = f"{HF_BASE_URL}/{filename}"
    urllib.request.urlretrieve(url, local_path)
    print(f"[DocTROCREngine] Downloaded '{filename}' successfully!")
    return local_path

class DocTROCREngine:
    def __init__(
        self,
        det_path: str = None,
        rec_path: str = None,
        device: str = None
    ):
        if det_path is None or not os.path.exists(det_path):
            det_path = ensure_model_file(DEFAULT_DET_PATH, "db_resnet50_best_V2.pt")
        if rec_path is None or not os.path.exists(rec_path):
            rec_path = ensure_model_file(DEFAULT_REC_PATH, "crnn_vgg16_bn_best_English.pt")
        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)
            
        print(f"[DocTROCREngine] Initializing OCR Engine on device: {self.device}")
        
        # Build 170-character vocabulary corresponding to ASCII range [32, 201]
        self.vocab = ''.join(chr(i) for i in range(32, 32 + 170))
        
        # 1. Detection Model
        print(f"[DocTROCREngine] Loading Detection model from: {det_path}")
        self.det_model = db_resnet50(pretrained=False, pretrained_backbone=False)
        det_state = torch.load(det_path, map_location="cpu")
        self.det_model.load_state_dict(det_state)
        self.det_model.to(self.device).eval()
        
        # 2. Recognition Model
        print(f"[DocTROCREngine] Loading Recognition model from: {rec_path}")
        self.rec_model = crnn_vgg16_bn(pretrained=False, pretrained_backbone=False, vocab=self.vocab)
        rec_state = torch.load(rec_path, map_location="cpu")
        self.rec_model.load_state_dict(rec_state)
        self.rec_model.to(self.device).eval()
        
        # 3. docTR Predictor
        self.predictor = ocr_predictor(
            det_arch=self.det_model,
            reco_arch=self.rec_model,
            pretrained=False,
            assume_straight_pages=True,
            export_as_straight_boxes=True
        )
        print("[DocTROCREngine] OCR Predictor initialized and ready!")

    def process_images(self, images: List[np.ndarray]) -> Dict[str, Any]:
        """
        Process a list of RGB numpy images (pages) and return structured OCR results.
        """
        start_time = time.perf_counter()
        
        # Run inference
        doc = self.predictor(images)
        duration = round((time.perf_counter() - start_time) * 1000, 2)
        
        doc_export = doc.export()
        
        total_words = 0
        confidences = []
        parsed_pages = []
        
        for p_idx, (page, img_np) in enumerate(zip(doc_export.get("pages", []), images)):
            h, w = img_np.shape[:2]
            page_words = []
            page_lines = []
            full_text_lines = []
            
            for b_idx, block in enumerate(page.get("blocks", [])):
                for l_idx, line in enumerate(block.get("lines", [])):
                    line_words = []
                    line_text_parts = []
                    
                    for w_idx, word in enumerate(line.get("words", [])):
                        val = word.get("value", "")
                        conf = float(word.get("confidence", 0.0))
                        box = word.get("geometry", ((0, 0), (0, 0)))
                        
                        # docTR geometry is ((xmin, ymin), (xmax, ymax)) in relative [0, 1] coordinates
                        (xmin, ymin), (xmax, ymax) = box
                        
                        # Absolute pixel coordinates
                        abs_box = {
                            "xmin": int(round(xmin * w)),
                            "ymin": int(round(ymin * h)),
                            "xmax": int(round(xmax * w)),
                            "ymax": int(round(ymax * h)),
                            "width": int(round((xmax - xmin) * w)),
                            "height": int(round((ymax - ymin) * h))
                        }
                        
                        word_data = {
                            "id": f"p{p_idx}_b{b_idx}_l{l_idx}_w{w_idx}",
                            "value": val,
                            "confidence": round(conf, 4),
                            "geometry": {
                                "xmin": round(xmin, 5),
                                "ymin": round(ymin, 5),
                                "xmax": round(xmax, 5),
                                "ymax": round(ymax, 5),
                            },
                            "pixel_geometry": abs_box
                        }
                        
                        page_words.append(word_data)
                        line_words.append(word_data)
                        line_text_parts.append(val)
                        confidences.append(conf)
                        total_words += 1
                    
                    line_str = " ".join(line_text_parts)
                    if line_str.strip():
                        full_text_lines.append(line_str)
                        line_geom = line.get("geometry", ((0,0), (0,0)))
                        (l_xmin, l_ymin), (l_xmax, l_ymax) = line_geom
                        page_lines.append({
                            "id": f"p{p_idx}_b{b_idx}_l{l_idx}",
                            "text": line_str,
                            "words": line_words,
                            "geometry": {
                                "xmin": round(l_xmin, 5),
                                "ymin": round(l_ymin, 5),
                                "xmax": round(l_xmax, 5),
                                "ymax": round(l_ymax, 5)
                            }
                        })
            
            parsed_pages.append({
                "page_number": p_idx + 1,
                "dimensions": {"width": w, "height": h},
                "total_words": len(page_words),
                "words": page_words,
                "lines": page_lines,
                "raw_text": "\n".join(full_text_lines)
            })
            
        avg_conf = round(sum(confidences) / len(confidences), 4) if confidences else 0.0
        
        return {
            "success": True,
            "device": str(self.device),
            "inference_time_ms": duration,
            "total_pages": len(parsed_pages),
            "total_words": total_words,
            "avg_confidence": avg_conf,
            "pages": parsed_pages
        }
