import os
import cv2
import numpy as np

def generate_sample_documents(output_dir: str):
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Invoice Sample
    inv = np.ones((900, 700, 3), dtype=np.uint8) * 255
    cv2.rectangle(inv, (0, 0), (700, 90), (30, 41, 59), -1)
    cv2.putText(inv, "INVOICE", (40, 60), cv2.FONT_HERSHEY_DUPLEX, 1.4, (255, 255, 255), 2)
    cv2.putText(inv, "#INV-2026-8894", (480, 58), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 220, 240), 2)
    
    cv2.putText(inv, "Billed To: ACME Technologies Corp", (40, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (20, 30, 45), 2)
    cv2.putText(inv, "124 Innovation Boulevard, Suite 400", (40, 175), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (70, 80, 95), 1)
    cv2.putText(inv, "Issue Date: October 12, 2026", (440, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (70, 80, 95), 1)
    cv2.putText(inv, "Due Date: November 12, 2026", (440, 175), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (70, 80, 95), 1)
    
    # Table Header
    cv2.rectangle(inv, (40, 220), (660, 260), (241, 245, 249), -1)
    cv2.putText(inv, "DESCRIPTION", (55, 248), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (50, 60, 75), 2)
    cv2.putText(inv, "QTY", (380, 248), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (50, 60, 75), 2)
    cv2.putText(inv, "UNIT PRICE", (460, 248), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (50, 60, 75), 2)
    cv2.putText(inv, "AMOUNT", (580, 248), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (50, 60, 75), 2)
    
    items = [
        ("AI OCR Processing Engine V2", "1", "$ 1,200.00", "$ 1,200.00"),
        ("Custom Deep Learning Model Training", "3", "$ 450.00", "$ 1,350.00"),
        ("Cloud Infrastructure Deployment", "1", "$ 850.00", "$ 850.00"),
        ("Interactive Web Portal Design", "1", "$ 950.00", "$ 950.00"),
        ("Enterprise Support & Maintenance", "12", "$ 100.00", "$ 1,200.00")
    ]
    
    y = 310
    for desc, qty, price, amt in items:
        cv2.line(inv, (40, y + 15), (660, y + 15), (226, 232, 240), 1)
        cv2.putText(inv, desc, (55, y), cv2.FONT_HERSHEY_SIMPLEX, 0.58, (30, 40, 50), 1)
        cv2.putText(inv, qty, (390, y), cv2.FONT_HERSHEY_SIMPLEX, 0.58, (30, 40, 50), 1)
        cv2.putText(inv, price, (460, y), cv2.FONT_HERSHEY_SIMPLEX, 0.58, (30, 40, 50), 1)
        cv2.putText(inv, amt, (575, y), cv2.FONT_HERSHEY_SIMPLEX, 0.58, (30, 40, 50), 1)
        y += 55
        
    cv2.rectangle(inv, (400, 620), (660, 740), (248, 250, 252), -1)
    cv2.putText(inv, "Subtotal:        $ 5,550.00", (420, 650), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (50, 60, 70), 1)
    cv2.putText(inv, "Tax (8.5%):      $   471.75", (420, 680), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (50, 60, 70), 1)
    cv2.line(inv, (420, 695), (640, 695), (200, 200, 200), 1)
    cv2.putText(inv, "TOTAL DUE:   $ 6,021.75", (420, 725), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (15, 23, 42), 2)
    
    cv2.putText(inv, "Thank you for your business!", (40, 810), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (100, 116, 139), 1)
    cv2.putText(inv, "Payment is due within 30 days of issuance.", (40, 840), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (148, 163, 184), 1)
    cv2.imwrite(os.path.join(output_dir, "sample_invoice.png"), inv)
    
    # 2. Receipt Sample
    rec = np.ones((750, 450, 3), dtype=np.uint8) * 255
    cv2.putText(rec, "METRO COFFEE ROASTERS", (60, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (20, 20, 20), 2)
    cv2.putText(rec, "Order #84920 - Dine In", (120, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (80, 80, 80), 1)
    cv2.line(rec, (30, 120), (420, 120), (180, 180, 180), 1)
    
    rec_items = [
        ("1x Caramel Macchiato", "$ 5.75"),
        ("1x Artisan Croissant", "$ 4.50"),
        ("2x Espresso Double", "$ 7.00"),
        ("1x Avocado Toast Deluxe", "$ 12.50"),
        ("1x Organic Matcha Latte", "$ 6.25"),
    ]
    ry = 165
    for item, pr in rec_items:
        cv2.putText(rec, item, (35, ry), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (30, 30, 30), 1)
        cv2.putText(rec, pr, (340, ry), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (30, 30, 30), 1)
        ry += 45
        
    cv2.line(rec, (30, ry + 10), (420, ry + 10), (180, 180, 180), 1)
    cv2.putText(rec, "Subtotal:        $ 36.00", (160, ry + 50), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (60, 60, 60), 1)
    cv2.putText(rec, "Sales Tax:       $  2.88", (160, ry + 80), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (60, 60, 60), 1)
    cv2.putText(rec, "TOTAL:           $ 38.88", (160, ry + 120), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (10, 10, 10), 2)
    
    cv2.putText(rec, "CARD PAYMENT APPROVED", (100, ry + 180), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (30, 100, 30), 1)
    cv2.putText(rec, "THANK YOU FOR VISITING!", (105, ry + 220), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (100, 100, 100), 1)
    cv2.imwrite(os.path.join(output_dir, "sample_receipt.png"), rec)
    
    print(f"Sample documents generated in {output_dir}")

if __name__ == "__main__":
    generate_sample_documents(r"E:\DocTR Based OCR\backend\samples")
