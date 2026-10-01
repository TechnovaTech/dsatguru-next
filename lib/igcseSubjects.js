// The Cambridge IGCSE subject catalogue, in the five groups Cambridge itself
// uses to organise them.
//
// Deliberately NOT derived from the question bank: the bank only holds the
// subjects we have questions for (IGCSE Mathematics and Physics today), whereas
// a student's profile records what they are SITTING — which is most of this
// list. Reading the bank would have made the picker smaller, not bigger.
//
// Nothing here is load-bearing: a subject is stored as its plain name, so the
// picker lets anyone type one that is not listed, and a name already on a
// profile survives whether or not it appears below.
export const IGCSE_SUBJECT_GROUPS = [
  {
    group: 'Mathematics',
    subjects: [
      'Mathematics',
      'Additional Mathematics',
      'International Mathematics',
    ],
  },
  {
    group: 'Sciences',
    subjects: [
      'Biology',
      'Chemistry',
      'Physics',
      'Combined Science',
      'Co-ordinated Sciences (Double Award)',
      'Agriculture',
      'Environmental Management',
      'Marine Science',
      'Physical Science',
    ],
  },
  {
    group: 'Humanities & Social Sciences',
    subjects: [
      'Economics',
      'Geography',
      'History',
      'Global Perspectives',
      'Sociology',
      'Development Studies',
      'Enterprise',
      'Religious Studies',
      'Islamiyat',
      'Pakistan Studies',
      'Travel & Tourism',
    ],
  },
  {
    group: 'Creative & Professional',
    subjects: [
      'Accounting',
      'Business Studies',
      'Computer Science',
      'Information and Communication Technology',
      'Design & Technology',
      'Art & Design',
      'Drama',
      'Music',
      'Physical Education',
      'Food & Nutrition',
    ],
  },
  {
    group: 'English',
    subjects: [
      'English – First Language',
      'English as a Second Language',
      'English – Literature in English',
      'World Literature',
    ],
  },
  {
    group: 'Languages',
    subjects: [
      'Afrikaans – Second Language',
      'Arabic – First Language',
      'Arabic – Foreign Language',
      'Bahasa Indonesia',
      'Chinese – First Language',
      'Chinese – Second Language',
      'Chinese (Mandarin) – Foreign Language',
      'Dutch – First Language',
      'Dutch – Foreign Language',
      'French – First Language',
      'French – Foreign Language',
      'German – First Language',
      'German – Foreign Language',
      'Hindi as a Second Language',
      'isiZulu as a Second Language',
      'Italian – Foreign Language',
      'Japanese – First Language',
      'Japanese – Foreign Language',
      'Kazakh as a Second Language',
      'Latin',
      'Malay – Foreign Language',
      'Portuguese – First Language',
      'Russian – First Language',
      'Spanish – First Language',
      'Spanish – Foreign Language',
      'Spanish – Literature',
      'Thai – First Language',
      'Turkish – First Language',
      'Urdu – Second Language',
    ],
  },
]

export const IGCSE_SUBJECTS = IGCSE_SUBJECT_GROUPS.flatMap((g) => g.subjects)
