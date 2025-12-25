import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import Comparison from '../../../../lib/models/Comparison'

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
    await connectDB()
    const data = await request.json()
    console.log('Saving comparison data:', data)
    
    // Deactivate existing comparison
    await Comparison.updateMany({}, { isActive: false })
    
    // Create new comparison
    const comparison = await Comparison.create({ ...data, isActive: true })
    console.log('Saved comparison:', comparison)
    
    return NextResponse.json({ success: true, data: comparison })
  } catch (error) {
    console.error('POST comparison error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}