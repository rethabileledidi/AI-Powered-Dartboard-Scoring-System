# AI Dart Scorer

An AI-powered dart scoring system with offline leaderboard functionality. This project provides a complete scaffold for training AI models to detect dart positions and track scores with a local leaderboard system.

## 🎯 Project Overview

This project includes:
- **AI Model Training Structure**: Organized folders for training, validation, and testing data
- **Offline Leaderboard**: Local Node.js/Express API with persistent JSON storage
- **Web Interface**: Clean, responsive HTML interface for score tracking and leaderboard display
- **No Cloud Dependencies**: Everything runs locally on your machine

## 📁 Project Structure

```
ai-model/
├── config/
│   ├── data.yaml          # AI model training configuration
│   └── game.json          # Game identification (ID + name)
├── data/
│   └── leaderboard.json   # Local leaderboard storage (auto-created)
├── test/
│   ├── images/            # Test images (add your .jpg/.png files here)
│   └── labels/            # Test labels (add YOLO .txt files here)
├── train/
│   ├── images/            # Training images (add your .jpg/.png files here)
│   └── labels/            # Training labels (add YOLO .txt files here)
├── valid/
│   ├── images/            # Validation images (add your .jpg/.png files here)
│   └── labels/            # Validation labels (add YOLO .txt files here)
├── weights/               # Model weights (add your .pt/.weights files here)
├── web/
│   └── index.html         # Web interface for leaderboard
├── server.js              # Node.js/Express backend API
├── package.json           # Project dependencies and scripts
└── README.md              # This file
```

## 🚀 Quick Start (VS Code)

### Prerequisites
- **Node.js** (version 18.0 or higher)
- **VS Code** (recommended for development)

### Step 1: Open Project in VS Code
```bash
# Navigate to project directory
cd ai-model

# Open in VS Code
code .
```

### Step 2: Install Dependencies
In VS Code, open the integrated terminal (`Ctrl+`` or `View > Terminal`) and run:

```bash
npm install
```

### Step 3: Start the Server
```bash
npm start
```

### Step 4: Access the Web Interface
Open your browser and navigate to:
```
http://localhost:3000
```

## 📊 Adding Training Data

### Images
Add your dartboard images to the appropriate folders:
- **Training images**: `train/images/`
- **Validation images**: `valid/images/`
- **Test images**: `test/images/`

Supported formats: `.jpg`, `.jpeg`, `.png`, `.bmp`

### Labels
Create corresponding YOLO format label files:
- **Training labels**: `train/labels/`
- **Validation labels**: `valid/labels/`
- **Test labels**: `test/labels/`

#### YOLO Label Format
Each label file should have the same name as its corresponding image (with `.txt` extension) and contain one line per detected object:

```
class_id x_center y_center width height
```

Where:
- `class_id`: Integer class index (0, 1, 2, etc.)
- `x_center`, `y_center`: Normalized center coordinates (0-1)
- `width`, `height`: Normalized dimensions (0-1)

**Example label file** (`dart_001.txt`):
```
0 0.5 0.5 0.1 0.1
1 0.3 0.7 0.08 0.08
```

### Model Weights
Add your trained model weights to:
```
weights/
```

Supported formats: `.pt`, `.weights`, `.onnx`

## ⚙️ Configuration

### AI Model Configuration (`config/data.yaml`)
```yaml
train: ../train/images    # Path to training images
val: ../valid/images      # Path to validation images  
test: ../test/images      # Path to test images
nc: 3                     # Number of classes
names: ['bullseye', 'inner_ring', 'outer_ring']  # Class names
```

### Game Configuration (`config/game.json`)
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "gameName": "AI Dart Scorer"
}
```

## 🔌 API Endpoints

The server provides the following REST API endpoints:

### GET `/api/game`
Returns game information:
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "gameName": "AI Dart Scorer"
}
```

### POST `/api/score`
Add a new score to the leaderboard:
```json
{
  "player": "Thabo Mokoena",
  "score": 95.5
}
```

Response:
```json
{
  "entryId": "new-uuid-here",
  "player": "Thabo Mokoena",
  "score": 95.5,
  "timestamp": "2025-06-17T10:30:00.000Z",
  "gameId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### GET `/api/leaderboard`
Get top scores (default: 10, max: 100):
```
GET /api/leaderboard?limit=5
```

Response:
```json
[
  {
    "entryId": "uuid-1",
    "player": "Naledi Khumalo",
    "score": 98.5,
    "timestamp": "2025-06-17T10:25:00.000Z",
    "gameId": "550e8400-e29b-41d4-a716-446655440000"
  },
  {
    "entryId": "uuid-2", 
    "player": "Sipho Nkosi",
    "score": 92.0,
    "timestamp": "2025-06-17T10:20:00.000Z",
    "gameId": "550e8400-e29b-41d4-a716-446655440000"
  }
]
```

## 🎮 Using the Web Interface

1. **Add Scores**: Use the form to enter player names and scores
2. **View Leaderboard**: See top scores ranked automatically
3. **Real-time Updates**: Leaderboard refreshes every 30 seconds
4. **Responsive Design**: Works on desktop and mobile devices

### Features
- **Player Name Validation**: Names limited to 50 characters
- **Score Validation**: Only non-negative numbers accepted
- **Automatic Sorting**: Scores ranked from highest to lowest
- **Visual Feedback**: Success/error messages for all operations
- **Mobile Friendly**: Responsive design for all screen sizes

## 🛠️ Development

### Adding New Features
The project structure is modular:
- **Backend Logic**: `server.js`
- **Frontend**: `web/index.html` 
- **Configuration**: `config/` directory
- **Data**: `data/` directory (auto-created)

### Customizing Classes
Edit `config/data.yaml` to modify:
- Number of classes (`nc`)
- Class names (`names` array)

### Training Your Model
This scaffold provides the data structure. Use your preferred AI training framework (YOLO, TensorFlow, PyTorch) with the organized data folders.

## 🔧 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Kill process on port 3000 (Linux/Mac)
lsof -ti:3000 | xargs kill -9

# Or change port in server.js (line 8)
const PORT = 3001;
```

**Permission Errors**
```bash
# Ensure write permissions to data directory
chmod 755 data/
```

**Node.js Version Issues**
```bash
# Check Node.js version
node --version

# Should be 18.0 or higher
```

### VS Code Tips
- Use the integrated terminal for commands
- Install the "Live Server" extension for better HTML preview
- Use "Path Intellisense" for better file navigation
- Install "ESLint" for code quality checking

## 📋 File Creation Checklist

✅ **Created Files:**
- `ai-model/config/data.yaml` - AI model configuration
- `ai-model/config/game.json` - Game identification
- `ai-model/server.js` - Node.js/Express backend
- `ai-model/package.json` - Project dependencies
- `ai-model/web/index.html` - Web interface
- `ai-model/README.md` - This documentation
- `.gitkeep` files in all empty folders

✅ **Empty Folders Preserved:**
- `test/images/`
- `test/labels/`
- `train/images/`
- `train/labels/`
- `valid/images/`
- `valid/labels/`
- `weights/`

✅ **No Docker/Cloud Files:**
- No `Dockerfile`
- No `docker-compose.yml`
- No cloud SDK dependencies
- No CI/CD configuration files

✅ **Unique Game ID/Name:**
- Game ID: `550e8400-e29b-41d4-a716-446655440000`
- Game Name: `AI Dart Scorer`

## 📄 License

MIT License - feel free to use this project for your AI dart scoring needs.

## 🤝 Contributing

This is a scaffold project. Add your training data, train your AI model, and customize the scoring logic as needed for your specific dart detection requirements.