// Canonical role names. Use these everywhere instead of inline string literals so a
// typo can't silently grant/deny access.
export const ROLES = {
  STUDENT: 'Student',
  TUTOR: 'Tutor',
  ADMIN: 'Admin',
  TUTOR_ADMIN: 'TutorAdmin',
}

export const STAFF_ROLES = [ROLES.ADMIN, ROLES.TUTOR, ROLES.TUTOR_ADMIN]
export const ADMIN_ROLES = [ROLES.ADMIN, ROLES.TUTOR_ADMIN]
export const ALL_ROLES = [ROLES.STUDENT, ROLES.TUTOR, ROLES.ADMIN, ROLES.TUTOR_ADMIN]
