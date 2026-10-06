from ultralytics import YOLO

model = YOLO('yolov8s.pt')  

model.train(
    data='C:/Users/tshia/Project381 Dataset/data.yaml',
    epochs=100,        # more passes over the data
    patience=20,       # stop early if it stops improving, saves time
    imgsz=640,
    degrees=15.0,      #  helps with angle variation
    fliplr=0.5,        # horizontal flip augmentation
    hsv_v=0.4,         # helps with lighting differences
)