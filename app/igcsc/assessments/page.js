'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FiZap, FiLayers, FiEdit3, FiArrowRight } from 'react-icons/fi'
import { apiGetSafe } from '../_components/api'
import { PageHeader, Card, Loading, Badge } from '../_components/ui'

// APT / SMS / CSQ are assessment templates built on the same test engine.
const TYPES = [
  { key: 'APT', name: 'Aptitude Test (APT)', icon: FiZap, tone: 'from-indigo-500 to-blue-600',
    desc: 'Timed reasoning & aptitude assessment to benchmark a student’s baseline ability.', match: /apt|aptitude/i },
  { key: 'SMS', name: 'Subject Mastery Set (SMS)', icon: FiLayers, tone: 'from-violet-500 to-purple-600',
    desc: 'Topic-wise mastery checks that track depth of understanding per subject.', match: /sms|mastery/i },
  { key: 'CSQ', name: 'Concept & Skill Quiz (CSQ)', icon: FiEdit3, tone: 'from-emerald-500 to-teal-600',
    desc: 'Short, focused quizzes for quick concept reinforcement and skill drills.', match: /csq|concept|quiz/i },
]

export default function AssessmentsPage() {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const t = await apiGetSafe('/api/admin/tests', [])
      setTests(Array.isArray(t) ? t : [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <Loading label="Loading assessments…" />

  const countFor = (type) => tests.filter((t) => type.match.test(`${t.title || ''} ${t.testType || ''}`)).length

  return (
    <div>
      <PageHeader title="APT · SMS · CSQ Assessments" subtitle="Structured assessment formats built on the IGCSC test engine." />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {TYPES.map((type) => (
          <div key={type.key} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${type.tone} text-white`}><type.icon size={22} /></span>
              <Badge tone="indigo">{countFor(type)} live</Badge>
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">{type.name}</h3>
            <p className="mt-1 flex-1 text-sm text-slate-500">{type.desc}</p>
            <Link href="/igcsc/tests" className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
              Manage {type.key} <FiArrowRight size={14} />
            </Link>
          </div>
        ))}
      </div>

      <Card className="mt-6" title="How these formats work">
        <div className="grid grid-cols-1 gap-4 p-5 text-sm text-slate-600 sm:grid-cols-3">
          <p><span className="font-semibold text-slate-800">APT</span> establishes a baseline — assign it early to place students accurately.</p>
          <p><span className="font-semibold text-slate-800">SMS</span> runs per subject/topic — use it to confirm mastery before moving on.</p>
          <p><span className="font-semibold text-slate-800">CSQ</span> is quick and repeatable — great for daily practice and spaced review.</p>
        </div>
      </Card>
    </div>
  )
}
