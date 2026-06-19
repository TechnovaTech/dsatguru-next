'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  FiArrowLeft,
  FiVideo,
  FiDownload,
  FiCalendar,
  FiFileText,
  FiExternalLink,
  FiBookOpen,
  FiFileMinus,
  FiCheckCircle,
  FiClock,
  FiPaperclip,
  FiInbox,
  FiX,
  FiFileText as FiSummary,
  FiImage,
  FiGlobe,
} from 'react-icons/fi'

const TABS = [
  { id: 'meetings', label: 'Live Meetings', icon: FiVideo },
  { id: 'materials', label: 'Study Materials', icon: FiDownload },
  { id: 'syllabus', label: 'Course Timeline', icon: FiCalendar },
  { id: 'assignments', label: 'Assignments', icon: FiFileText },
]

function formatDate(d) {
  if (!d) return '—'
  const parsed = new Date(d)
  return isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString()
}

function EmptyState({ icon: Icon, title, helper }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-14 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="h-7 w-7" />
      </span>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{helper}</p>
    </div>
  )
}

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { courseId } = params
  const [courseData, setCourseData] = useState({
    meetings: [],
    materials: [],
    syllabus: [],
    assignments: []
  })
  const [courseTitle, setCourseTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('meetings')
  const [recap, setRecap] = useState(null)

  useEffect(() => {
    const fetchCourseContent = async () => {
      try {
        setLoading(true)
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const res = await fetch(`/api/courses/${courseId}/content`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        if (res.status === 403) {
          router.push('/dashboard/courses')
          return
        }
        if (res.ok) {
          const json = await res.json()
          const content = json.content || {}
          setCourseTitle(json.title || '')
          setCourseData({
            meetings: content.meetings || [],
            materials: content.materials || [],
            syllabus: content.syllabus || [],
            assignments: content.assignments || []
          })
        }
      } finally {
        setLoading(false)
      }
    }
    if (courseId) fetchCourseContent()
  }, [courseId, router])

  // Close recap modal on Escape
  useEffect(() => {
    if (!recap) return
    const onKey = (e) => { if (e.key === 'Escape') setRecap(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [recap])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => router.push('/dashboard/courses')}
            className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <FiArrowLeft className="h-4 w-4" /> Back to Courses
          </button>
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FiBookOpen className="h-5 w-5" />
            </span>
            {courseTitle || 'Course Content'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Access your course materials, meetings, and assignments</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Live Meetings', value: courseData.meetings.length, icon: FiVideo, color: 'bg-indigo-500' },
            { label: 'Study Materials', value: courseData.materials.length, icon: FiDownload, color: 'bg-emerald-500' },
            { label: 'Timeline Weeks', value: courseData.syllabus.length, icon: FiCalendar, color: 'bg-violet-500' },
            { label: 'Assignments', value: courseData.assignments.length, icon: FiFileText, color: 'bg-amber-500' },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-white ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-extrabold text-slate-900">{stat.value}</p>
                <p className="truncate text-sm text-slate-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + content */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-wrap gap-1 border-b border-slate-100 px-2 pt-2">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                    active
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="p-6">
            {/* Live Meetings */}
            {activeTab === 'meetings' && (
              <div className="space-y-4">
                {courseData.meetings.length > 0 ? (
                  courseData.meetings.map((meeting, idx) => {
                    const hasRecap = meeting.transcriptSummary || (meeting.snapshots && meeting.snapshots.length > 0)
                    return (
                      <div
                        key={meeting._id || idx}
                        className="rounded-2xl border border-slate-100 p-5 transition-colors hover:bg-indigo-50/40"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                              <FiVideo className="h-4 w-4 flex-shrink-0 text-indigo-500" />
                              {meeting.title || '—'}
                            </h3>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <FiCalendar className="h-3.5 w-3.5" />
                                {meeting.date || '—'}
                              </span>
                              {meeting.transcriptLanguage && (
                                <span className="flex items-center gap-1">
                                  <FiGlobe className="h-3.5 w-3.5" />
                                  {meeting.transcriptLanguage}
                                </span>
                              )}
                              {meeting.transcriptGeneratedAt && (
                                <span className="flex items-center gap-1">
                                  <FiClock className="h-3.5 w-3.5" />
                                  Recap {formatDate(meeting.transcriptGeneratedAt)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-2">
                            {hasRecap && (
                              <button
                                onClick={() => setRecap(meeting)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                              >
                                <FiSummary className="h-4 w-4" /> View Recap
                              </button>
                            )}
                            {meeting.link && (
                              <a
                                href={meeting.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                              >
                                <FiExternalLink className="h-4 w-4" /> Join
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <EmptyState icon={FiVideo} title="No meetings scheduled yet" helper="Live meeting links will appear here once your instructor schedules them." />
                )}
              </div>
            )}

            {/* Study Materials */}
            {activeTab === 'materials' && (
              <div className="space-y-4">
                {courseData.materials.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {courseData.materials.map((material, idx) => {
                      const name = material.mainName || material.title || '—'
                      const hasSub = material.hasSubMaterials || (material.subMaterials && material.subMaterials.length > 0)
                      const subs = material.subMaterials || []
                      return (
                        <div
                          key={material._id || idx}
                          className="rounded-2xl border border-slate-100 p-5 transition-shadow hover:shadow-md"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                              <FiFileMinus className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-semibold text-slate-900">{name}</h3>
                                {!hasSub && material.link && (
                                  <a
                                    href={material.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
                                  >
                                    <FiDownload className="h-3.5 w-3.5" /> Open
                                  </a>
                                )}
                              </div>
                              {!hasSub && material.type && (
                                <span className="mt-1 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">
                                  {material.type}
                                </span>
                              )}
                              {material.uploadDate && (
                                <p className="mt-1 text-xs text-slate-400">Uploaded {formatDate(material.uploadDate)}</p>
                              )}

                              {hasSub && subs.length > 0 && (
                                <ul className="mt-3 space-y-2">
                                  {subs.map((sub, sIdx) => (
                                    <li
                                      key={sub._id || sIdx}
                                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2"
                                    >
                                      <div className="flex min-w-0 items-center gap-2">
                                        <FiFileText className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                                        <span className="truncate text-sm text-slate-700">{sub.name || '—'}</span>
                                        {sub.type && (
                                          <span className="flex-shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-500">
                                            {sub.type}
                                          </span>
                                        )}
                                      </div>
                                      {sub.link && (
                                        <a
                                          href={sub.link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                                        >
                                          <FiDownload className="h-3.5 w-3.5" /> Open
                                        </a>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState icon={FiDownload} title="No materials available" helper="Study materials and downloads shared by your instructor will show up here." />
                )}
              </div>
            )}

            {/* Course Timeline */}
            {activeTab === 'syllabus' && (
              <div className="space-y-4">
                {courseData.syllabus.length > 0 ? (
                  <ol className="relative space-y-4 border-l border-slate-200 pl-6">
                    {courseData.syllabus.map((item, idx) => (
                      <li key={item._id || idx} className="relative">
                        <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-600 ring-4 ring-white">
                          {item.week ?? idx + 1}
                        </span>
                        <div className="rounded-2xl border border-slate-100 p-4 transition-colors hover:bg-indigo-50/40">
                          <div className="font-semibold text-slate-900">
                            {item.week != null && (
                              <span className="mr-2 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">
                                Week {item.week}
                              </span>
                            )}
                            {item.title || '—'}
                          </div>
                          {item.description && (
                            <p className="mt-2 text-sm text-slate-500">{item.description}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <EmptyState icon={FiCalendar} title="No syllabus entries" helper="Your course week-by-week timeline will appear here when it's published." />
                )}
              </div>
            )}

            {/* Assignments */}
            {activeTab === 'assignments' && (
              <div className="space-y-4">
                {courseData.assignments.length > 0 ? (
                  courseData.assignments.map((assignment, idx) => {
                    const completed = assignment.status === 'Completed'
                    const attachments = assignment.materials || []
                    return (
                      <div
                        key={assignment._id || idx}
                        className="rounded-2xl border border-slate-100 p-5 transition-colors hover:bg-indigo-50/40"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                              <FiFileText className="h-4 w-4 flex-shrink-0 text-amber-500" />
                              {assignment.title || '—'}
                            </h3>
                            {assignment.dueDate && (
                              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                                <FiClock className="h-3.5 w-3.5" /> Due {assignment.dueDate}
                              </p>
                            )}
                          </div>
                          <span
                            className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                              completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {completed ? <FiCheckCircle className="h-3.5 w-3.5" /> : <FiClock className="h-3.5 w-3.5" />}
                            {assignment.status || 'Pending'}
                          </span>
                        </div>
                        {assignment.description && (
                          <p className="mt-3 text-sm text-slate-500">{assignment.description}</p>
                        )}
                        {attachments.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {attachments.map((att, aIdx) => (
                              att.link ? (
                                <a
                                  key={att._id || aIdx}
                                  href={att.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
                                >
                                  <FiPaperclip className="h-3.5 w-3.5 text-slate-400" />
                                  {att.name || 'Attachment'}
                                  {att.type && <span className="text-[10px] uppercase text-slate-400">{att.type}</span>}
                                </a>
                              ) : (
                                <span
                                  key={att._id || aIdx}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                                >
                                  <FiPaperclip className="h-3.5 w-3.5 text-slate-400" />
                                  {att.name || 'Attachment'}
                                </span>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <EmptyState icon={FiInbox} title="No assignments yet" helper="Assignments and their due dates will be listed here once posted." />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recap modal */}
      {recap && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setRecap(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <FiVideo className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-slate-900">Meeting Recap</h3>
                  <p className="truncate text-xs text-slate-500">{recap.title || '—'}</p>
                </div>
              </div>
              <button
                onClick={() => setRecap(null)}
                aria-label="Close"
                className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50 p-6">
              {recap.transcriptSummary ? (
                <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-800 shadow-sm">
                  {recap.transcriptSummary}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No summary available for this meeting.</p>
              )}

              {recap.snapshots && recap.snapshots.length > 0 && (
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <FiImage className="h-4 w-4" /> Visual Recap
                  </h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {recap.snapshots.map((snap, i) => (
                      <div key={snap._id || i} className="space-y-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                        {snap.imageUrl && (
                          <img src={snap.imageUrl} alt={snap.title || 'Snapshot'} className="w-full rounded border border-slate-200" />
                        )}
                        <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
                          <span className="truncate">{snap.title || '—'}</span>
                          <span className="flex-shrink-0">{snap.timestamp || ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
