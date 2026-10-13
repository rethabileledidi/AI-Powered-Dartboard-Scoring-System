const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('web'));

// Data file path
const LEADERBOARD_FILE = path.join(__dirname, 'data', 'leaderboard.json');
const GAME_CONFIG_FILE = path.join(__dirname, 'game.json');

// Ensure data directory exists
const ensureDataDir = async () => {
  const dataDir = path.dirname(LEADERBOARD_FILE);
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
};

// Initialize leaderboard file if it doesn't exist
const initLeaderboard = async () => {
  await ensureDataDir();
  try {
    await fs.access(LEADERBOARD_FILE);
  } catch (error) {
    // File doesn't exist, create empty leaderboard
    await fs.writeFile(LEADERBOARD_FILE, JSON.stringify([]));
  }
};

// Helper function to generate UUID v4
function generateUUID() {
  return crypto.randomUUID();
}

// Helper function to read leaderboard data
const readLeaderboard = async () => {
  try {
    const data = await fs.readFile(LEADERBOARD_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading leaderboard:', error);
    return [];
  }
};

// Helper function to write leaderboard data
const writeLeaderboard = async (data) => {
  try {
    await fs.writeFile(LEADERBOARD_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing leaderboard:', error);
    throw error;
  }
};

// API Routes

// GET /api/game - Returns game info
app.get('/api/game', async (req, res) => {
  try {
    const gameConfig = await fs.readFile(GAME_CONFIG_FILE, 'utf8');
    const gameData = JSON.parse(gameConfig);
    res.json({
      gameId: gameData.gameId,
      gameName: gameData.gameName
    });
  } catch (error) {
    console.error('Error reading game config:', error);
    res.status(500).json({ error: 'Failed to read game configuration' });
  }
});

// POST /api/score - Add a new score
app.post('/api/score', async (req, res) => {
  try {
    const { player, score } = req.body;
    
    // Validation
    if (!player || typeof player !== 'string' || player.trim().length === 0) {
      return res.status(400).json({ error: 'Player name is required and must be a non-empty string' });
    }
    
    if (typeof score !== 'number' || isNaN(score) || score < 0) {
      return res.status(400).json({ error: 'Score must be a valid non-negative number' });
    }
    
    // Trim player name and limit length
    const trimmedPlayer = player.trim().substring(0, 50);
    
    // Read current leaderboard
    const leaderboard = await readLeaderboard();
    
    // Create new entry
    const newEntry = {
      entryId: generateUUID(),
      player: trimmedPlayer,
      score: Math.round(score * 100) / 100, // Round to 2 decimal places
      timestamp: new Date().toISOString(),
      gameId: (JSON.parse(await fs.readFile(GAME_CONFIG_FILE, 'utf8'))).gameId
    };
    
    // Add to leaderboard
    leaderboard.push(newEntry);
    
    // Write back to file
    await writeLeaderboard(leaderboard);
    
    res.status(201).json(newEntry);
  } catch (error) {
    console.error('Error adding score:', error);
    res.status(500).json({ error: 'Failed to add score' });
  }
});

// GET /api/leaderboard - Get top scores
app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    if (limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'Limit must be between 1 and 100' });
    }
    
    const leaderboard = await readLeaderboard();
    
    // Sort by score (descending) and limit results
    const sortedLeaderboard = leaderboard
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    res.json(sortedLeaderboard);
  } catch (error) {
    console.error('Error reading leaderboard:', error);
    res.status(500).json({ error: 'Failed to read leaderboard' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Initialize and start server
const startServer = async () => {
  await initLeaderboard();
  
  app.listen(PORT, () => {
    console.log(`AI Dart Scorer server running on http://localhost:${PORT}`);
    console.log(`Game: AI Dart Scorer`);
    console.log(`API endpoints:`);
    console.log(`  GET  /api/game - Get game info`);
    console.log(`  POST /api/score - Add score`);
    console.log(`  GET  /api/leaderboard - Get leaderboard`);
    console.log(`Web interface: http://localhost:${PORT}`);
  });
};

startServer().catch(console.error);