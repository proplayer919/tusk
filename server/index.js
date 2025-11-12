require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
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
    // Ensure every existing user has a uuid. If missing, generate one and save.
    ; (async () => {
      try {
        const users = await User.find({ $or: [{ uuid: { $exists: false } }, { uuid: null }] })
        if (!users || users.length === 0) return
        console.log(`Assigning uuids to ${users.length} users without uuid`)
        for (const u of users) {
          // generate and assign, retry if collision
          let assigned = false
          for (let i = 0; i < 5 && !assigned; i++) {
            const candidate = crypto.randomUUID()
            try {
              u.uuid = candidate
              await u.save()
              assigned = true
            } catch (err) {
              // If duplicate key error, try again
              if (err && err.code === 11000) continue
              console.error('Error assigning uuid to user', u._id, err)
              break
            }
          }
          if (!assigned) console.error('Failed to assign uuid to user', u._id)
        }
      } catch (err) {
        console.error('Failed to assign uuids to existing users', err)
      }
    })()
})

async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ message: 'Missing auth' })
  const parts = auth.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ message: 'Invalid auth' })
  const token = parts[1]
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    // New tokens put the user's uuid in payload.id
    const id = payload.id
    if (!id) return res.status(401).json({ message: 'Invalid token payload' })

    // Try to find user by uuid first
    let user = await User.findOne({ uuid: id })
    if (!user) {
      // Fallback: token may contain legacy Mongo _id. Try that.
      // Accept both 24-hex ObjectId strings and ObjectId objects.
      const isObjectId = typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)
      if (isObjectId) {
        user = await User.findById(id)
        // If found but missing uuid, assign one now
        if (user && (!user.uuid || user.uuid === null)) {
          user.uuid = crypto.randomUUID()
          try {
            await user.save()
          } catch (err) {
            if (err && err.code === 11000) {
              // collision extremely unlikely; ignore and continue without saving
              console.error('UUID collision when assigning to existing user', user._id)
            } else {
              console.error('Error saving uuid for user', user._id, err)
            }
          }
        }
      }
    }

    if (!user) return res.status(401).json({ message: 'Invalid token (user not found)' })

    // Attach both identifiers and the full user document for downstream handlers
    req.userId = user._id
    req.userUuid = user.uuid
    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

// Middleware to require staff flag on the authenticated user
async function staffOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Missing user' })
  if (!req.user.staff) return res.status(403).json({ message: 'staff only' })
  next()
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

    // Use uuid as the primary identifier in the token and client-facing id
    const token = jwt.sign({ id: user.uuid }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token, user: { id: user.uuid, username: user.username, progress: user.progress, staff: !!user.staff, lockReason: user.lockReason || null, lockUntil: user.lockUntil || null, lockedAt: user.lockedAt || null } })
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

    // Ensure user has uuid (in case of very old accounts)
    if (!user.uuid) {
      user.uuid = crypto.randomUUID()
      try { await user.save() } catch (e) { /* ignore save errors like collisions */ }
    }

    const token = jwt.sign({ id: user.uuid }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token, user: { id: user.uuid, username: user.username, progress: user.progress, staff: !!user.staff, lockReason: user.lockReason || null, lockUntil: user.lockUntil || null, lockedAt: user.lockedAt || null } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'server error' })
  }
})

// Get current user
app.get('/api/user', authMiddleware, async (req, res) => {
  try {
    // authMiddleware attached req.userId (mongo _id) and req.userUuid
    const user = await User.findById(req.userId)
    if (!user) return res.status(404).json({ message: 'not found' })
    res.json({ id: user.uuid, username: user.username, progress: user.progress, staff: !!user.staff, lockReason: user.lockReason || null, lockUntil: user.lockUntil || null, lockedAt: user.lockedAt || null })
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
    // Check the user's lock status before accepting progress updates
    const user = await User.findById(req.userId)
    if (!user) return res.status(404).json({ message: 'not found' })

    const isLocked = (user.lockUntil !== null) && (user.lockUntil === -1 || (typeof user.lockUntil === 'number' && user.lockUntil > Date.now()))
    if (isLocked) return res.status(403).json({ message: 'account locked' })

    const { progress } = req.body
    await User.findByIdAndUpdate(req.userId, { progress }, { new: true })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'server error' })
  }
})

// --- Staff endpoints: view/search/edit users ---
// List users with optional search query (q) that matches username or uuid. Paginated.
app.get('/api/staff/users', authMiddleware, staffOnly, async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim()
    const page = Math.max(1, parseInt((req.query.page || '1').toString(), 10) || 1)
    const limit = Math.min(200, Math.max(10, parseInt((req.query.limit || '50').toString(), 10) || 50))
    const filter = {}
    if (q) {
      // case-insensitive contains on username, or exact uuid match
      filter.$or = [
        { username: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        { uuid: q }
      ]
    }

    const skip = (page - 1) * limit
    const total = await User.countDocuments(filter)
    const users = await User.find(filter).sort({ username: 1 }).skip(skip).limit(limit).lean()
    // Return safe fields only
    const safe = users.map(u => ({ id: u.uuid, username: u.username, progress: u.progress || {}, staff: !!u.staff, createdAt: u.createdAt, updatedAt: u.updatedAt }))
    res.json({ total, page, limit, users: safe })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'server error' })
  }
})

