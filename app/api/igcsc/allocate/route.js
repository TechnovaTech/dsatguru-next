import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../lib/igcscDb'
import { requireIgcscAuth, IGCSC_STAFF } from '../../../../lib/igcscAuth'

// Assign / unassign an IGCSE test to a student. Creates (or removes) an ASSIGNED session.
//
// The session is filed under the student's ACCOUNT id, which is what their own
// results page looks sessions up by. It used to be filed under a separate
// `Student` document's id, so an allocated test reached nobody.
export async function PUT(request) {
  try {
    const auth = requireIgcscAuth(request, IGCSC_STAFF)
    if (auth.error) return auth.error
    const { studentId, testId, action } = await request.json()
    if (!studentId || !testId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const { IgcscUser, Test, Session } = await igcscModels()
    const student = await IgcscUser.findOne({ _id: studentId, role: 'student' })
    const test = await Test.findById(testId)
    if (!student || !test) return NextResponse.json({ error: 'Student or test not found' }, { status: 404 })

    if (!student.assignedTests) student.assignedTests = []
    const has = student.assignedTests.map((id) => id.toString()).includes(testId)

    if (action === 'add' && !has) {
      student.assignedTests.push(test._id)
      await Session.create({
        studentId: student._id, studentName: student.name, studentEmail: student.email,
        testId: test._id, testTitle: test.title, subject: test.subject, testType: test.testType,
        maxMarks: test.maxMarks, total: test.totalQuestions, state: 'ASSIGNED',
      })
    } else if (action === 'remove') {
      student.assignedTests = student.assignedTests.filter((id) => id.toString() !== testId)
      await Session.deleteMany({ studentId: student._id, testId: test._id, state: 'ASSIGNED' })
    }
    await student.save()
    return NextResponse.json({ success: true, assignedTests: student.assignedTests.map((id) => id.toString()) })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to allocate test' }, { status: 500 })
  }
}
