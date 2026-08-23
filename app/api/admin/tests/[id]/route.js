import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import Test from '../../../../../lib/models/Test'
import TestSession from '../../../../../lib/models/TestSession'
// Registering the Question model here is required: `.populate('questions')` below
// throws MissingSchemaError on a cold start if nothing else imported it first.
import Question from '../../../../../lib/models/Question'
import { requireAuth, requireRole } from '../../../../../lib/auth'
import { ADMIN_ROLES, STAFF_ROLES } from '../../../../../lib/constants/roles'
import { canRevealAnswers, stripAnswerFields } from '../../../../../lib/serializers/question'
import { adaptiveTestShape } from '../../../../../lib/adaptiveRouting'

// A student may only load a test they own (self-practice), that is assigned to them,
// or that they already have a session for (assigned/reassigned). Staff always may.
async function studentMayAccessTest(decoded, test) {
  if (STAFF_ROLES.includes(decoded.role)) return true
  if (!test) return false
  const uid = String(decoded.userId)
  if (String(test.owner || '') === uid) return true
  if ((test.assignedTo || []).some((id) => String(id) === uid)) return true
  return !!(await TestSession.exists({ userId: decoded.userId, testId: test._id }))
}

export async function GET(request, { params }) {
  try {
    // Any authenticated user can READ a test — students take their assigned tests
    // through this endpoint (scoring is server-authoritative on submit). Editing and
    // deleting below remain admin-only.
    const auth = requireAuth(request)
    if (auth.error) return auth.error
    const { decoded } = auth
    await connectDB()
    // Populate questions if they exist in the test
    const test = await Test.findById(params.id)
      .populate('questions')
      .lean()

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    }

    // Authorization: a student cannot pull an arbitrary test by ID.
    if (!(await studentMayAccessTest(decoded, test))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Reveal answers only to staff, or to a student who has already completed this test.
    let sessionCompleted = false
    if (!canRevealAnswers({ role: decoded.role })) {
      sessionCompleted = !!(await TestSession.exists({
        userId: decoded.userId,
        testId: params.id,
        $or: [{ status: 'Completed' }, { state: 'COMPLETED' }],
      }))
    }
    const revealAnswers = canRevealAnswers({ role: decoded.role, sessionCompleted })

    // Format questions to ensure optionA-D fields exist
    if (test.questions && Array.isArray(test.questions)) {
      test.questions = test.questions.map(q => {
        // Handle potential string-encoded JSON fields
        if (typeof q.options === 'string' && q.options.trim()) {
          try {
            q.options = JSON.parse(q.options)
          } catch (e) {
            q.options = []
          }
        }
        
        // Ensure options is an array of 4 strings
        const rawOptions = Array.isArray(q.options) ? q.options : []
        q.options = ['', '', '', '']
        for (let i = 0; i < 4; i++) {
          q.options[i] = rawOptions[i] !== undefined && rawOptions[i] !== null ? String(rawOptions[i]) : ''
        }
        
        // Create optionA, optionB, optionC, optionD fields
        q.optionA = q.options[0] || ''
        q.optionB = q.options[1] || ''
        q.optionC = q.options[2] || ''
        q.optionD = q.options[3] || ''
        
        // Parse tags if string
        if (typeof q.tags === 'string' && q.tags.trim()) {
          try {
            q.tags = JSON.parse(q.tags)
          } catch (e) {
            q.tags = []
          }
        }
        
        // Ensure question field exists
        q.question = q.content || q.title || ''
        
        return q
      })
    }
    
    // If test has customQuestions, merge them with the populated questions
    if (test.customQuestions && typeof test.customQuestions === 'object') {
      test.questions = test.questions.map(q => {
        const customVersion = test.customQuestions[q._id.toString()]
        if (!customVersion) return q
        const merged = { ...q, ...customVersion }
        // The formatting loop above derived `question` and optionA-D from the BASE
        // content. The override just replaced `content` (and maybe options), so those
        // derived fields still point at the base — and the exam renders
        // `question || content`. Re-derive them from the merged override so the
        // student sees the tutor's edited stem/figure, not the original.
        merged.question = merged.content || merged.title || ''
        if (typeof merged.options === 'string' && merged.options.trim()) {
          try { merged.options = JSON.parse(merged.options) } catch (e) { merged.options = [] }
        }
        if (Array.isArray(merged.options)) {
          const raw = merged.options
          merged.options = ['', '', '', '']
          for (let i = 0; i < 4; i++) merged.options[i] = raw[i] != null ? String(raw[i]) : ''
          merged.optionA = merged.options[0]
          merged.optionB = merged.options[1]
          merged.optionC = merged.options[2]
          merged.optionD = merged.options[3]
        }
        return merged
      })
    }

    // Never ship the answer key to a student who is still taking the test.
    if (!revealAnswers && Array.isArray(test.questions)) {
      test.questions = test.questions.map(stripAnswerFields)
    }

    // No caching: a tutor's just-saved customQuestions edit (image/text/answer) must reach the
    // student's exam immediately — a cached response could keep serving the pre-edit figure.
    return NextResponse.json(test, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
  } catch (error) {
    console.error('Error fetching test:', error)
    return NextResponse.json({ error: 'Failed to fetch test' }, { status: 500 })
  }
}

// Fields an editor is allowed to change via PUT. Anything else (notably
// _id, createdBy/assignedTutors ownership, timestamps) is ignored to prevent
// mass-assignment.
const UPDATABLE_FIELDS = [
  'title',
  'description',
  'isActive',
  'questions',
  'modules',
  'duration',
  'subject',
  'sections',
  'practiceMode',
  'customConfig',
  'instructions',
  'testType',
  'difficulty',
  'totalQuestions',
  'passingScore',
  'configType',
  'excludeUsedQuestions',
  'filters',
  'questionBankId',
  'questionBankIds',
  'assignedTo',
  'isTutorTest',
  'showExplanation',
  'isTimed',
  'isModuleTest',
  'numberOfModules',
  'customQuestions'
]

export async function PUT(request, { params }) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth
    await connectDB()
    const body = await request.json()

    // Whitelist: build an explicit update object so callers cannot inject
    // arbitrary/protected fields (_id, createdBy, etc.) via the request body.
    const update = {}
    for (const field of UPDATABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        update[field] = body[field]
      }
    }

    // Keep totalQuestions + duration in sync with the section structure (2 modules per
    // enabled section) so an edited adaptive test never reverts to the 50 Q / 180 min default.
    if (update.sections && (update.sections.rw || update.sections.math)) {
      const shape = adaptiveTestShape(update.sections)
      update.totalQuestions = shape.questions
      update.duration = shape.minutes
    }

    const updated = await Test.findByIdAndUpdate(params.id, update, {
      new: true,
      runValidators: true
    })
    if (!updated) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    }
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update test' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth
    await connectDB()
    await Test.findByIdAndDelete(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete test' }, { status: 500 })
  }
}

