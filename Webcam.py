from ultralytics import YOLO  # import the YOLOv8 library
import cv2                     # import OpenCV for webcam access and display

# Load our custom-trained dart detection model
model = YOLO('runs/detect/train/weights/best.pt')

# Opens the default webcam 
cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()    # grab one frame from the webcam
    if not ret:
        break                   # stops if the webcam feed fails

# OpenCV Preprocessing
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 100, 200)

    results = model(frame)      # runs dart detection on this frame
    annotated = results[0].plot()  # draws detection boxes/labels onto the frame

    # Extract and print (x, y) coordinates
    for r in results:
        for box in r.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            x_center = int((x1 + x2) / 2)
            y_center = int((y1 + y2) / 2)
            print(f"[AI Feed] Dart Detected at Coordinates -> X: {x_center}, Y: {y_center}")

    # Display both the preprocessing feed and annotated detection feed
    cv2.imshow('Dart Detection Feed', annotated)
    cv2.imshow('OpenCV Preprocessing (Canny Edges)', edges)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()