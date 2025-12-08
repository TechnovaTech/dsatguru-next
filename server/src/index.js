import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/user.js'
import enrollmentRoutes from './routes/enrollment.js'
import paymentRoutes from './routes/payment.js'
import checkoutRoutes from './routes/checkout.js'
import practiceRoutes from './routes/practice.js'
import testSessionRoutes from './routes/testSession.js'
import webhookRoutes from './routes/webhooks.js'
import adminCourseRoutes from './routes/adminCourse.js'
import adminRoutes from './routes/admin.js'
import miscRoutes from './routes/misc.js'

dotenv.config()

const app = express()
app.use(cors({ origin: (origin, cb) => cb(null, true), credentials: true }))
app.use(express.json())
app.use(morgan('dev'))

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/dsat_psat_lms'
await mongoose.connect(mongoUri)

app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/admin/course', adminCourseRoutes)
app.use('/api/enrollment', enrollmentRoutes)
app.use('/api/payment', paymentRoutes)
app.use('/api/checkout', checkoutRoutes)
app.use('/api/practice', practiceRoutes)
app.use('/api/test-session', testSessionRoutes)
app.use('/api/webhooks', webhookRoutes)
app.use('/api', miscRoutes)

app.get('/health', (req, res) => res.json({ ok: true }))

const port = process.env.PORT || 5000
app.listen(port, () => console.log(`API listening on ${port}`))
