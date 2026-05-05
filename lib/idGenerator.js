export function generateQuestionId(subject, tag, difficulty, rowNumber = 1, bankType = 'admin') {
  // Subject code - single letter
  const subjectCode = subject === 'Math' ? 'M' : 'R'

  // Tag/Topic code - first 2 letters only. 'General' (the no-tag fallback) uses 'GN'
  // explicitly so it never collides with 'geometry' → 'GE'.
  const tagCode = (!tag || tag === 'General')
    ? 'GN'
    : tag.replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase()

  // Difficulty code - single letter
  const diffCode = difficulty === 'Easy' ? 'E' : difficulty === 'Hard' ? 'H' : 'M'

  // Bank type prefix: T = Tutor, A = AdminTest, blank = regular admin
  // This ensures IDs never collide across different bank types
  const bankPrefix = bankType === 'tutor' ? 'T' : bankType === 'admintest' ? 'AT' : ''

  // Format: MCI-M-148 (admin) | TMCI-M-148 (tutor) | ATMCI-M-148 (admintest)
  return `${bankPrefix}${subjectCode}${tagCode}-${diffCode}-${rowNumber}`
}
