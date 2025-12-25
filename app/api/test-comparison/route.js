import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import Comparison from '../../../../lib/models/Comparison'

export async function GET() {
  try {
    await connectDB()
    const comparison = await Comparison.findOne({ isActive: true })
    console.log('API Test - Found comparison:', comparison)
    return NextResponse.json({ 
      success: true, 
      data: comparison,
      count: await Comparison.countDocuments()
    })
  } catch (error) {
    console.error('API Test Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}