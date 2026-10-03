import os
import json
import numpy as np
from PIL import Image
import gradio as gr
from backend.ocr_engine import DocTROCREngine

# Initialize OCR Engine
engine = DocTROCREngine()

def process_document(image_input, min_conf):
    if image_input is None:
        return None, "Please upload an image.", "{}"
    
    # Convert PIL Image to RGB numpy array
    if isinstance(image_input, Image.Image):
        img_np = np.array(image_input.convert("RGB"))
    else:
        img_np = np.array(image_input)
        
    result = engine.process_images([img_np])
    page = result["pages"][0]
    
    # Build Annotations list for gr.AnnotatedImage
    # Each annotation is ((xmin, ymin, xmax, ymax), label) in pixel coordinates
    annotations = []
    h, w = img_np.shape[:2]
    
    for word in page["words"]:
        conf = word["confidence"]
        if conf * 100 < min_conf:
            continue
            
        g = word["pixel_geometry"]
        bbox = (g["xmin"], g["ymin"], g["xmax"], g["ymax"])
        label = f"{word['value']} ({int(conf * 100)}%)"
        annotations.append((bbox, label))
        
    annotated_output = (img_np, annotations)
    raw_text = page["raw_text"]
    json_str = json.dumps(result, indent=2)
    
    stats_summary = f"✨ Extracted {len(annotations)} words | Inference Time: {result['inference_time_ms']}ms | Device: {result['device']}"
    
    return annotated_output, raw_text, json_str, stats_summary

# Custom Gradio UI Design
custom_css = """
.gradio-container {
    font-family: 'Inter', sans-serif !important;
}
.header-box {
    text-align: center;
    padding: 20px;
    background: linear-gradient(135deg, #0f172a, #1e293b);
    border-radius: 12px;
    margin-bottom: 16px;
    color: white;
}
.header-title {
    font-size: 28px;
    font-weight: 800;
    margin-bottom: 4px;
    background: linear-gradient(135deg, #38bdf8, #818cf8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}
"""

with gr.Blocks(css=custom_css, theme=gr.themes.Soft(primary_hue="cyan", neutral_hue="slate")) as demo:
    gr.HTML("""
    <div class="header-box">
        <h1 class="header-title">🔍 DocTR AI Intelligent OCR Studio</h1>
        <p style="color: #94a3b8; font-size: 14px;">High-Precision Word Detection (DBNet ResNet-50) & Recognition (CRNN VGG-16 BN)</p>
    </div>
    """)
    
    with gr.Row():
        with gr.Column(scale=1):
            image_input = gr.Image(type="pil", label="Upload Document / Image", sources=["upload", "clipboard"])
            min_conf_slider = gr.Slider(minimum=0, maximum=100, value=0, step=5, label="Min Confidence Filter (%)")
            submit_btn = gr.Button("🚀 Run DocTR OCR", variant="primary", size="lg")
            
            # Examples
            samples_dir = os.path.join(os.path.dirname(__file__), "backend", "samples")
            sample_inv = os.path.join(samples_dir, "sample_invoice.png")
            sample_rec = os.path.join(samples_dir, "sample_receipt.png")
            example_images = []
            if os.path.exists(sample_inv): example_images.append([sample_inv, 0])
            if os.path.exists(sample_rec): example_images.append([sample_rec, 0])
            
            if example_images:
                gr.Examples(
                    examples=example_images,
                    inputs=[image_input, min_conf_slider],
                    label="Try Preset Documents"
                )
        
        with gr.Column(scale=1):
            stats_display = gr.Markdown("### Ready for document upload")
            annotated_output = gr.AnnotatedImage(label="Interactive Word Bounding Boxes (Hover to inspect)")
            
            with gr.Tabs():
                with gr.TabItem("📄 Transcribed Text"):
                    text_output = gr.Textbox(label="Extracted Text", lines=12, show_copy_button=True)
                with gr.TabItem("📊 Raw JSON Data"):
                    json_output = gr.Code(label="Structured docTR Output", language="json", lines=12)

    submit_btn.click(
        fn=process_document,
        inputs=[image_input, min_conf_slider],
        outputs=[annotated_output, text_output, json_output, stats_display]
    )

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
