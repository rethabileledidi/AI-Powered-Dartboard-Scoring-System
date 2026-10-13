#!/usr/bin/env python3
"""
Image Structure Validator for AI Dart Board Scoring System

This script validates that the image directory structure is properly set up
and provides guidance on what images are needed.
"""

import os
import sys
from pathlib import Path

class ImageStructureValidator:
    def __init__(self, project_root=None):
        self.project_root = Path(project_root) if project_root else Path(__file__).parent
        self.images_root = self.project_root / "public" / "images"
        self.required_dirs = [
            "aruco-markers",
            "dartboard-samples", 
            "calibration",
            "detection-examples"
        ]
        self.issues = []
        self.recommendations = []
    
    def check_directory_structure(self):
        """Check if all required directories exist."""
        print("🔍 Checking directory structure...")
        
        if not self.images_root.exists():
            self.issues.append(f"Images root directory does not exist: {self.images_root}")
            self.recommendations.append("Create the images directory structure")
            return False
        
        missing_dirs = []
        for dir_name in self.required_dirs:
            dir_path = self.images_root / dir_name
            if not dir_path.exists():
                missing_dirs.append(dir_name)
                self.issues.append(f"Missing directory: {dir_name}")
        
        if missing_dirs:
            self.recommendations.append(f"Create missing directories: {', '.join(missing_dirs)}")
            return False
        
        print("✅ All required directories exist")
        return True
    
    def check_aruco_markers(self):
        """Check ArUco markers directory."""
        print("\n🎯 Checking ArUco markers...")
        
        aruco_dir = self.images_root / "aruco-markers"
        if not aruco_dir.exists():
            self.issues.append("ArUco markers directory missing")
            return False
        
        files = list(aruco_dir.glob("*.png")) + list(aruco_dir.glob("*.jpg"))
        gitkeep = aruco_dir / ".gitkeep"
        
        if len(files) == 0 and not gitkeep.exists():
            self.issues.append("No ArUco marker images found")
            self.recommendations.append("Generate ArUco markers using: python generate_aruco_markers_to_images.py")
            return False
        elif gitkeep.exists() and len(files) == 0:
            print("📝 ArUco markers directory is ready (empty with .gitkeep)")
            self.recommendations.append("Generate ArUco markers: python generate_aruco_markers_to_images.py")
            return True
        else:
            print(f"✅ Found {len(files)} ArUco marker images")
            for file in files:
                print(f"   - {file.name}")
            return True
    
    def check_dartboard_samples(self):
        """Check dartboard samples directory."""
        print("\n🎯 Checking dartboard samples...")
        
        samples_dir = self.images_root / "dartboard-samples"
        if not samples_dir.exists():
            self.issues.append("Dartboard samples directory missing")
            return False
        
        files = list(samples_dir.glob("*.jpg")) + list(samples_dir.glob("*.png"))
        gitkeep = samples_dir / ".gitkeep"
        
        if len(files) == 0 and not gitkeep.exists():
            self.issues.append("No dartboard sample images found")
            self.recommendations.append("Add dartboard sample images for testing")
            return False
        elif gitkeep.exists() and len(files) == 0:
            print("📝 Dartboard samples directory is ready (empty with .gitkeep)")
            self.recommendations.append("Add dartboard sample images for system testing")
            return True
        else:
            print(f"✅ Found {len(files)} dartboard sample images")
            for file in files:
                print(f"   - {file.name}")
            return True
    
    def check_other_directories(self):
        """Check calibration and detection-examples directories."""
        print("\n🔧 Checking other directories...")
        
        for dir_name in ["calibration", "detection-examples"]:
            dir_path = self.images_root / dir_name
            if not dir_path.exists():
                continue
            
            files = list(dir_path.glob("*"))
            gitkeep = dir_path / ".gitkeep"
            
            if len(files) == 1 and gitkeep.exists():
                print(f"📝 {dir_name} directory is ready (empty with .gitkeep)")
            elif len(files) > 0:
                print(f"✅ {dir_name} directory has {len(files)} files")
            else:
                print(f"⚠️  {dir_name} directory is empty")
    
    def generate_report(self):
        """Generate a comprehensive report."""
        print("\n" + "=" * 60)
        print("📊 IMAGE STRUCTURE VALIDATION REPORT")
        print("=" * 60)
        
        if not self.issues:
            print("✅ No issues found!")
        else:
            print("❌ Issues found:")
            for i, issue in enumerate(self.issues, 1):
                print(f"   {i}. {issue}")
        
        if self.recommendations:
            print("\n💡 Recommendations:")
            for i, rec in enumerate(self.recommendations, 1):
                print(f"   {i}. {rec}")
        
        print(f"\n📁 Images root: {self.images_root}")
        print("🔗 For more information, see: public/images/README.md")
    
    def run_validation(self):
        """Run complete validation."""
        print("🚀 Starting image structure validation...")
        
        self.check_directory_structure()
        self.check_aruco_markers()
        self.check_dartboard_samples()
        self.check_other_directories()
        
        self.generate_report()
        
        return len(self.issues) == 0

def main():
    """Main function."""
    validator = ImageStructureValidator()
    success = validator.run_validation()
    
    if success:
        print("\n🎉 Image structure validation completed successfully!")
        sys.exit(0)
    else:
        print("\n⚠️  Image structure validation completed with issues.")
        sys.exit(1)

if __name__ == "__main__":
    main()