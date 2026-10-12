#!/usr/bin/env python3
"""
ArUco Marker Generation Script

This script generates ArUco markers for dartboard calibration.
Generated markers can be printed and placed on dartboards for 
computer vision detection.

Usage:
    python generate_aruco_markers.py

Requirements:
    pip install opencv-python opencv-contrib-python
"""

import cv2
import numpy as np
import os
import sys

def generate_aruco_markers():
    """Generate ArUco markers and save them as images."""
    
    # Define ArUco dictionary and parameters
    aruco_dict = cv2.aruco.Dictionary_get(cv2.aruco.DICT_4X4_50)
    marker_size = 200  # pixels
    
    # Create output directory if it doesn't exist
    output_dir = os.path.dirname(os.path.abspath(__file__))
    
    print(f"Generating ArUco markers in: {output_dir}")
    
    # Generate markers 0-3 (typically used for dartboard corners)
    for marker_id in range(4):
        # Generate marker image
        marker_image = cv2.aruco.drawMarker(aruco_dict, marker_id, marker_size)
        
        # Save marker
        filename = os.path.join(output_dir, f"aruco_4x4_{marker_id}.png")
        cv2.imwrite(filename, marker_image)
        
        print(f"Generated: {filename}")
        
        # Also create a larger version for easier printing
        large_size = 400
        large_marker = cv2.aruco.drawMarker(aruco_dict, marker_id, large_size)
        large_filename = os.path.join(output_dir, f"aruco_4x4_{marker_id}_large.png")
        cv2.imwrite(large_filename, large_marker)
        
        print(f"Generated: {large_filename}")
    
    # Create a composite image with all 4 markers
    composite = np.zeros((marker_size * 2 + 20, marker_size * 2 + 20), dtype=np.uint8)
    composite.fill(255)  # White background
    
    # Place markers in 2x2 grid
    positions = [(0, 0), (0, 1), (1, 0), (1, 1)]
    for i, (row, col) in enumerate(positions):
        if i < 4:
            y_start = row * (marker_size + 10) + 10
            x_start = col * (marker_size + 10) + 10
            composite[y_start:y_start + marker_size, x_start:x_start + marker_size] = marker_image
    
    composite_filename = os.path.join(output_dir, "aruco_4x4_composite.png")
    cv2.imwrite(composite_filename, composite)
    print(f"Generated: {composite_filename}")
    
    print("\nArUco marker generation complete!")
    print("Markers are ready for printing and dartboard calibration.")

def create_calibration_guide():
    """Create a calibration guide image."""
    
    # Create a simple guide image
    guide_image = np.zeros((600, 800, 3), dtype=np.uint8)
    guide_image.fill(255)  # White background
    
    # Add text instructions
    cv2.putText(guide_image, "ArUco Marker Placement Guide", (50, 50), 
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
    
    instructions = [
        "1. Print the aruco_4x4_*.png files",
        "2. Place markers on dartboard corners:",
        "   - Top-left: Marker 0",
        "   - Top-right: Marker 1", 
        "   - Bottom-left: Marker 2",
        "   - Bottom-right: Marker 3",
        "3. Ensure markers are flat and visible",
        "4. Use composite image for reference"
    ]
    
    for i, instruction in enumerate(instructions):
        cv2.putText(guide_image, instruction, (50, 100 + i * 40), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    
    guide_filename = os.path.join(os.path.dirname(os.path.abspath(__file__)), 
                                 "calibration_guide.png")
    cv2.imwrite(guide_filename, guide_image)
    print(f"Generated: {guide_filename}")

if __name__ == "__main__":
    try:
        generate_aruco_markers()
        create_calibration_guide()
    except Exception as e:
        print(f"Error generating markers: {e}")
        sys.exit(1)