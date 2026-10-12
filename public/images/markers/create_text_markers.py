#!/usr/bin/env python3
"""
Text-based ArUco Marker Placeholder Generator

This script creates simple text-based marker files for development
and testing purposes. These are basic text descriptions that can be
used as placeholders until proper image markers are generated.

Usage:
    python create_text_markers.py
"""

import os
import sys

def create_text_markers():
    """Create text-based marker descriptions."""
    
    output_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"Creating text-based markers in: {output_dir}")
    
    # Create marker descriptions
    markers = [
        {
            'id': 0,
            'name': 'Top-Left Marker',
            'description': 'Cross pattern marker for top-left corner',
            'position': 'TL',
            'pattern': 'Horizontal and vertical lines crossing at center'
        },
        {
            'id': 1,
            'name': 'Top-Right Marker', 
            'description': 'Diagonal pattern marker for top-right corner',
            'position': 'TR',
            'pattern': 'Two diagonal lines crossing at center'
        },
        {
            'id': 2,
            'name': 'Bottom-Left Marker',
            'description': 'Square pattern marker for bottom-left corner', 
            'position': 'BL',
            'pattern': 'Concentric squares with thick borders'
        },
        {
            'id': 3,
            'name': 'Bottom-Right Marker',
            'description': 'Circle pattern marker for bottom-right corner',
            'position': 'BR', 
            'pattern': 'Concentric circles with thick borders'
        }
    ]
    
    # Create individual marker files
    for marker in markers:
        filename = os.path.join(output_dir, f"marker_{marker['id']}_description.txt")
        
        with open(filename, 'w') as f:
            f.write(f"Marker ID: {marker['id']}\n")
            f.write(f"Name: {marker['name']}\n")
            f.write(f"Position: {marker['position']}\n")
            f.write(f"Description: {marker['description']}\n")
            f.write(f"Pattern: {marker['pattern']}\n")
            f.write(f"\n")
            f.write("Placement Instructions:\n")
            f.write(f"- Place this marker in the {marker['position']} corner of the dartboard\n")
            f.write("- Ensure the marker is flat and fully visible\n")
            f.write("- Maintain consistent distance from dartboard edge\n")
            f.write("- Avoid shadows or glare on the marker surface\n")
        
        print(f"Created: {filename}")
    
    # Create composite description file
    composite_filename = os.path.join(output_dir, "all_markers_description.txt")
    
    with open(composite_filename, 'w') as f:
        f.write("ArUco Marker Set Description\n")
        f.write("=" * 50 + "\n\n")
        
        for marker in markers:
            f.write(f"Marker {marker['id']} ({marker['position']}): {marker['name']}\n")
            f.write(f"Description: {marker['description']}\n")
            f.write(f"Pattern: {marker['pattern']}\n")
            f.write("\n")
        
        f.write("Placement Guide:\n")
        f.write("-" * 20 + "\n")
        f.write("1. Print all 4 marker files\n")
        f.write("2. Place markers on dartboard corners:\n")
        f.write("   - Marker 0 (TL): Top-left corner\n")
        f.write("   - Marker 1 (TR): Top-right corner\n") 
        f.write("   - Marker 2 (BL): Bottom-left corner\n")
        f.write("   - Marker 3 (BR): Bottom-right corner\n")
        f.write("3. Ensure all markers are at the same height and distance\n")
        f.write("4. Test with the detection system\n\n")
        
        f.write("Note: These are text descriptions for development purposes.\n")
        f.write("Replace with actual image markers when OpenCV is available.\n")
    
    print(f"Created: {composite_filename}")
    
    # Create a simple placement guide
    guide_filename = os.path.join(output_dir, "placement_guide.txt")
    
    with open(guide_filename, 'w') as f:
        f.write("DARTBOARD MARKER PLACEMENT GUIDE\n")
        f.write("=" * 40 + "\n\n")
        
        f.write("Overview:\n")
        f.write("This guide explains how to place markers on your dartboard\n")
        f.write("for computer vision detection and calibration.\n\n")
        
        f.write("Required Materials:\n")
        f.write("- 4 ArUco markers (or placeholder descriptions)\n")
        f.write("- Dartboard with clear corner access\n")
        f.write("- Tape or adhesive for marker placement\n")
        f.write("- Measuring tape for consistent positioning\n\n")
        
        f.write("Placement Instructions:\n")
        f.write("1. Prepare your dartboard - ensure it's mounted securely\n")
        f.write("2. Measure 2-3 inches from each corner of the dartboard\n")
        f.write("3. Place markers according to the following scheme:\n\n")
        
        f.write("   TOP-LEFT (Marker 0):\n")
        f.write("   - Position: Upper-left corner area\n")
        f.write("   - Distance: 2 inches from top and left edges\n")
        f.write("   - Orientation: Upright, readable from front\n\n")
        
        f.write("   TOP-RIGHT (Marker 1):\n")
        f.write("   - Position: Upper-right corner area\n")
        f.write("   - Distance: 2 inches from top and right edges\n")
        f.write("   - Orientation: Upright, readable from front\n\n")
        
        f.write("   BOTTOM-LEFT (Marker 2):\n")
        f.write("   - Position: Lower-left corner area\n")
        f.write("   - Distance: 2 inches from bottom and left edges\n")
        f.write("   - Orientation: Upright, readable from front\n\n")
        
        f.write("   BOTTOM-RIGHT (Marker 3):\n")
        f.write("   - Position: Lower-right corner area\n")
        f.write("   - Distance: 2 inches from bottom and right edges\n")
        f.write("   - Orientation: Upright, readable from front\n\n")
        
        f.write("Testing:\n")
        f.write("1. Use the detection system to verify marker visibility\n")
        f.write("2. Check that all 4 markers are detected consistently\n")
        f.write("3. Adjust lighting if detection is unreliable\n")
        f.write("4. Test different camera angles for optimal results\n\n")
        
        f.write("Troubleshooting:\n")
        f.write("- Markers not detected: Check lighting and camera angle\n")
        f.write("- Inconsistent detection: Ensure markers are flat and secure\n")
        f.write("- Poor calibration: Verify marker positions and distances\n")
    
    print(f"Created: {guide_filename}")
    
    print("\n✅ Text-based marker creation completed successfully!")
    print("📁 Marker files are ready for development and testing.")

if __name__ == "__main__":
    try:
        create_text_markers()
    except Exception as e:
        print(f"❌ Error creating text markers: {e}")
        sys.exit(1)