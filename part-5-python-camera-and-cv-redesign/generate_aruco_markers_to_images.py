#!/usr/bin/env python3
"""
ArUco Marker Generator for AI Dart Board Scoring System

This script generates ArUco markers and saves them to the appropriate images directory.
Generated markers can be used for camera calibration and perspective correction.
"""

import cv2
import numpy as np
import os
import sys
from pathlib import Path

def ensure_directory_exists(directory_path):
    """Ensure the target directory exists, create if it doesn't."""
    Path(directory_path).mkdir(parents=True, exist_ok=True)
    print(f"✓ Directory ensured: {directory_path}")

def generate_aruco_marker(marker_id, dictionary_type=cv2.aruco.DICT_4X4_50, size=400, border_size=1):
    """
    Generate an ArUco marker image.
    
    Args:
        marker_id (int): ID of the marker to generate
        dictionary_type: ArUco dictionary type
        size (int): Size of the marker in pixels
        border_size (int): Size of the border around the marker
    
    Returns:
        numpy.ndarray: The marker image
    """
    # Load the ArUco dictionary
    aruco_dict = cv2.aruco.getPredefinedDictionary(dictionary_type)
    
    # Generate the marker
    marker_image = cv2.aruco.generateImageMarker(aruco_dict, marker_id, size, border_size)
    
    # Convert to BGR format (OpenCV default)
    if len(marker_image.shape) == 2:
        marker_image = cv2.cvtColor(marker_image, cv2.COLOR_GRAY2BGR)
    
    return marker_image

def save_marker_with_info(marker_image, marker_id, output_dir):
    """Save marker image with information text."""
    filename = f"marker_{marker_id}.png"
    filepath = os.path.join(output_dir, filename)
    
    # Add text information to the marker
    marker_with_info = marker_image.copy()
    height, width = marker_with_info.shape[:2]
    
    # Add text at the bottom
    text = f"ArUco Marker ID: {marker_id}"
    cv2.putText(marker_with_info, text, (10, height - 10), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    
    # Save the image
    cv2.imwrite(filepath, marker_with_info)
    print(f"✓ Generated: {filepath}")
    
    return filepath

def create_calibration_grid(output_dir, rows=2, cols=3, marker_size=400, spacing=50):
    """Create a grid of ArUco markers for calibration."""
    
    # Calculate grid dimensions
    cell_size = marker_size + spacing
    grid_width = cols * cell_size + spacing
    grid_height = rows * cell_size + spacing
    
    # Create white background
    grid_image = np.ones((grid_height, grid_width, 3), dtype=np.uint8) * 255
    
    marker_id = 1
    for row in range(rows):
        for col in range(cols):
            if marker_id <= 6:  # Generate 6 markers
                # Generate marker
                marker = generate_aruco_marker(marker_id)
                
                # Calculate position
                x = col * cell_size + spacing
                y = row * cell_size + spacing
                
                # Place marker on grid
                grid_image[y:y+marker_size, x:x+marker_size] = marker
                
                marker_id += 1
    
    # Save the grid
    grid_filename = os.path.join(output_dir, "aruco_calibration_grid.png")
    cv2.imwrite(grid_filename, grid_image)
    print(f"✓ Generated calibration grid: {grid_filename}")
    
    return grid_filename

def main():
    """Main function to generate ArUco markers."""
    print("🎯 ArUco Marker Generator for AI Dart Board Scoring System")
    print("=" * 60)
    
    # Define the target directory
    project_root = Path(__file__).parent
    aruco_dir = project_root / "public" / "images" / "aruco-markers"
    
    # Ensure directory exists
    ensure_directory_exists(aruco_dir)
    
    # Generate individual markers (1-6)
    print("\n📋 Generating individual ArUco markers...")
    marker_files = []
    
    for marker_id in range(1, 7):  # Generate markers 1-6
        try:
            marker_image = generate_aruco_marker(marker_id)
            filepath = save_marker_with_info(marker_image, marker_id, aruco_dir)
            marker_files.append(filepath)
        except Exception as e:
            print(f"❌ Error generating marker {marker_id}: {e}")
    
    # Generate calibration grid
    print("\n🔲 Generating calibration grid...")
    try:
        grid_file = create_calibration_grid(aruco_dir)
    except Exception as e:
        print(f"❌ Error generating calibration grid: {e}")
    
    print(f"\n✅ Successfully generated {len(marker_files)} individual markers")
    print("📁 Output directory:", aruco_dir)
    print("\n🎯 Usage Instructions:")
    print("1. Print the markers on paper or display on screen")
    print("2. Place them around your dartboard for calibration")
    print("3. Use the calibration grid for initial camera setup")
    print("4. Refer to the OpenCV integration guide for usage")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⏹️  Generation cancelled by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)