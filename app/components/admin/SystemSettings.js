'use client'
import { useState, useEffect } from 'react'
import { FiSave, FiRefreshCw, FiSettings } from 'react-icons/fi'
import { useConfirm } from '../ui/UIProvider'

const PERSISTED_FIELDS = ['siteName', 'maintenanceMode', 'maintenanceEndsAt', 'registrationEnabled']

const DEFAULT_SETTINGS = {
  siteName: 'DSATGURU',
  maintenanceMode: false,
  maintenanceEndsAt: '',
  registrationEnabled: true
}

// Convert a stored value (ISO string or Date) into the value a
// <input type="datetime-local"> expects (local 'YYYY-MM-DDTHH:mm').
const toLocalInputValue = (val) => {
  if (!val) return ''
  const d = new Date(val)
  if (isNaN(d.getTime())) return ''
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

export default function SystemSettings() {
  const confirm = useConfirm()
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null) // { type: 'success' | 'error', message }

  const loadSettings = async () => {
    setLoading(true)
    setStatus(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to load settings')
      const data = await res.json()
      setSettings(() => {
        const merged = { ...DEFAULT_SETTINGS }
        for (const field of PERSISTED_FIELDS) {
          if (data[field] !== undefined && data[field] !== null) merged[field] = data[field]
        }
        return merged
      })
    } catch (err) {
      setStatus({ type: 'error', message: 'Could not load settings from the server.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setStatus(null)
    try {
      const token = localStorage.getItem('token')
      const payload = {
        siteName: settings.siteName,
        maintenanceMode: settings.maintenanceMode,
        // Only keep an auto-off time while maintenance is on.
        maintenanceEndsAt: settings.maintenanceMode ? (settings.maintenanceEndsAt || null) : null,
        registrationEnabled: settings.registrationEnabled
      }
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save settings')
      }
      const data = await res.json()
      setSettings((prev) => {
        const merged = { ...prev }
        for (const field of PERSISTED_FIELDS) {
          if (data[field] !== undefined) merged[field] = data[field] ?? (field === 'maintenanceEndsAt' ? '' : merged[field])
        }
        return merged
      })
      setStatus({ type: 'success', message: 'Settings saved successfully!' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Failed to save settings.' })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (await confirm('Reload settings from the server and discard unsaved changes?')) {
      loadSettings()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"><FiSettings size={18} /></span>
              General Settings
            </h1>
            <p className="mt-1 text-sm text-slate-500">Configure platform-wide preferences</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <FiRefreshCw /> Reset
            </button>
            <button
              onClick={handleSave}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              <FiSave /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {status && (
          <div
            role="alert"
            className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${
              status.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span>{status.message}</span>
            {status.type === 'error' && (
              <button
                onClick={loadSettings}
                className="self-start rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 sm:self-auto"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-100 bg-white py-12 shadow-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
            <div className="space-y-6">
              {/* Site Name */}
              <div>
                <label htmlFor="siteName" className="block text-sm font-medium text-slate-700 mb-1">Site Name</label>
                <input
                  id="siteName"
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Maintenance Mode */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <label htmlFor="maintenance" className="text-sm font-semibold text-slate-800">Maintenance Mode</label>
                    <p className="mt-0.5 text-xs text-slate-500">
                      When on, visitors see a maintenance page across the whole site. Staff (admins/tutors) can still log in and use the site — so you can always turn it back off.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="maintenance"
                    checked={settings.maintenanceMode}
                    onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                    className="mt-1 h-5 w-5 flex-shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>

                {settings.maintenanceMode && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <label htmlFor="maintenanceEndsAt" className="block text-sm font-medium text-slate-700 mb-1">
                      Auto turn-off time <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="maintenanceEndsAt"
                      type="datetime-local"
                      value={toLocalInputValue(settings.maintenanceEndsAt)}
                      onChange={(e) => setSettings({ ...settings, maintenanceEndsAt: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:w-auto"
                    />
                    <p className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                      <span>Maintenance turns itself off at this time (the page shows a live countdown).</span>
                      {settings.maintenanceEndsAt && (
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, maintenanceEndsAt: '' })}
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Enable Registration */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div>
                  <label htmlFor="registration" className="text-sm font-semibold text-slate-800">Enable Registration</label>
                  <p className="mt-0.5 text-xs text-slate-500">Allow new students to create an account. Turn off to close sign-ups.</p>
                </div>
                <input
                  type="checkbox"
                  id="registration"
                  checked={settings.registrationEnabled}
                  onChange={(e) => setSettings({ ...settings, registrationEnabled: e.target.checked })}
                  className="mt-1 h-5 w-5 flex-shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
