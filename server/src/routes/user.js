import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import User from '../models/User.js'

const router = express.Router()

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) return res.status(404).json({ message: 'User not found' })
  res.json({ message: 'Profile fetched successfully', user: { id: user._id, name: user.name, email: user.email, role: user.role } })
})

export default router
