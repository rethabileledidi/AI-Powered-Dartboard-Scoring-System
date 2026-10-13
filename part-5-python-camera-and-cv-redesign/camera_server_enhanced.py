#!/usr/bin/env python3
"""
Enhanced Flask Camera Server for AI Dart Scorer
Provides live camera feed and capture functionality for Raspberry Pi with advanced features
"""

from flask import Flask, Response, render_template, request, jsonify, send_from_directory
import cv2
import os
import sys
import time
import threading
import json
import base64
from datetime import datetime
import numpy as np
from typing import Optional, Dict, Any

# Try to import Picamera2 for Raspberry Pi
try:
    from picamera2 import Picamera2
    from libcamera import Transform, controls
    PICAMERA_AVAILABLE = True
    print("✅ Picamera2 imported successfully")
except ImportError:
    PICAMERA_AVAILABLE = False
    print("⚠️ Picamera2 not available, using mock mode")

app = Flask(__name__)

# Global variables
camera = None
is_streaming = False
output_dir = "/home/pi/dataset"
captured_images = []
detection_results = []
settings = {
    'resolution': [1280, 720],
    'fps': 30,
    'quality': 95,
    'auto_capture': False,
    'capture_interval': 2.0,
    'detection_enabled': True
}

class EnhancedCameraService:
    def __init__(self):
        self.camera = None
        self.is_running = False
        self.frame_count = 0
        self.last_capture_time = 0
        self.capture_thread = None
        self.settings = settings
        
    def initialize(self) -> bool:
        """Initialize the camera with advanced settings"""
        if not PICAMERA_AVAILABLE:
            print("🎭 Using mock camera mode with enhanced features")
            return True
            
        try:
            self.camera = Picamera2()
            
            # Enhanced camera configuration
            config = self.camera.create_preview_configuration(
                main={"size": tuple(self.settings['resolution']), "format": "RGB888"},
                transform=Transform(hflip=True, vflip=True),
                controls={
                    "NoiseReductionMode": controls.NoiseReductionModeEnum.HighQuality,
                    "AeEnable": True,
                    "AwbEnable": True,
                    "Saturation": 1.0,
                    "Sharpness": 1.0,
                    "Contrast": 1.0
                }
            )
            self.camera.configure(config)
            
            # Create dataset directory
            os.makedirs(output_dir, exist_ok=True)
            os.makedirs(os.path.join(output_dir, "captures"), exist_ok=True)
            os.makedirs(os.path.join(output_dir, "detections"), exist_ok=True)
            print(f"📁 Dataset directory: {output_dir}")
            
            return True
        except Exception as e:
            print(f"❌ Camera initialization failed: {e}")
            return False
    
    def start(self) -> bool:
        """Start the camera"""
        if not PICAMERA_AVAILABLE:
            self.is_running = True
            print("🎭 Mock camera started")
            return True
            
        try:
            if self.camera and not self.is_running:
                self.camera.start()
                self.is_running = True
                print("📷 Camera started successfully")
                return True
        except Exception as e:
            print(f"❌ Failed to start camera: {e}")
            return False
        return False
    
    def stop(self) -> bool:
        """Stop the camera"""
        if not PICAMERA_AVAILABLE:
            self.is_running = False
            print("🎭 Mock camera stopped")
            return True
            
        try:
            if self.camera and self.is_running:
                self.camera.stop()
                self.is_running = False
                print("📷 Camera stopped")
                return True
        except Exception as e:
            print(f"❌ Failed to stop camera: {e}")
            return False
        return False
    
    def capture_frame(self) -> Optional[np.ndarray]:
        """Capture a single frame with enhanced processing"""
        if not PICAMERA_AVAILABLE:
            # Return enhanced mock frame data
            frame = self._create_mock_frame()
            return frame
            
        try:
            if self.camera and self.is_running:
                frame = self.camera.capture_array()
                # Apply basic enhancements
                frame = self._enhance_frame(frame)
                return frame
        except Exception as e:
            print(f"❌ Failed to capture frame: {e}")
        return None
    
    def _create_mock_frame(self) -> np.ndarray:
        """Create a realistic mock frame for testing"""
        height, width = self.settings['resolution'][1], self.settings['resolution'][0]
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        
        # Create a more realistic mock scene
        # Background gradient
        for i in range(height):
            for j in range(width):
                frame[i, j] = [
                    int(50 + (i / height) * 30),  # Blue gradient
                    int(50 + (j / width) * 30),   # Green gradient
                    int(60 + (i + j) / (height + width) * 40)  # Red gradient
                ]
        
        # Add some "dartboard-like" circles
        center_x, center_y = width // 2, height // 2
        cv2.circle(frame, (center_x, center_y), min(width, height) // 3, (200, 200, 200), 3)
        cv2.circle(frame, (center_x, center_y), min(width, height) // 6, (180, 180, 180), 2)
        
        # Add timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(frame, f"Mock Camera - {timestamp}", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        return frame
    
    def _enhance_frame(self, frame: np.ndarray) -> np.ndarray:
        """Apply basic frame enhancements"""
        # Convert to RGB for consistent processing
        if len(frame.shape) == 3 and frame.shape[2] == 3:
            # Basic color correction
            frame = cv2.convertScaleAbs(frame, alpha=1.1, beta=10)
            # Denoising
            frame = cv2.fastNlMeansDenoisingColored(frame, None, 10, 10, 7, 21)
        return frame
    
    def capture_image(self, filename: Optional[str] = None, save_to_dataset: bool = True) -> Optional[str]:
        """Capture and save an image with metadata"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"dart_capture_{timestamp}.jpg"
        
        if save_to_dataset:
            filepath = os.path.join(output_dir, "captures", filename)
        else:
            temp_dir = "/tmp"
            os.makedirs(temp_dir, exist_ok=True)
            filepath = os.path.join(temp_dir, filename)
        
        frame = self.capture_frame()
        if frame is not None:
            # Save with high quality
            success = cv2.imwrite(filepath, frame, [cv2.IMWRITE_JPEG_QUALITY, self.settings['quality']])
            if success:
                # Add to captured images list with metadata
                image_info = {
                    'filename': filename,
                    'path': filepath,
                    'timestamp': datetime.now().isoformat(),
                    'size': frame.shape,
                    'save_to_dataset': save_to_dataset
                }
                captured_images.append(image_info)
                print(f"📸 Image captured: {filepath}")
                return filepath
        return None
    
    def start_auto_capture(self) -> None:
        """Start automatic capture at intervals"""
        if self.capture_thread and self.capture_thread.is_alive():
            return
        
        self.settings['auto_capture'] = True
        self.capture_thread = threading.Thread(target=self._auto_capture_loop)
        self.capture_thread.daemon = True
        self.capture_thread.start()
        print("🔄 Auto capture started")
    
    def stop_auto_capture(self) -> None:
        """Stop automatic capture"""
        self.settings['auto_capture'] = False
        if self.capture_thread:
            self.capture_thread.join(timeout=1.0)
        print("⏹️ Auto capture stopped")
    
    def _auto_capture_loop(self) -> None:
        """Background thread for automatic capture"""
        while self.settings['auto_capture']:
            current_time = time.time()
            if current_time - self.last_capture_time >= self.settings['capture_interval']:
                self.capture_image()
                self.last_capture_time = current_time
            time.sleep(0.1)  # Small sleep to prevent excessive CPU usage

# Global camera service instance
camera_service = EnhancedCameraService()

def generate_frames():
    """Generate frames for video streaming with enhancements"""
    global is_streaming
    
    frame_count = 0
    while is_streaming:
        frame = camera_service.capture_frame()
        if frame is not None:
            frame_count += 1
            
            # Add frame info overlay
            if PICAMERA_AVAILABLE:
                info_text = f"Live Camera - Frame: {frame_count}"
            else:
                info_text = f"Mock Camera - Frame: {frame_count}"
            
            cv2.putText(frame, info_text, (10, frame.shape[0] - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            
            # Encode frame as JPEG
            ret, buffer = cv2.imencode('.jpg', frame)
            if ret:
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
        time.sleep(1/30)  # ~30 FPS

@app.route('/')
def index():
    """Main page with enhanced camera feed interface"""
    return render_template('camera_enhanced.html')

@app.route('/video_feed')
def video_feed():
    """Enhanced video streaming route"""
    global is_streaming
    is_streaming = True
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/camera/stream')
def camera_stream_info():
    """Enhanced camera stream information"""
    return jsonify({
        'message': 'Enhanced camera stream endpoint is working',
        'status': 'active' if camera_service.is_running else 'inactive',
        'picamera_available': PICAMERA_AVAILABLE,
        'resolution': settings['resolution'],
        'fps': settings['fps'],
        'quality': settings['quality'],
        'auto_capture': settings['auto_capture'],
        'capture_interval': settings['capture_interval'],
        'total_captures': len(captured_images),
        'mode': 'enhanced_mock' if not PICAMERA_AVAILABLE else 'real_camera'
    })

@app.route('/api/camera/capture', methods=['POST'])
def capture_image():
    """Enhanced image capture endpoint"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        save_to_dataset = data.get('saveToDataset', True)
        enhance_image = data.get('enhance', True)
        
        filepath = camera_service.capture_image(filename, save_to_dataset)
        
        if filepath:
            # Get image info
            image_info = captured_images[-1] if captured_images else None
            
            return jsonify({
                'success': True,
                'filename': os.path.basename(filepath),
                'path': filepath,
                'timestamp': datetime.now().isoformat(),
                'image_info': image_info,
                'total_captures': len(captured_images),
                'message': 'Image captured successfully with enhanced processing'
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
    """Enhanced camera control endpoint"""
    try:
        data = request.get_json()
        action = data.get('action')
        params = data.get('params', {})
        
        if action == 'start':
            success = camera_service.start()
            return jsonify({
                'success': success,
                'action': 'start',
                'message': 'Enhanced camera started successfully' if success else 'Failed to start camera',
                'status': 'active' if success else 'inactive'
            })
            
        elif action == 'stop':
            success = camera_service.stop()
            return jsonify({
                'success': success,
                'action': 'stop',
                'message': 'Enhanced camera stopped successfully' if success else 'Failed to stop camera',
                'status': 'inactive'
            })
            
        elif action == 'test':
            # Enhanced camera test
            if PICAMERA_AVAILABLE:
                success = camera_service.initialize()
                test_result = {
                    'connected': success,
                    'picamera_available': PICAMERA_AVAILABLE,
                    'resolution': settings['resolution'],
                    'fps': settings['fps'],
                    'quality': settings['quality'],
                    'enhancement_features': ['noise_reduction', 'color_correction', 'auto_exposure'],
                    'supported_controls': ['exposure', 'white_balance', 'saturation', 'sharpness']
                }
            else:
                test_result = {
                    'connected': True,
                    'picamera_available': False,
                    'resolution': settings['resolution'],
                    'fps': settings['fps'],
                    'quality': settings['quality'],
                    'enhancement_features': ['mock_generation', 'timestamp_overlay', 'dartboard_simulation'],
                    'supported_controls': ['auto_capture', 'capture_interval', 'frame_rate']
                }
            
            return jsonify({
                'success': True,
                'action': 'test',
                'message': 'Enhanced camera test completed',
                'test_result': test_result
            })
            
        elif action == 'auto_capture':
            enable = params.get('enable', False)
            interval = params.get('interval', 2.0)
            
            if enable:
                camera_service.settings['capture_interval'] = interval
                camera_service.start_auto_capture()
                message = f'Auto capture started with {interval}s interval'
            else:
                camera_service.stop_auto_capture()
                message = 'Auto capture stopped'
            
            return jsonify({
                'success': True,
                'action': 'auto_capture',
                'message': message,
                'auto_capture': camera_service.settings['auto_capture'],
                'capture_interval': camera_service.settings['capture_interval']
            })
            
        elif action == 'update_settings':
            # Update camera settings
            new_settings = params.get('settings', {})
            camera_service.settings.update(new_settings)
            
            return jsonify({
                'success': True,
                'action': 'update_settings',
                'message': 'Camera settings updated',
                'settings': camera_service.settings
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

@app.route('/api/camera/images')
def get_captured_images():
    """Get list of captured images"""
    return jsonify({
        'images': captured_images,
        'total': len(captured_images)
    })

@app.route('/api/camera/images/<filename>')
def serve_image(filename):
    """Serve captured images"""
    try:
        return send_from_directory(os.path.join(output_dir, "captures"), filename)
    except:
        return jsonify({'error': 'Image not found'}), 404

@app.route('/api/health')
def health_check():
    """Enhanced health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'camera_active': camera_service.is_running,
        'picamera_available': PICAMERA_AVAILABLE,
        'auto_capture': camera_service.settings['auto_capture'],
        'total_captures': len(captured_images),
        'system_info': {
            'python_version': sys.version,
            'opencv_version': cv2.__version__ if 'cv2' in globals() else 'N/A',
            'picamera_version': 'Available' if PICAMERA_AVAILABLE else 'Not Available'
        }
    })

@app.route('/api/stats')
def get_stats():
    """Get camera and capture statistics"""
    if not captured_images:
        return jsonify({'message': 'No captures yet'})
    
    # Calculate statistics
    total_images = len(captured_images)
    dataset_images = sum(1 for img in captured_images if img.get('save_to_dataset', False))
    
    return jsonify({
        'total_images': total_images,
        'dataset_images': dataset_images,
        'temp_images': total_images - dataset_images,
        'first_capture': captured_images[0]['timestamp'] if captured_images else None,
        'last_capture': captured_images[-1]['timestamp'] if captured_images else None,
        'camera_status': 'active' if camera_service.is_running else 'inactive',
        'auto_capture_enabled': camera_service.settings['auto_capture']
    })

def cleanup():
    """Enhanced cleanup function"""
    global is_streaming
    is_streaming = False
    camera_service.stop_auto_capture()
    camera_service.stop()

if __name__ == '__main__':
    # Initialize enhanced camera
    if camera_service.initialize():
        print("✅ Enhanced camera service initialized successfully")
    else:
        print("⚠️ Enhanced camera service initialization failed, running in enhanced mock mode")
    
    try:
        # Start Flask app
        print("🚀 Starting Enhanced Flask camera server on http://0.0.0.0:5000")
        print("📱 Enhanced camera interface available at: http://localhost:5000")
        print("🔧 API endpoints available at: http://localhost:5000/api/*")
        app.run(host='0.0.0.0', port=5000, threaded=True)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down enhanced camera server...")
        cleanup()
    except Exception as e:
        print(f"❌ Error running enhanced server: {e}")
        cleanup()