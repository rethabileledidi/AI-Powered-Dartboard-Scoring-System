#!/usr/bin/env python3
"""
Flask Camera Server for AI Dart Scorer
Provides live camera feed and capture functionality for Raspberry Pi
"""

from flask import Flask, Response, render_template, request, jsonify
import cv2
import os
import sys
import time
import threading
from datetime import datetime
import json

# Try to import Picamera2 for Raspberry Pi
try:
    from picamera2 import Picamera2
    from libcamera import Transform
    PICAMERA_AVAILABLE = True
    print("Picamera2 imported successfully")
except ImportError:
    PICAMERA_AVAILABLE = False
    print("Picamera2 not available, using mock mode")

app = Flask(__name__)

# Global variables
camera = None
is_streaming = False
output_dir = "/home/pi/dataset"

class CameraService:
    def __init__(self):
        self.camera = None
        self.is_running = False
        
    def initialize(self):
        """Initialize the camera"""
        if not PICAMERA_AVAILABLE:
            print("Using mock camera mode")
            return True
            
        try:
            self.camera = Picamera2()
            
            # Configure camera
            config = self.camera.create_preview_configuration(
                main={"size": (1280, 720)},
                transform=Transform(hflip=1, vflip=1)
            )
            self.camera.configure(config)
            
            # Create dataset directory
            os.makedirs(output_dir, exist_ok=True)
            print(f"Dataset directory: {output_dir}")
            
            return True
        except Exception as e:
            print(f"Camera initialization failed: {e}")
            return False
    
    def start(self):
        """Start the camera"""
        if not PICAMERA_AVAILABLE:
            self.is_running = True
            return True
            
        try:
            if self.camera and not self.is_running:
                self.camera.start()
                self.is_running = True
                print("Camera started successfully")
                return True
        except Exception as e:
            print(f"Failed to start camera: {e}")
            return False
        return False
    
    def stop(self):
        """Stop the camera"""
        if not PICAMERA_AVAILABLE:
            self.is_running = False
            return True
            
        try:
            if self.camera and self.is_running:
                self.camera.stop()
                self.is_running = False
                print("Camera stopped")
                return True
        except Exception as e:
            print(f"Failed to stop camera: {e}")
            return False
        return False
    
    def capture_frame(self):
        """Capture a single frame"""
        if not PICAMERA_AVAILABLE:
            # Return mock frame data
            import numpy as np
            return np.zeros((720, 1280, 3), dtype=np.uint8)
            
        try:
            if self.camera and self.is_running:
                return self.camera.capture_array()
        except Exception as e:
            print(f"Failed to capture frame: {e}")
        return None
    
    def capture_image(self, filename=None):
        """Capture and save an image"""
        if not filename:
            filename = f"dart_capture_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        
        filepath = os.path.join(output_dir, filename)
        
        if not PICAMERA_AVAILABLE:
            # Mock capture - create a simple test image
            import numpy as np
            frame = np.zeros((720, 1280, 3), dtype=np.uint8)
            # Add some pattern to make it look like a test image
            frame[100:200, 100:200] = [255, 0, 0]  # Red square
            cv2.imwrite(filepath, frame)
            print(f"Mock image saved: {filepath}")
            return filepath
        
        try:
            if self.camera and self.is_running:
                self.camera.capture_file(filepath)
                print(f"Image captured: {filepath}")
                return filepath
        except Exception as e:
            print(f"Failed to capture image: {e}")
        return None

# Global camera service instance
camera_service = CameraService()

def generate_frames():
    """Generate frames for video streaming"""
    global is_streaming
    
    while is_streaming:
        frame = camera_service.capture_frame()
        if frame is not None:
            # Encode frame as JPEG
            ret, buffer = cv2.imencode('.jpg', frame)
            if ret:
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
        time.sleep(1/30)  # ~30 FPS

@app.route('/')
def index():
    """Main page with camera feed"""
    return render_template('camera.html')

@app.route('/video_feed')
def video_feed():
    """Video streaming route"""
    global is_streaming
    is_streaming = True
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/camera/stream')
def camera_stream_info():
    """Camera stream information"""
    return jsonify({
        'message': 'Camera stream endpoint is working',
        'status': 'active' if camera_service.is_running else 'inactive',
        'picamera_available': PICAMERA_AVAILABLE,
        'resolution': '1280x720' if PICAMERA_AVAILABLE else 'mock_mode'
    })

@app.route('/api/camera/capture', methods=['POST'])
def capture_image():
    """Capture image endpoint"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        save_to_dataset = data.get('saveToDataset', True)
        
        if save_to_dataset:
            filepath = camera_service.capture_image(filename)
        else:
            # Save to temp directory
            temp_dir = "/tmp"
            os.makedirs(temp_dir, exist_ok=True)
            if not filename:
                filename = f"temp_capture_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
            filepath = os.path.join(temp_dir, filename)
            filepath = camera_service.capture_image(filename)
        
        if filepath:
            return jsonify({
                'success': True,
                'filename': os.path.basename(filepath),
                'path': filepath,
                'timestamp': datetime.now().isoformat(),
                'message': 'Image captured successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to capture image'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/camera/control', methods=['POST'])
def camera_control():
    """Camera control endpoint"""
    try:
        data = request.get_json()
        action = data.get('action')
        
        if action == 'start':
            success = camera_service.start()
            return jsonify({
                'success': success,
                'action': 'start',
                'message': 'Camera started successfully' if success else 'Failed to start camera',
                'status': 'active' if success else 'inactive'
            })
            
        elif action == 'stop':
            success = camera_service.stop()
            return jsonify({
                'success': success,
                'action': 'stop',
                'message': 'Camera stopped successfully' if success else 'Failed to stop camera',
                'status': 'inactive'
            })
            
        elif action == 'test':
            # Test camera connection
            if PICAMERA_AVAILABLE:
                success = camera_service.initialize()
                return jsonify({
                    'success': success,
                    'action': 'test',
                    'message': 'Camera test completed',
                    'test_result': {
                        'connected': success,
                        'picamera_available': PICAMERA_AVAILABLE,
                        'resolution': '1280x720',
                        'fps': 30
                    }
                })
            else:
                return jsonify({
                    'success': True,
                    'action': 'test',
                    'message': 'Camera test completed (mock mode)',
                    'test_result': {
                        'connected': True,
                        'picamera_available': False,
                        'resolution': 'mock_mode',
                        'fps': 30
                    }
                })
        else:
            return jsonify({
                'success': False,
                'error': 'Invalid camera action'
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'camera_active': camera_service.is_running,
        'picamera_available': PICAMERA_AVAILABLE
    })

def cleanup():
    """Cleanup function"""
    global is_streaming
    is_streaming = False
    camera_service.stop()

if __name__ == '__main__':
    # Initialize camera
    if camera_service.initialize():
        print("Camera service initialized successfully")
    else:
        print("Camera service initialization failed, running in mock mode")
    
    try:
        # Start Flask app
        print("Starting Flask camera server on http://0.0.0.0:5000")
        app.run(host='0.0.0.0', port=5000, threaded=True)
    except KeyboardInterrupt:
        print("\nShutting down...")
        cleanup()
    except Exception as e:
        print(f"Error running server: {e}")
        cleanup()