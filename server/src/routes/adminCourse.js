import express from 'express'
import Course from '../models/Course.js'

const router = express.Router()

router.get('/with-schedule', async (req, res) => {
  const courses = await Course.find({}).select('-__v')
  const data = courses.map(c => ({
    id: c._id,
    title: c.title,
    description: c.description,
    overview: c.overview,
    courseDetails: c.courseDetails,
    bannerImageUrl: c.bannerImageUrl,
    type: c.type,
    price: c.price,
    discountedPrice: c.discountedPrice,
    discountPercentage: c.discountPercentage,
    schedules: c.schedules,
    faqs: c.faqs,
    highlights: c.highlights
  }))
  res.json({ success: true, data })
})

router.post('/', async (req, res) => {
  const course = await Course.create(req.body)
  res.status(201).json({ success: true, data: { id: course._id } })
})

export default router
