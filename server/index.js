require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const User = require('./models/User')

const app = express()
app.use(cors())
app.use(express.json())

const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/tusk'
const JWT_SECRET = process.env.JWT_SECRET || 'please_change_me'

mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error', err))

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ message: 'Missing auth' })
  const parts = auth.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ message: 'Invalid auth' })
  const token = parts[1]
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.userId = payload.id
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ message: 'username and password required' })

    const existing = await User.findOne({ username })
    if (existing) return res.status(409).json({ message: 'username already exists' })

    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)

    const user = new User({ username, passwordHash: hash, progress: {} })
    await user.save()

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token, user: { id: user._id, username: user.username, progress: user.progress } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'server error' })
  }
})

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ message: 'username and password required' })

    const user = await User.findOne({ username })
    if (!user) return res.status(401).json({ message: 'invalid credentials' })

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ message: 'invalid credentials' })

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token, user: { id: user._id, username: user.username, progress: user.progress } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'server error' })
  }
})

// Get current user
app.get('/api/user', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    if (!user) return res.status(404).json({ message: 'not found' })
    res.json({ id: user._id, username: user.username, progress: user.progress })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'server error' })
  }
})

// Get progress
app.get('/api/progress', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    if (!user) return res.status(404).json({ message: 'not found' })
    res.json({ progress: user.progress || {} })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'server error' })
  }
})

// Save progress
app.post('/api/progress', authMiddleware, async (req, res) => {
  try {
    const { progress } = req.body
    await User.findByIdAndUpdate(req.userId, { progress }, { new: true })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'server error' })
  }
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log('Server listening on', PORT))
