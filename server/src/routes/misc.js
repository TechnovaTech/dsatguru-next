import express from 'express'

const router = express.Router()

router.post('/contact-message', async (req, res) => {
  const { name, email, message } = req.body || {}
  if (!email || !message) return res.status(400).json({ message: 'Invalid payload' })
  res.json({ message: 'Message received', data: { ok: true } })
})

export default router
