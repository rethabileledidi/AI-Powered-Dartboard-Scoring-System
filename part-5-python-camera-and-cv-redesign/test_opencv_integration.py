#!/usr/bin/env python3
"""
Test script to verify OpenCV dart scoring integration
"""

import sys
import os

def test_dependencies():
    """Test if required dependencies are available"""
    try:
        import cv2
        import numpy
        print("✅ OpenCV and NumPy are available")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        return False

def test_file_structure():
    """Test if required files and folders exist"""
    required_files = [
        "config4.py",
        "images/"
    ]
    
    missing_files = []
    for file_path in required_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)
    
    if missing_files:
        print(f"❌ Missing files/folders: {missing_files}")
        return False
    else:
        print("✅ Required files and folders exist")
        return True

def test_images_folder():
    """Test if images folder contains JPG files"""
    import glob
    
    image_files = glob.glob("images/*.jpg")
    if not image_files:
        print("❌ No JPG images found in images/ folder")
        print("   Please add at least one reference image (empty dartboard)")
        return False
    else:
        print(f"✅ Found {len(image_files)} JPG images in images/ folder")
        for img in image_files:
            print(f"   - {img}")
        return True

def main():
    """Run all integration tests"""
    print("🎯 OpenCV Dart Scoring Integration Test")
    print("=" * 50)
    
    tests = [
        ("Dependencies", test_dependencies),
        ("File Structure", test_file_structure),
        ("Images Folder", test_images_folder)
    ]
    
    all_passed = True
    
    for test_name, test_func in tests:
        print(f"\n📋 Testing {test_name}...")
        if not test_func():
            all_passed = False
    
    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 All tests passed! Integration is ready.")
        print("\nNext steps:")
        print("1. Place your dartboard images in the images/ folder")
        print("2. Ensure the first image alphabetically is the empty reference board")
        print("3. Run: python config4.py")
    else:
        print("❌ Some tests failed. Please fix the issues above.")
        sys.exit(1)

if __name__ == "__main__":
    main()