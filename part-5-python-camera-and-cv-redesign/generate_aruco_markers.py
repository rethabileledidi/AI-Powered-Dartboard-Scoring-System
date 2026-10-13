#!/usr/bin/env python3
"""
Generate ArUco markers for dart scoring system
Creates markers with IDs 0, 1, 2, 3 as required by the system
"""

import cv2
import numpy as np
import os

def generate_aruco_markers():
    """Generate ArUco markers with IDs 0-3"""
    
    # Create output directory if it doesn't exist
    output_dir = "public/images/aruco-markers"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # ArUco dictionary (4x4, 50 markers)
    aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    
    # Generate markers for IDs 0, 1, 2, 3
    marker_ids = [0, 1, 2, 3]
    marker_size = 200  # pixels
    
    print("🎯 Generating ArUco markers for dart scoring system...")
    print("=" * 50)
    
    for marker_id in marker_ids:
        # Generate marker
        marker_image = cv2.aruco.generateImageMarker(aruco_dict, marker_id, marker_size)
        
        # Add border and text
        bordered_image = cv2.copyMakeBorder(marker_image, 20, 20, 20, 20, cv2.BORDER_CONSTANT, value=[255, 255, 255])
        
        # Add ID text
        text = f"ID: {marker_id}"
        cv2.putText(bordered_image, text, (10, bordered_image.shape[0] - 10), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
        
        # Save marker
        filename = os.path.join(output_dir, f"aruco_marker_{marker_id}.png")
        cv2.imwrite(filename, bordered_image)
        
        print(f"✅ Generated: {filename}")
    
    print("\n" + "=" * 50)
    print("🎉 All ArUco markers generated successfully!")
    print(f"📁 Markers saved in: {output_dir}/")
    print("\n📋 Next steps:")
    print("1. Print the markers (ID 0, 1, 2, 3)")
    print("2. Place them around your dartboard:")
    print("   - ID 0: Top-left corner")
    print("   - ID 1: Top-right corner")
    print("   - ID 2: Bottom-left corner")
    print("   - ID 3: Bottom-right corner")
    print("3. Take photos of your dartboard with these markers")
    print("4. Run: python config4.py")

if __name__ == "__main__":
    generate_aruco_markers()