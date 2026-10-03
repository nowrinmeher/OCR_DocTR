import uvicorn
import os
import sys

def main():
    port = 8000
    host = "127.0.0.1"
    url = f"http://{host}:{port}"
    print("=" * 70)
    print("DocTR AI OCR Studio - Starting Server")
    print(f"Local URL: {url}")
    print("Models:")
    print("   - Detection:  db_resnet50_best_V2.pt (DBNet ResNet-50)")
    print("   - Recognizer: crnn_vgg16_bn_best_English.pt (CRNN VGG-16 BN)")
    print("=" * 70)
    
    uvicorn.run("backend.app:app", host=host, port=port, reload=False, log_level="info")

if __name__ == "__main__":
    main()
