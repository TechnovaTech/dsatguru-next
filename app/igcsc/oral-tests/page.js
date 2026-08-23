'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FiMic, FiVideo, FiUsers, FiFileText } from 'react-icons/fi'
import { apiGetSafe } from '../_components/api'
import { PageHeader, Card, Loading, Table, Badge, EmptyState } from '../_components/ui'

export default function OralTestsPage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const all = await apiGetSafe('/api/igcsc/sessions?state=all', [])
      const oral = (Array.isArray(all) ? all : []).filter((s) => /oral|viva|speaking/i.test(`${s.testTitle} ${s.testType || ''} ${s.subject || ''}`))
      setSessions(oral); setLoading(false)
    })()
  }, [])

  if (loading) return <Loading label="Loading oral tests…" />

  return (
    <div>
      <PageHeader title="Oral Tests" subtitle="Conduct live, one-to-one oral & speaking assessments over video with transcripts." />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: FiVideo, title: 'Live Video Room', text: 'Face-to-face oral/viva assessment powered by the built-in meeting room.' },
          { icon: FiFileText, title: 'Auto Transcripts', text: 'Every oral session is transcribed and saved to the student record.' },
          { icon: FiUsers, title: 'Examiner Notes', text: 'Score and annotate performance live while the student responds.' },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white"><f.icon size={20} /></span>
            <h3 className="mt-3 text-sm font-bold text-slate-900">{f.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{f.text}</p>
          </div>
        ))}
      </div>
      <Card title="Oral Sessions" action={<Link href="/igcsc/users" className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"><FiMic size={13} /> New Oral Test</Link>}>
        <Table columns={[{ label: 'Student' }, { label: 'Assessment' }, { label: 'Subject' }, { label: 'Status', align: 'right' }]}
          empty={sessions.length === 0 && <EmptyState icon={FiMic} title="No oral tests scheduled" hint="Start an oral assessment from a student's profile to see it here." />}>
          {sessions.map((s) => (
            <tr key={s._id} className="hover:bg-slate-50/60">
              <td className="px-4 py-3"><div className="font-semibold text-slate-800">{s.studentName}</div><div className="text-xs text-slate-400">{s.studentEmail}</div></td>
              <td className="px-4 py-3 text-slate-600">{s.testTitle}</td>
              <td className="px-4 py-3"><Badge tone="slate">{s.subject}</Badge></td>
              <td className="px-4 py-3 text-right">{s.state === 'IN_PROGRESS' ? <Badge tone="red">Live</Badge> : <Badge tone="green">Done</Badge>}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}
