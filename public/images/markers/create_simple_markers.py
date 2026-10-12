#!/usr/bin/env python3
"""
Simple ArUco Marker Placeholder Generator

This script creates simple placeholder marker images for development
and testing purposes. These are basic geometric patterns that can be
used until proper ArUco markers are generated with OpenCV.

Usage:
    python create_simple_markers.py
"""

import os
from PIL import Image, ImageDraw, ImageFont
import sys

def create_simple_marker(marker_id, size=200):
    """Create a simple geometric marker pattern."""
    
    # Create image with white background
    img = Image.new('RGB', (size, size), color='white')
    draw = ImageDraw.Draw(img)
    
    # Draw border
    border_width = size // 10
    draw.rectangle([0, 0, size-1, size-1], outline='black', width=2)
    draw.rectangle([border_width, border_width, size-border_width-1, size-border_width-1], 
                   outline='black', width=2)
    
    # Create unique pattern based on marker_id
    patterns = [
        # Marker 0: Cross pattern
        lambda d, s: [
            d.line([s//2, border_width, s//2, s-border_width], fill='black', width=3),
            d.line([border_width, s//2, s-border_width, s//2], fill='black', width=3)
        ],
        # Marker 1: Diagonal pattern
        lambda d, s: [
            d.line([border_width, border_width, s-border_width, s-border_width], fill='black', width=3),
            d.line([s-border_width, border_width, border_width, s-border_width], fill='black', width=3)
        ],
        # Marker 2: Square pattern
        lambda d, s: [
            d.rectangle([s//3, s//3, 2*s//3, 2*s//3], outline='black', width=3),
            d.rectangle([s//4, s//4, 3*s//4, 3*s//4], outline='black', width=2)
        ],
        # Marker 3: Circle pattern
        lambda d, s: [
            d.ellipse([s//3, s//3, 2*s//3, 2*s//3], outline='black', width=3),
            d.ellipse([s//4, s//4, 3*s//4, 3*s//4], outline='black', width=2)
        ]
    ]
    
    # Apply pattern
    if marker_id < len(patterns):
        patterns[marker_id](draw, size)
    
    # Add marker ID text
    try:
        font = ImageFont.load_default()
        text = f"M{marker_id}"
        text_bbox = draw.textbbox((0, 0), text, font=font)
        text_width = text_bbox[2] - text_bbox[0]
        text_height = text_bbox[3] - text_bbox[1]
        
        text_x = (size - text_width) // 2
        text_y = (size - text_height) // 2
        
        draw.text((text_x, text_y), text, fill='black', font=font)
    except:
        # Fallback: simple text
        draw.text((size//2 - 10, size//2 - 10), f"M{marker_id}", fill='black')
    
    return img

def create_markers():
    """Create marker images for IDs 0-3."""
    
    output_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"Creating simple markers in: {output_dir}")
    
    # Create markers
    for marker_id in range(4):
        # Create regular size marker
        img = create_simple_marker(marker_id, 200)
        filename = os.path.join(output_dir, f"simple_marker_{marker_id}.png")
        img.save(filename)
        print(f"Created: {filename}")
        
        # Create large size marker
        large_img = create_simple_marker(marker_id, 400)
        large_filename = os.path.join(output_dir, f"simple_marker_{marker_id}_large.png")
        large_img.save(large_filename)
        print(f"Created: {large_filename}")
    
    # Create composite image
    create_composite_image(output_dir)
    
    print("Simple marker creation complete!")

def create_composite_image(output_dir):
    """Create a composite image with all 4 markers."""
    
    marker_size = 200
    spacing = 20
    composite_size = marker_size * 2 + spacing
    
    # Create composite image
    composite = Image.new('RGB', (composite_size, composite_size), color='white')
    draw = ImageDraw.Draw(composite)
    
    # Positions for 2x2 grid
    positions = [
        (spacing//2, spacing//2),           # Top-left
        (marker_size + spacing//2, spacing//2),  # Top-right
        (spacing//2, marker_size + spacing//2),  # Bottom-left
        (marker_size + spacing//2, marker_size + spacing//2)  # Bottom-right
    ]
    
    # Place markers
    for i, (x, y) in enumerate(positions):
        marker_img = create_simple_marker(i, marker_size)
        composite.paste(marker_img, (x, y))
    
    # Add labels
    try:
        font = ImageFont.load_default()
        labels = ["TL", "TR", "BL", "BR"]
        
        for i, (x, y) in enumerate(positions):
            label = labels[i]
            draw.text((x + 5, y + 5), label, fill='red', font=font)
    except:
        pass
    
    # Save composite
    composite_filename = os.path.join(output_dir, "simple_markers_composite.png")
    composite.save(composite_filename)
    print(f"Created: {composite_filename}")

def create_placement_guide():
    """Create a placement guide image."""
    
    guide_img = Image.new('RGB', (600, 400), color='white')
    draw = ImageDraw.Draw(guide_img)
    
    # Title
    try:
        font = ImageFont.load_default()
        draw.text((20, 20), "Simple Marker Placement Guide", fill='black', font=font)
    except:
        draw.text((20, 20), "Simple Marker Placement Guide", fill='black')
    
    # Instructions
    instructions = [
        "1. Print the simple_marker_*.png files",
        "2. Place markers on dartboard corners:",
        "   - Top-left: Marker 0 (TL)",
        "   - Top-right: Marker 1 (TR)", 
        "   - Bottom-left: Marker 2 (BL)",
        "   - Bottom-right: Marker 3 (BR)",
        "3. Ensure markers are flat and visible",
        "4. Use composite image for reference",
        "",
        "Note: These are placeholder markers.",
        "Replace with proper ArUco markers when available."
    ]
    
    y_offset = 60
    for instruction in instructions:
        try:
            draw.text((30, y_offset), instruction, fill='black', font=font)
        except:
            draw.text((30, y_offset), instruction, fill='black')
        y_offset += 25
    
    # Save guide
    guide_filename = os.path.join(output_dir, "simple_placement_guide.png")
    guide_img.save(guide_filename)
    print(f"Created: {guide_filename}")

if __name__ == "__main__":
    try:
        create_markers()
        create_placement_guide()
        print("\n✅ Simple marker generation completed successfully!")
    except Exception as e:
        print(f"❌ Error creating markers: {e}")
        sys.exit(1)