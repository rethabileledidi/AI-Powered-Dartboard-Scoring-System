# Images Directory Structure

This directory contains all images used by the AI-Powered Dart Board Scoring System.

## Directory Structure

```
images/
├── aruco/           # ArUco marked dartboard images for computer vision
├── dartboards/      # Regular dartboard images for reference and UI
├── samples/         # Sample dart position images for testing and training
├── markers/         # ArUco marker templates and patterns
└── README.md        # This file
```

## Directory Descriptions

### 🎯 `aruco/`
**Purpose**: Contains dartboard images with ArUco markers for computer vision calibration and detection.

**Contents**:
- High-resolution images of dartboards with ArUco markers in corners
- Images taken from different angles and lighting conditions
- Calibration images for perspective transformation

**Usage**: These images are used by the OpenCV detection system (`config4.py`) for:
- Perspective correction and calibration
- Marker detection and coordinate system mapping
- Real-time dart position calculation

### 🎯 `dartboards/`
**Purpose**: Contains standard dartboard images for UI display and reference.

**Contents**:
- Clean dartboard images without markers
- Different dartboard types (standard, bristle, electronic)
- UI elements and dartboard graphics

**Usage**: These images are used in the web interface for:
- Display purposes in the UI
- Reference images for manual calibration
- Visual guides for players

### 🎯 `samples/`
**Purpose**: Contains sample images showing dart positions for testing and training.

**Contents**:
- Images of darts in various positions on the board
- Different scoring scenarios (singles, doubles, triples, bullseye)
- Edge cases and difficult detection scenarios

**Usage**: These images are used for:
- Testing the detection algorithm accuracy
- Training machine learning models
- Demonstrating system capabilities

### 🎯 `markers/`
**Purpose**: Contains ArUco marker templates and patterns.

**Contents**:
- Individual ArUco marker patterns
- Marker sets for printing
- Marker configuration files

**Usage**: These markers are used for:
- Printing physical markers for dartboard calibration
- Reference patterns for detection algorithms
- System setup and configuration

## File Naming Convention

Use the following naming convention for consistency:

```
[category]_[description]_[version/angle]_[date].[extension]
```

Examples:
- `aruco_dartboard_frontlight_2024-05-22.jpg`
- `dartboard_standard_bristle_v1.png`
- `samples_triple20_closeup_2024-05-22.jpg`
- `markers_aruco_4x4_50.png`

## Image Requirements

### ArUco Images
- **Resolution**: Minimum 1920x1080 pixels
- **Format**: JPEG or PNG
- **Lighting**: Various lighting conditions for robustness
- **Markers**: Clear, visible ArUco markers in all four corners

### Dartboard Images
- **Resolution**: Minimum 800x800 pixels for UI, higher for detection
- **Format**: PNG with transparency for UI elements
- **Background**: Clean, contrasting background

### Sample Images
- **Resolution**: Minimum 1280x720 pixels
- **Format**: JPEG for real photos
- **Content**: Clear dart positions, various scenarios

### Marker Images
- **Resolution**: Exact pixel dimensions for printing
- **Format**: PNG with sharp edges
- **Size**: Multiple sizes for different use cases

## Integration with System

These image directories are integrated with the following system components:

1. **OpenCV Detection** (`config4.py`): Uses `aruco/` images for calibration
2. **Web Interface** (`src/components/`): Uses `dartboards/` for UI display
3. **Machine Learning**: Uses `samples/` for training and testing
4. **Calibration System**: Uses `markers/` for physical setup

## Adding New Images

When adding new images:

1. Place in the appropriate category directory
2. Follow the naming convention
3. Update relevant documentation
4. Test with the detection system if applicable
5. Commit with descriptive commit messages

## Maintenance

- Regularly clean up unused images
- Compress large images to optimize performance
- Backup important calibration images
- Update documentation when adding new categories

---

*Last updated: May 22, 2025*