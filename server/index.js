require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const User = require('./models/User')

const app = express()
app.set('trust proxy', 1) // when behind nginx or another proxy
app.use(express.json())

// Configure CORS. Set CORS_ORIGIN to a comma-separated list of allowed origins
// e.g. CORS_ORIGIN="https://example.com,http://localhost:5173"
const allowedOriginsEnv = process.env.CORS_ORIGIN || ''
const allowedOrigins = allowedOriginsEnv.split(',').map(s => s.trim()).filter(Boolean)
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like curl, server-to-server)
    if (!origin) return callback(null, true)
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400
}
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
console.log('CORS allowed origins:', allowedOrigins.length ? allowedOrigins : 'all')

const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/tusk'
const JWT_SECRET = process.env.JWT_SECRET || 'please_change_me'

mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error', err))

// Ensure parked_names collection exists. This collection controls usernames that may not be registered.
async function ensureParkedNamesCollection() {
  try {
    const db = mongoose.connection.db
    if (!db) return
    const coll = await db.listCollections({ name: 'parked_names' }).next()
    if (!coll) {
      await db.createCollection('parked_names')
      // create a unique index on name so entries are unique (case-sensitive index; we'll match case-insensitively when checking)
      try {
        await db.collection('parked_names').createIndex({ name: 1 }, { unique: true })
      } catch (e) {
        // ignore index creation errors
      }
      console.log('Created parked_names collection')
    }
  } catch (err) {
    console.error('Error ensuring parked_names collection', err)
  }
}

// Run once after connection established
mongoose.connection.once('open', () => {
  ensureParkedNamesCollection()
})

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

// Redirect from / to https://tusk.proplayer919.dev
app.get('/', (req, res) => {
  res.redirect('https://tusk.proplayer919.dev')
})

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ message: 'username and password required' })

    // Validate username server-side: 3-20 chars, alphanumeric, underscores and dashes
    const usernamePattern = /^[A-Za-z0-9_-]{3,20}$/
    if (!usernamePattern.test(username)) return res.status(400).json({ message: 'invalid username: must be 3-20 characters and contain only letters, numbers, underscores or dashes' })
    // Check parked names (case-insensitive exact match)
    try {
      const db = mongoose.connection.db
      if (db) {
        // escape user input for regex
        const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const parked = await db.collection('parked_names').findOne({ name: { $regex: `^${escapeRegExp(username)}$`, $options: 'i' } })
        if (parked) return res.status(409).json({ message: 'username is reserved/unavailable' })
      }
    } catch (err) {
      // If parked check fails for some reason, log but continue to avoid blocking registrations.
      console.error('parked names check failed', err)
    }

    const existing = await User.findOne({ username })
    if (existing) return res.status(409).json({ message: 'username already exists' })

    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)

    const user = new User({ username, passwordHash: hash, progress: {} })
    await user.save()

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token, user: { id: user._id, username: user.username, progress: user.progress, staff: !!user.staff } })
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
    res.json({ token, user: { id: user._id, username: user.username, progress: user.progress, staff: !!user.staff } })
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
    res.json({ id: user._id, username: user.username, progress: user.progress, staff: !!user.staff })
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
