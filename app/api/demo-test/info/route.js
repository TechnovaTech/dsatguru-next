import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import DemoTest from '../../../../lib/models/DemoTest'

export async function GET() {
  try {
    await connectDB()
    let demoTest = await DemoTest.findOne({ singleton: 'demo-test' })
    if (!demoTest) {
      demoTest = await DemoTest.create({ singleton: 'demo-test' })
    }
    return NextResponse.json({
      success: true,
      data: {
        id: demoTest._id.toString(),
        title: demoTest.title,
        description: demoTest.description,
        instructions: demoTest.instructions,
        mathQuestionCount: (demoTest.mathQuestionIds || []).length || demoTest.mathQuestionCount,
        rwQuestionCount: (demoTest.rwQuestionIds || []).length || demoTest.rwQuestionCount,
        mathDuration: demoTest.mathDuration,
        rwDuration: demoTest.rwDuration,
        isActive: demoTest.isActive,
        totalQuestions: ((demoTest.mathQuestionIds || []).length || demoTest.mathQuestionCount) + ((demoTest.rwQuestionIds || []).length || demoTest.rwQuestionCount)
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch demo test info' }, { status: 500 })
  }
}
