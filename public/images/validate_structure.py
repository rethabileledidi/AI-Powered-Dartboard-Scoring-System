#!/usr/bin/env python3
"""
Image Structure Validation Script

This script validates the image directory structure and checks for
required files and proper organization.

Usage:
    python validate_structure.py
"""

import os
import sys
from pathlib import Path

def validate_image_structure():
    """Validate the image directory structure."""
    
    base_dir = Path(__file__).parent
    required_dirs = [
        "aruco",
        "dartboards", 
        "samples",
        "markers"
    ]
    
    print("🔍 Validating image directory structure...")
    print(f"Base directory: {base_dir}")
    
    # Check if base directory exists
    if not base_dir.exists():
        print(f"❌ Base directory does not exist: {base_dir}")
        return False
    
    # Check required directories
    all_valid = True
    for dir_name in required_dirs:
        dir_path = base_dir / dir_name
        if not dir_path.exists():
            print(f"❌ Missing required directory: {dir_name}")
            all_valid = False
        else:
            print(f"✅ Directory exists: {dir_name}")
    
    # Check for README file
    readme_path = base_dir / "README.md"
    if readme_path.exists():
        print(f"✅ README.md found")
    else:
        print(f"⚠️  README.md not found (recommended)")
    
    # Check for placeholder files
    placeholder_files = [
        "aruco/.gitkeep",
        "dartboards/.gitkeep", 
        "samples/.gitkeep",
        "markers/.gitkeep"
    ]
    
    for placeholder in placeholder_files:
        placeholder_path = base_dir / placeholder
        if placeholder_path.exists():
            print(f"✅ Placeholder file: {placeholder}")
        else:
            print(f"⚠️  Placeholder file missing: {placeholder}")
    
    # Check for generated files
    generated_files = [
        "dartboards/dartboard_placeholder.svg",
        "samples/dart_position_sample.svg",
        "markers/generate_aruco_markers.py"
    ]
    
    for gen_file in generated_files:
        gen_path = base_dir / gen_file
        if gen_path.exists():
            print(f"✅ Generated file: {gen_file}")
        else:
            print(f"⚠️  Generated file missing: {gen_file}")
    
    # Check image file extensions
    print("\n📊 Image file analysis:")
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'}
    image_count = 0
    
    for dir_name in required_dirs:
        dir_path = base_dir / dir_name
        if dir_path.exists():
            dir_images = []
            for file_path in dir_path.iterdir():
                if file_path.is_file() and file_path.suffix.lower() in image_extensions:
                    dir_images.append(file_path.name)
            
            print(f"  {dir_name}: {len(dir_images)} image files")
            image_count += len(dir_images)
            
            if dir_images:
                print(f"    Files: {', '.join(dir_images[:3])}")
                if len(dir_images) > 3:
                    print(f"    ... and {len(dir_images) - 3} more")
    
    print(f"\n📈 Total image files: {image_count}")
    
    # Check for ArUco markers specifically
    markers_dir = base_dir / "markers"
    if markers_dir.exists():
        aruco_markers = []
        for file_path in markers_dir.iterdir():
            if file_path.is_file() and "aruco" in file_path.name.lower():
                aruco_markers.append(file_path.name)
        
        print(f"🎯 ArUco markers found: {len(aruco_markers)}")
        if aruco_markers:
            print(f"   Markers: {', '.join(aruco_markers)}")
    
    print("\n" + "="*50)
    if all_valid:
        print("✅ Image structure validation completed successfully!")
        print("📁 Directory structure is properly organized.")
    else:
        print("❌ Image structure validation failed!")
        print("🔧 Please create missing directories and files.")
    
    return all_valid

def generate_structure_report():
    """Generate a detailed structure report."""
    
    base_dir = Path(__file__).parent
    report = []
    
    report.append("📋 IMAGE DIRECTORY STRUCTURE REPORT")
    report.append("=" * 50)
    report.append(f"Base Path: {base_dir}")
    report.append(f"Generated: {os.path.getmtime(base_dir)}")
    report.append("")
    
    required_dirs = ["aruco", "dartboards", "samples", "markers"]
    
    for dir_name in required_dirs:
        dir_path = base_dir / dir_name
        report.append(f"📁 {dir_name.upper()}")
        report.append("-" * 30)
        
        if dir_path.exists():
            files = list(dir_path.iterdir())
            report.append(f"  Status: ✅ Exists")
            report.append(f"  Files: {len(files)}")
            
            for file_path in files:
                if file_path.is_file():
                    size = file_path.stat().st_size
                    report.append(f"    📄 {file_path.name} ({size} bytes)")
                elif file_path.is_dir():
                    report.append(f"    📁 {file_path.name}/")
        else:
            report.append(f"  Status: ❌ Missing")
        
        report.append("")
    
    return "\n".join(report)

if __name__ == "__main__":
    try:
        # Validate structure
        is_valid = validate_image_structure()
        
        # Generate and save report
        report = generate_structure_report()
        
        # Save report to file
        report_path = Path(__file__).parent / "structure_report.txt"
        with open(report_path, 'w') as f:
            f.write(report)
        
        print(f"📄 Structure report saved to: {report_path}")
        
        # Exit with appropriate code
        sys.exit(0 if is_valid else 1)
        
    except Exception as e:
        print(f"❌ Error during validation: {e}")
        sys.exit(1)