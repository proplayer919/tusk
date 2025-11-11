const mongoose = require('mongoose')

// Username: 3-20 characters, letters, numbers, underscores and dashes only
const usernameRegex = /^[A-Za-z0-9_-]{3,20}$/

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, minlength: 3, maxlength: 20, match: [usernameRegex, 'invalid username'] },
  passwordHash: { type: String, required: true },
  progress: { type: Object, default: {} }
}, { timestamps: true })

module.exports = mongoose.model('User', UserSchema)
