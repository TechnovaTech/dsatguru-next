'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiSave, FiAlertCircle, FiCheck, FiClock, FiBookOpen, FiSettings } from 'react-icons/fi'

const DEFAULT_CUSTOM_CONFIG = {
  rw: {
    routing: {
      low: { min: 0, max: 11 },
      medium: { min: 12, max: 20 },
      high: { min: 21, max: 27 }
    },
    distribution: {
      low: { easy: 13, medium: 10, hard: 4 },
      medium: { easy: 7, medium: 12, hard: 8 },
      high: { easy: 3, medium: 10, hard: 14 }
    }
  },
  math: {
    routing: {
      low: { min: 0, max: 9 },
      medium: { min: 10, max: 16 },
      high: { min: 17, max: 22 }
    },
    distribution: {
      low: { easy: 11, medium: 8, hard: 3 },
      medium: { easy: 6, medium: 10, hard: 6 },
      high: { easy: 2, medium: 8, hard: 12 }
    }
  }
}

export default function CreateAdminTest() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    sections: { math: true, rw: true },
    configType: 'standard',
    isTimed: true,
    duration: 134,
    customConfig: DEFAULT_CUSTOM_CONFIG
  })

  const updateCustomConfig = (section, type, path, field, value) => {
    setFormData(prev => ({
      ...prev,
      customConfig: {
        ...prev.customConfig,
        [section]: {
          ...prev.customConfig[section],
          [type]: {
            ...prev.customConfig[section][type],
            [path]: {
              ...prev.customConfig[section][type][path],
              [field]: parseInt(value) || 0
            }
          }
        }
      }
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!formData.title.trim()) { setError('Please enter a test title'); return }
    if (!formData.sections.math && !formData.sections.rw) { setError('Please select at least one section'); return }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const sections = []
      if (formData.sections.rw) sections.push('rw')
      if (formData.sections.math) sections.push('math')

      const res = await fetch('/api/admin/admin-tests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: formData.title.trim(),
          sections,
          totalQuestions: (formData.sections.rw ? 54 : 0) + (formData.sections.math ? 44 : 0),
          duration: formData.isTimed ? formData.duration : 0,
          isTimed: formData.isTimed,
          configType: formData.configType,
          customConfig: formData.configType === 'custom' ? formData.customConfig : null,
          // For question selection — use equal topic distribution
          topicConfig: {
            rw: { 'craft-structure': 25, 'information-ideas': 25, 'standard-english-conventions': 25, 'expression-ideas': 25 },
            math: { 'algebra': 25, 'advance-math': 25, 'word-problem-data-analysis': 25, 'geometry': 25 }
          },
          difficultyConfig: { Easy: 33, Medium: 34, Hard: 33 }
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create test')
      setSuccess('Admin test created successfully!')
      setTimeout(() => router.push('/admin/admin-tests/test-sheets'), 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">Create Admin Test</h1>
          <p className="mt-1 text-sm text-slate-500">Create an adaptive test using the Admin Test Bank with 2-module structure</p>
        </div>

        {error && <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-100 bg-rose-50 p-4 text-rose-700"><FiAlertCircle />{error}</div>}
        {success && <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-emerald-700"><FiCheck />{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Title */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <label htmlFor="test-title" className="mb-2 block text-sm font-semibold text-slate-700">Test Name *</label>
            <input
              id="test-title"
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Admin DSAT Practice Test 1"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Sections */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <span className="mb-3 block text-sm font-semibold text-slate-700">Sections</span>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'rw', label: 'Reading & Writing', desc: 'Module 1: 27 Qs · 32 min\nModule 2: 27 Qs · 32 min', icon: '📖' },
                { key: 'math', label: 'Math', desc: 'Module 1: 22 Qs · 35 min\nModule 2: 22 Qs · 35 min', icon: '🔢' }
              ].map(s => (
                <label key={s.key} className={`cursor-pointer rounded-xl border-2 p-4 transition ${formData.sections[s.key] ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={formData.sections[s.key]} onChange={e => setFormData({ ...formData, sections: { ...formData.sections, [s.key]: e.target.checked } })} className="mt-1 accent-indigo-600" />
                    <div>
                      <div className="font-semibold text-slate-900">{s.icon} {s.label}</div>
                      <div className="mt-1 whitespace-pre-line text-xs text-slate-500">{s.desc}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Config Type */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <span className="mb-3 block text-sm font-semibold text-slate-700">Test Configuration</span>
            <div className="grid grid-cols-2 gap-4">
              <label className={`cursor-pointer rounded-xl border-2 p-4 transition ${formData.configType === 'standard' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className="flex items-start gap-3">
                  <input type="radio" name="configType" value="standard" checked={formData.configType === 'standard'} onChange={e => setFormData({ ...formData, configType: e.target.value })} className="mt-1 accent-indigo-600" />
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-slate-900"><FiBookOpen className="text-indigo-600" /> Standard SAT</div>
                    <p className="mt-1 text-xs text-slate-500">Official College Board adaptive thresholds and difficulty distribution</p>
                  </div>
                </div>
              </label>
              <label className={`cursor-pointer rounded-xl border-2 p-4 transition ${formData.configType === 'custom' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className="flex items-start gap-3">
                  <input type="radio" name="configType" value="custom" checked={formData.configType === 'custom'} onChange={e => setFormData({ ...formData, configType: e.target.value })} className="mt-1 accent-indigo-600" />
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-slate-900"><FiSettings className="text-indigo-600" /> Custom Configuration</div>
                    <p className="mt-1 text-xs text-slate-500">Customize routing score ranges and Module 2 difficulty distribution</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Custom Config */}
          {formData.configType === 'custom' && (
            <div className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm">
              <h3 className="mb-5 flex items-center gap-2 font-semibold text-slate-900"><FiSettings className="text-indigo-600" /> Custom Configuration</h3>

              {[
                { key: 'rw', label: '📖 Reading & Writing', max: 27 },
                { key: 'math', label: '🔢 Math', max: 22 }
              ].map(sec => (
                <div key={sec.key} className="mb-8">
                  <h4 className="mb-4 text-base font-medium text-indigo-900">{sec.label} ({sec.max} questions per module)</h4>

                  {/* Routing */}
                  <div className="mb-4 rounded-lg bg-slate-50 p-4">
                    <p className="mb-3 text-sm font-semibold text-slate-700">Module 2 Routing — Score Ranges (out of {sec.max})</p>
                    <div className="grid grid-cols-3 gap-4">
                      {['low', 'medium', 'high'].map(path => (
                        <div key={path} className="rounded-lg border border-slate-200 bg-white p-3">
                          <p className="mb-2 text-xs font-semibold capitalize text-slate-600">{path} path</p>
                          <div className="space-y-2">
                            {['min', 'max'].map(field => (
                              <div key={field}>
                                <label htmlFor={`routing-${sec.key}-${path}-${field}`} className="text-xs capitalize text-slate-500">{field} score</label>
                                <input
                                  id={`routing-${sec.key}-${path}-${field}`}
                                  type="number" min={0} max={sec.max}
                                  value={formData.customConfig[sec.key].routing[path][field]}
                                  onChange={e => updateCustomConfig(sec.key, 'routing', path, field, e.target.value)}
                                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Distribution */}
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="mb-3 text-sm font-semibold text-slate-700">Module 2 Difficulty Distribution (questions)</p>
                    <div className="grid grid-cols-3 gap-4">
                      {['low', 'medium', 'high'].map(path => (
                        <div key={path} className="rounded-lg border border-slate-200 bg-white p-3">
                          <p className="mb-2 text-xs font-semibold capitalize text-slate-600">{path} path</p>
                          <div className="space-y-2">
                            {['easy', 'medium', 'hard'].map(diff => (
                              <div key={diff}>
                                <label htmlFor={`dist-${sec.key}-${path}-${diff}`} className="text-xs capitalize text-slate-500">{diff}</label>
                                <input
                                  id={`dist-${sec.key}-${path}-${diff}`}
                                  type="number" min={0} max={sec.max}
                                  value={formData.customConfig[sec.key].distribution[path][diff]}
                                  onChange={e => updateCustomConfig(sec.key, 'distribution', path, diff, e.target.value)}
                                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Timer */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <span className="mb-3 block text-sm font-semibold text-slate-700">Test Mode</span>
            <div className="mb-4 flex gap-4">
              {[{ v: true, label: 'Timed' }, { v: false, label: 'Untimed' }].map(m => (
                <label key={String(m.v)} className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 p-3 transition ${formData.isTimed === m.v ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" checked={formData.isTimed === m.v} onChange={() => setFormData({ ...formData, isTimed: m.v })} className="hidden" />
                  {m.v && <FiClock />}
                  <span className="text-sm font-medium">{m.label}</span>
                </label>
              ))}
            </div>
            {formData.isTimed && (
              <div className="flex items-center gap-3">
                <div>
                  <label htmlFor="test-duration" className="mb-1 block text-sm text-slate-600">Duration (minutes)</label>
                  <input id="test-duration" type="number" min={10} value={formData.duration} onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) || 134 })} className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" />
                </div>
                <p className="mt-5 text-xs text-slate-400">Default: 134 min (64 R&W + 70 Math)</p>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
            <strong>Summary:</strong>{' '}
            {formData.sections.rw ? '54 R&W questions (27+27 adaptive)' : ''}
            {formData.sections.rw && formData.sections.math ? ' + ' : ''}
            {formData.sections.math ? '44 Math questions (22+22 adaptive)' : ''}
            {' · '}{formData.isTimed ? `${formData.duration} min` : 'Untimed'}
            {' · '}{formData.configType === 'standard' ? 'Standard SAT routing' : 'Custom routing'}
            {' · '}Questions auto-selected from Admin Test Bank
          </div>

          <button
            type="submit"
            disabled={loading || (!formData.sections.math && !formData.sections.rw)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-base font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <FiSave /> {loading ? 'Creating Test...' : 'Create Admin Test'}
          </button>
        </form>
      </div>
    </div>
  )
}
