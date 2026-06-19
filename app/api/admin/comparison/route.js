import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import Comparison from '../../../../lib/models/Comparison'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'

export async function GET() {
  try {
    await connectDB()
    const comparison = await Comparison.findOne({ isActive: true })
    console.log('Database comparison found:', comparison)
    
    if (!comparison) {
      return NextResponse.json({ success: false, message: 'No comparison data found' })
    }
    
    return NextResponse.json({ success: true, data: comparison })
  } catch (error) {
    console.error('GET comparison error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const decoded = verifyToken(getTokenFromRequest(request))
    if (!decoded || !['Admin', 'TutorAdmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await connectDB()
    const data = await request.json()
    console.log('Saving comparison data:', data)
    
    let comparison
    if (data._id) {
      // Update existing
      const { _id, ...updateData } = data
      comparison = await Comparison.findByIdAndUpdate(_id, updateData, { new: true })
      console.log('Updated existing comparison:', comparison)
    } else {
      // Create new (deactivate existing first)
      await Comparison.updateMany({}, { isActive: false })
      comparison = await Comparison.create({ ...data, isActive: true })
      console.log('Created new comparison:', comparison)
    }
    
    return NextResponse.json({ success: true, data: comparison })
  } catch (error) {
    console.error('POST comparison error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}