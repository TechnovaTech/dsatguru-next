import User from './models/User'
import { ROLES } from './constants/roles'

// The students a staff caller may see. A Tutor is limited to the students assigned to
// them (User.assignedTutors); Admin / TutorAdmin get `null`, meaning no restriction.
//
// Every staff-facing read route that lists students or their sessions should go through
// this, so a tutor's reach is decided in one place rather than per route.
export async function tutorStudentIds(decoded) {
  if (!decoded || decoded.role !== ROLES.TUTOR) return null
  const students = await User.find({ role: ROLES.STUDENT, assignedTutors: decoded.userId })
    .select('_id')
    .lean()
  return students.map((s) => s._id)
}
