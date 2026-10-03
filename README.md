---
title: DocTR AI OCR Studio
emoji: 🔍
colorFrom: blue
colorTo: indigo
sdk: gradio
sdk_version: 6.29.1
app_file: app.py
pinned: false
---

# DocTR AI OCR Studio

An interactive, high-precision document OCR web application powered by **docTR**:
- **Word Detection Backbone**: DBNet with ResNet-50 (`db_resnet50_best_V2.pt`)
- **Word Recognition Backbone**: CRNN with VGG-16 BN & CTC Decoder (`crnn_vgg16_bn_best_English.pt`)
- **Interactive Features**: Real-time bounding box hover labels, confidence filtering, preset document samples, and text/JSON export.
