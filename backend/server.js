require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const socketHandler = require('./socketHandler');
const { initDB, updateProfile, getProfile } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Multer setup for avatar uploads
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../frontend/uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// Upload avatar
app.post('/api/upload-avatar', upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Invalid file' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// Get profile
app.get('/api/profile/:username', async (req, res) => {
  try {
    const profile = await getProfile(req.params.username);
    res.json(profile);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update profile
app.post('/api/profile', async (req, res) => {
  try {
    const { username, bio, avatar } = req.body;
    const profile = await updateProfile(username, bio, avatar);
    res.json(profile);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

socketHandler(io);

initDB()
  .then(() => {
    server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to database:', err.message);
    process.exit(1);
  });
