const mongoose = require('mongoose')
const crypto = require('crypto')

// Username: 3-20 characters, letters, numbers, underscores and dashes only
const usernameRegex = /^[A-Za-z0-9_-]{3,20}$/

const UserSchema = new mongoose.Schema({
  // uuid: stable public identifier for the user. Generated automatically if missing.
  uuid: { type: String, unique: true, default: () => crypto.randomUUID() },
  username: { type: String, required: true, unique: true, minlength: 3, maxlength: 20, match: [usernameRegex, 'invalid username'] },
  passwordHash: { type: String, required: true },
  progress: { type: Object, default: {} },
  // staff flag: when true, indicates the account is a staff member
  staff: { type: Boolean, default: false },
  // account lock fields: lockUntil is epoch ms for expiry, -1 for permanent, or null for not locked
  lockReason: { type: String, default: null },
  lockUntil: { type: Number, default: null },
  lockedAt: { type: Date, default: null }
}, { timestamps: true })


module.exports = mongoose.model('User', UserSchema)