// Get single user by uuid
app.get('/api/staff/user/:id', authMiddleware, staffOnly, async (req, res) => {
  try {
    const id = req.params.id
    const user = await User.findOne({ uuid: id }).lean()
    if (!user) return res.status(404).json({ message: 'not found' })
    const safe = { id: user.uuid, username: user.username, progress: user.progress || {}, staff: !!user.staff, createdAt: user.createdAt, updatedAt: user.updatedAt, lockReason: user.lockReason || null, lockUntil: user.lockUntil || null, lockedAt: user.lockedAt || null }
    res.json(safe)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'server error' })
  }
})

// Update user fields (username, progress, staff)
app.put('/api/staff/user/:id', authMiddleware, staffOnly, async (req, res) => {
  try {
    const id = req.params.id
    const { username, progress, staff } = req.body
    const update = {}
    if (typeof username === 'string') update.username = username
    if (typeof progress !== 'undefined') update.progress = progress
    if (typeof staff !== 'undefined') update.staff = !!staff

    // Support lock fields: lockReason (string|null), lockUntil (number|null|-1)
    if (Object.prototype.hasOwnProperty.call(req.body, 'lockReason')) {
      update.lockReason = req.body.lockReason === null ? null : String(req.body.lockReason)
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'lockUntil')) {
      // Accept null, -1 (permanent), or a number (epoch ms)
      const val = req.body.lockUntil
      if (val === null) update.lockUntil = null
      else if (typeof val === 'number') update.lockUntil = val
      else if (typeof val === 'string' && val.trim() !== '') {
        const parsed = Number(val)
        if (!Number.isNaN(parsed)) update.lockUntil = parsed
      }
      // If being unlocked (lockUntil === null), clear lockedAt and lockReason handled above
    }

    // If updating username, validate pattern
    if (update.username) {
      const usernamePattern = /^[A-Za-z0-9_-]{3,20}$/
      if (!usernamePattern.test(update.username)) return res.status(400).json({ message: 'invalid username' })
      const existing = await User.findOne({ username: update.username })
      if (existing && existing.uuid !== id) return res.status(409).json({ message: 'username already exists' })
    }

    // If setting a lock (lockUntil present and not null) and lockedAt not already set, set lockedAt to now
    let user = await User.findOne({ uuid: id })
    if (!user) return res.status(404).json({ message: 'not found' })

    // Apply updates carefully so we can set lockedAt when a lock is applied
    if (Object.prototype.hasOwnProperty.call(update, 'lockUntil')) {
      const newLockUntil = update.lockUntil
      if (newLockUntil !== null && (!user.lockUntil || user.lockUntil === null)) {
        // newly locking: set lockedAt
        user.lockedAt = new Date()
      }
      if (newLockUntil === null) {
        user.lockedAt = null
        user.lockReason = null
      }
      user.lockUntil = newLockUntil
    }
    if (Object.prototype.hasOwnProperty.call(update, 'lockReason')) {
      user.lockReason = update.lockReason
    }
    if (Object.prototype.hasOwnProperty.call(update, 'username')) user.username = update.username
    if (Object.prototype.hasOwnProperty.call(update, 'progress')) user.progress = update.progress
    if (Object.prototype.hasOwnProperty.call(update, 'staff')) user.staff = update.staff

    user = await user.save()
    if (!user) return res.status(404).json({ message: 'not found' })
    const safe = { id: user.uuid, username: user.username, progress: user.progress || {}, staff: !!user.staff, createdAt: user.createdAt, updatedAt: user.updatedAt, lockReason: user.lockReason || null, lockUntil: user.lockUntil || null, lockedAt: user.lockedAt || null }
    res.json(safe)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'server error' })
  }
})

// Reset user to defaults (clears progress and non-required flags)
app.post('/api/staff/user/:id/reset', authMiddleware, staffOnly, async (req, res) => {
  try {
    const id = req.params.id
    const defaults = { progress: {} }
    const user = await User.findOneAndUpdate({ uuid: id }, defaults, { new: true }).lean()
    if (!user) return res.status(404).json({ message: 'not found' })
    const safe = { id: user.uuid, username: user.username, progress: user.progress || {}, staff: !!user.staff, createdAt: user.createdAt, updatedAt: user.updatedAt }
    res.json(safe)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'server error' })
  }
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log('Server listening on', PORT))
