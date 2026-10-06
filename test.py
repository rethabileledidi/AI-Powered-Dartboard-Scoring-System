from ultralytics import YOLO

model = YOLO('runs/detect/train/weights/best.pt')
results = model('test/images/20250913_135520_jpg.rf.4431501dafc7b5271724fcb6875e8de2.jpg')
results[0].show()