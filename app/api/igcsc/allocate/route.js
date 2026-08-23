import { NextResponse } from 'next/server'
import { igcscModels } from '../../../../lib/igcscDb'
import { requireRole } from '../../../../lib/auth'
import { STAFF_ROLES } from '../../../../lib/constants/roles'

// Assign / unassign an IGCSE test to a student. Creates (or removes) an ASSIGNED session.
export async function PUT(request) {
  try {
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    const { studentId, testId, action } = await request.json()
    if (!studentId || !testId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const { Student, Test, Session } = await igcscModels()
    const student = await Student.findById(studentId)
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
