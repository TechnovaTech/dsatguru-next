'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiSearch, FiUsers, FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi'
import { apiGet, apiSend } from '../_components/api'
import { igcscUser } from '../_components/auth'
import SubjectPicker from '../_components/SubjectPicker'
import { PageHeader, Card, Loading, Table, Badge, EmptyState, ErrorState, Pill } from '../_components/ui'

// Managing the people on IGCSC — create, edit, suspend, remove.
//
// This page used to be a read-only list of a `Student` collection that had no
// password field, so an admin could add a row here and that person still had no
// way to sign in. There is one record per person now, and creating one here
// creates the account they log in with.

const ROLES = [
  { key: 'student', label: 'Students' },
  { key: 'tutor', label: 'Tutors' },
  { key: 'admin', label: 'Admins' },
]

const BLANK = {
  name: '', email: '', password: '', role: 'student',
  yearGroup: '', targetGrade: '', guardianEmail: '', subjects: [],
}

// Declared out here, not inside the page: a component defined inside another is
// a new type on every render, so React tears the form down and rebuilds it
// after each keystroke — which is exactly how an input loses focus mid-word.
function UserForm({ draft, setDraft, editing, saving, error, onSave, onClose }) {
  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 sm:items-center">
      <div className="w-full max-w-lg border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">{editing ? 'Edit user' : 'Add a user'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-subtle hover:bg-ink/5 hover:text-ink"><FiX size={18} /></button>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); onSave() }}
          className="max-h-[70vh] space-y-3 overflow-y-auto px-5 py-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-2">Full name</span>
              <input required value={draft.name} onChange={set('name')} placeholder="Aarav Sharma"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-ink focus:outline-none" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-2">Role</span>
              <select value={draft.role} onChange={set('role')}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-ink focus:outline-none">
                <option value="student">Student</option>
                <option value="tutor">Tutor</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-2">Email</span>
            <input required type="email" value={draft.email} onChange={set('email')} placeholder="aarav@example.com"
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-ink focus:outline-none" />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-2">
              {editing ? 'New password' : 'Password'}
            </span>
            <input
              required={!editing}
              type="text"
              value={draft.password}
              onChange={set('password')}
              placeholder={editing ? 'Leave blank to keep the current one' : 'At least 6 characters'}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-ink focus:outline-none"
            />
            <span className="mt-1 block text-[11px] text-subtle">
              {editing
                ? 'Setting one here replaces their password straight away.'
                : 'Shown in clear so you can pass it on — they sign in with this at /igcsc/login.'}
            </span>
          </label>

          {draft.role === 'student' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-ink-2">Year group</span>
                  <input value={draft.yearGroup} onChange={set('yearGroup')} placeholder="Year 11"
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-ink focus:outline-none" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-ink-2">Target grade</span>
                  <input value={draft.targetGrade} onChange={set('targetGrade')} placeholder="A*"
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-ink focus:outline-none" />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-2">Guardian email <span className="font-normal text-subtle">(optional)</span></span>
                <input type="email" value={draft.guardianEmail} onChange={set('guardianEmail')} placeholder="parent@example.com"
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-ink focus:outline-none" />
              </label>
              <SubjectPicker
                value={draft.subjects}
                onChange={(subjects) => setDraft((d) => ({ ...d, subjects }))}
              />
            </>
          )}

          {error && <p className="rounded-lg bg-[#b4231814] px-3 py-2 text-sm text-negative">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 bg-cta px-4 py-2.5 text-sm font-medium text-on-cta hover:bg-cta-hover disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create user'}
            </button>
            <button type="button" onClick={onClose}
              className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-ink/5">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [role, setRole] = useState('student')
  const [busyId, setBusyId] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [me, setMe] = useState(null)
  useEffect(() => { setMe(igcscUser()) }, [])
  const isAdmin = me?.role === 'admin'

  const load = useCallback(async (which) => {
    setLoading(true); setError('')
    try { setPeople(await apiGet(`/api/igcsc/students?role=${which}`)) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(role) }, [role, load])

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase()
    if (!n) return people
    return people.filter((p) => `${p.name} ${p.email}`.toLowerCase().includes(n))
  }, [people, q])

  const openCreate = () => {
    setEditing(null)
    setDraft({ ...BLANK, role })
    setFormError('')
    setFormOpen(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    setDraft({
      name: p.name || '', email: p.email || '', password: '', role: p.role || 'student',
      yearGroup: p.yearGroup || '', targetGrade: p.targetGrade || '',
      guardianEmail: p.guardianEmail || '', subjects: p.subjects || [],
    })
    setFormError('')
    setFormOpen(true)
  }

  const save = async () => {
    setSaving(true); setFormError('')
    try {
      const payload = { ...draft }
      // Blank on an edit means "keep the current password"; sending it would
      // ask the server to hash an empty string.
      if (editing && !payload.password.trim()) delete payload.password
      if (editing) await apiSend(`/api/igcsc/students/${editing._id}`, 'PUT', payload)
      else await apiSend('/api/igcsc/students', 'POST', payload)
      setFormOpen(false)
      // A role change moves them out of the tab being viewed, so reload the
      // tab the person now belongs to.
      if (draft.role !== role) setRole(draft.role)
      else await load(role)
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const setActive = async (p, isActive) => {
    setBusyId(p._id); setError('')
    try {
      await apiSend(`/api/igcsc/students/${p._id}`, 'PATCH', { isActive })
      setPeople((cur) => cur.map((x) => (x._id === p._id ? { ...x, isActive } : x)))
    } catch (e) { setError(e.message) } finally { setBusyId('') }
  }

  const remove = async (p) => {
    if (!window.confirm(`Remove ${p.name}? Their account and sign-in are deleted. This cannot be undone.`)) return
    setBusyId(p._id); setError('')
    try {
      await apiSend(`/api/igcsc/students/${p._id}`, 'DELETE')
      setPeople((cur) => cur.filter((x) => x._id !== p._id))
    } catch (e) { setError(e.message) } finally { setBusyId('') }
  }

  const columns = role === 'student'
    ? [{ label: '#' }, { label: 'Student' }, { label: 'Year' }, { label: 'Subjects' }, { label: 'Target' }, { label: 'Status' }, { label: 'Actions', align: 'right' }]
    : [{ label: '#' }, { label: 'Name' }, { label: 'Role' }, { label: 'Status' }, { label: 'Actions', align: 'right' }]

  return (
    <div>
      <PageHeader
        eyebrow="Staff · Accounts"
        title={<>The <em className="accent">people</em> on IGCSC</>}
        subtitle="Accounts for the IGCSE portal — students, tutors and admins."
        actions={isAdmin && (
          <button onClick={openCreate}
            className="flex h-10 items-center gap-2 bg-cta px-4 text-sm font-medium text-on-cta hover:bg-cta-hover">
            <FiPlus size={16} /> Add a user
          </button>
        )}
      />

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex flex-wrap gap-1.5">
            {ROLES.map((r) => (
              <button key={r.key} onClick={() => setRole(r.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  role === r.key ? 'bg-cta text-on-cta' : 'border border-line text-ink-2 hover:border-ink'
                }`}>
                {r.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…"
              className="w-64 rounded-lg border border-line py-2 pl-9 pr-3 text-sm focus:border-ink focus:outline-none" />
          </div>
        </div>

        {loading ? <Loading label="Loading users…" /> : (
          <Table
            columns={columns}
            empty={filtered.length === 0 && (
              <EmptyState
                icon={FiUsers}
                title={q ? 'Nobody matches that search' : `No ${role}s yet`}
                hint={!q && isAdmin ? 'Use “Add a user” — they can sign in as soon as you create them.' : undefined}
              />
            )}
          >
            {filtered.map((p, i) => (
              <tr key={p._id} className="hover:bg-ink/5">
                <td className="px-4 py-3 font-code text-xs tabular-nums text-subtle">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-ink">{p.name}</div>
                  <div className="font-code text-xs text-subtle">{p.email}</div>
                </td>
                {role === 'student' ? (
                  <>
                    <td className="px-4 py-3 text-ink-2">{p.yearGroup || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">{(p.subjects || []).slice(0, 3).map((s) => <Pill key={s}>{s}</Pill>)}</div>
                    </td>
                    <td className="px-4 py-3"><Badge tone="indigo">{p.targetGrade || '—'}</Badge></td>
                  </>
                ) : (
                  <td className="px-4 py-3"><Badge tone={p.role === 'admin' ? 'red' : 'indigo'}>{p.role}</Badge></td>
                )}
                <td className="px-4 py-3">
                  {p.isActive === false ? <Badge tone="red">Inactive</Badge> : <Badge tone="green">Active</Badge>}
                </td>
                <td className="px-4 py-3">
                  {isAdmin ? (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={p.isActive !== false}
                        disabled={busyId === p._id}
                        onClick={() => setActive(p, p.isActive === false)}
                        title={p.isActive === false ? 'Let them sign in again' : 'Suspend their sign-in'}
                        className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                          p.isActive === false ? 'bg-line-strong' : 'bg-positive'
                        }`}>
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-surface transition-all ${
                          p.isActive === false ? 'left-0.5' : 'left-[18px]'
                        }`} />
                      </button>
                      <button onClick={() => openEdit(p)} title="Edit"
                        className="rounded-lg p-1.5 text-subtle hover:bg-ink/5 hover:text-brand">
                        <FiEdit2 size={15} />
                      </button>
                      <button onClick={() => remove(p)} disabled={busyId === p._id} title="Remove"
                        className="rounded-lg p-1.5 text-subtle hover:bg-[#b4231814] hover:text-negative disabled:opacity-50">
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-right text-xs text-subtle">Admins only</div>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {formOpen && (
        <UserForm
          draft={draft}
          setDraft={setDraft}
          editing={editing}
          saving={saving}
          error={formError}
          onSave={save}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  )
}
