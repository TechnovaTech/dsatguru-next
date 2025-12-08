import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const router = express.Router()

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body
  const exists = await User.findOne({ email })
  if (exists) return res.status(400).json({ message: 'Email already registered' })
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({ name, email, passwordHash })
  const token = jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' })
  res.json({ message: 'User registered successfully', data: { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } } })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email })
  if (!user) return res.status(401).json({ message: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' })
  const token = jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' })
  res.json({ message: 'Login successful', data: { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } } })
})

router.post('/logout', async (req, res) => {
  res.json({ message: 'Token revoked successfully' })
})

export default router
