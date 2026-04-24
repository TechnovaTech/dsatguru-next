export const metadata = {
  title: 'Free DSAT Demo Test — DSATGuru',
  description: 'Take a free DSAT demo test online. Experience the real Digital SAT exam interface with Math and Reading & Writing modules, instant scoring, and detailed explanations.',
  keywords: 'free DSAT demo test, digital SAT practice, free SAT test online, DSAT mock test, SAT preparation, DSATGuru demo',
  openGraph: {
    title: 'Free DSAT Demo Test — DSATGuru',
    description: 'Experience the real DSAT interface with a free demo test. Math + Reading & Writing modules with instant animated scoring.',
    type: 'website',
    siteName: 'DSATGuru'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free DSAT Demo Test — DSATGuru',
    description: 'Try a free DSAT demo test online. Real exam feel with instant results.'
  },
  alternates: {
    canonical: '/demo-test'
  }
}

export default function DemoTestLayout({ children }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Quiz',
            name: 'DSATGuru Free DSAT Demo Test',
            description: 'A free DSAT demo test covering Math and Reading & Writing sections with instant scoring and review.',
            educationalLevel: 'High School',
            learningResourceType: 'Practice Test',
            provider: {
              '@type': 'EducationalOrganization',
              name: 'DSATGuru'
            }
          })
        }}
      />
      {children}
    </>
  )
}
