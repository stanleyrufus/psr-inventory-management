// /backend/routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../knex');

// Middleware to verify token
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Invalid token format' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid or expired token' });
    req.user = decoded;
    next();
  });
}

// Middleware to allow only admin
function verifyAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden: insufficient role' });
  next();
}

// Register a new user
router.post('/register', verifyToken, verifyAdmin, async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password || !role) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [user] = await db('users')
      .insert({ username, email, password: hashedPassword, role })
      .returning(['id', 'username', 'email', 'role']);
    res.json({ message: 'User registered', user });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

  try {
    const user = await db('users').where({ username }).first();
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Login error', error: error.message });
  }
});

// Get all users (admin only)
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const users = await db('users').select('id', 'username', 'email', 'role');
    res.json({ message: 'Users list', users });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// Update user (admin only)
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { username, email, role, password } = req.body;

  try {
    const updateData = { username, email, role };
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const [user] = await db('users').where({ id }).update(updateData).returning(['id', 'username', 'email', 'role']);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User updated', user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});

// Delete user (admin only)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await db('users').where({ id }).del();
    if (!deleted) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
});

module.exports = router;
