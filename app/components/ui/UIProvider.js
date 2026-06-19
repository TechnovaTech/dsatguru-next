'use client'
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { FiCheckCircle, FiXCircle, FiInfo, FiAlertTriangle, FiX } from 'react-icons/fi'

// App-wide, in-app replacements for the native window.confirm()/alert() popups.
//
//   const toast = useToast()
//   toast.success('Saved')   toast.error('Failed')   toast.info('Heads up')
//
//   const confirm = useConfirm()
//   if (!(await confirm('Delete this?'))) return
//   if (await confirm({ title: 'Delete course?', message: '...', tone: 'danger', confirmText: 'Delete' })) { ... }
//
// useConfirm() returns an async function that resolves to true (confirmed) or false (cancelled).

const ToastContext = createContext(null)
const ConfirmContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  // Safe no-op fallback if used outside the provider (keeps callers from crashing).
  return ctx || { show: () => {}, success: () => {}, error: () => {}, info: () => {} }
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  // Fallback to the native confirm if the provider is missing, so behaviour is preserved.
  return ctx || (async (opts) => window.confirm(typeof opts === 'string' ? opts : (opts?.message || 'Are you sure?')))
}

let idSeq = 0

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [dialog, setDialog] = useState(null)
  const resolverRef = useRef(null)

  const removeToast = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const show = useCallback((type, message, opts = {}) => {
    if (message == null || message === '') return
    const id = ++idSeq
    setToasts((list) => [...list, { id, type, message: String(message), duration: opts.duration ?? 3800 }])
    return id
  }, [])

  const toast = {
    show,
    success: (message, opts) => show('success', message, opts),
    error: (message, opts) => show('error', message, opts),
    info: (message, opts) => show('info', message, opts),
  }

  const confirm = useCallback((opts) => {
    const o = typeof opts === 'string' ? { message: opts } : (opts || {})
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setDialog({
        title: o.title || 'Are you sure?',
        message: o.message || '',
        confirmText: o.confirmText || 'Confirm',
        cancelText: o.cancelText || 'Cancel',
        tone: o.tone === 'danger' ? 'danger' : 'primary',
      })
    })
  }, [])

  const settle = useCallback((result) => {
    setDialog(null)
    if (resolverRef.current) {
      resolverRef.current(result)
      resolverRef.current = null
    }
  }, [])

  // Esc cancels the confirm dialog.
  useEffect(() => {
    if (!dialog) return
    const onKey = (e) => { if (e.key === 'Escape') settle(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialog, settle])

  return (
    <ToastContext.Provider value={toast}>
      <ConfirmContext.Provider value={confirm}>
        {children}

        {/* Toast stack */}
        <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-full max-w-sm flex-col gap-2">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
          ))}
        </div>

        {/* Confirm dialog */}
        {dialog && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4"
            onClick={() => settle(false)}
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-4">
                <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full ${dialog.tone === 'danger' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  <FiAlertTriangle size={20} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-slate-900">{dialog.title}</h3>
                  {dialog.message && <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-500">{dialog.message}</p>}
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => settle(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  {dialog.cancelText}
                </button>
                <button
                  onClick={() => settle(true)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${dialog.tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  {dialog.confirmText}
                </button>
              </div>
            </div>
          </div>
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onClose }) {
  useEffect(() => {
    if (!toast.duration) return
    const t = setTimeout(onClose, toast.duration)
    return () => clearTimeout(t)
  }, [toast, onClose])

  const styles = {
    success: { wrap: 'border-emerald-200 bg-emerald-50 text-emerald-800', icon: <FiCheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600" /> },
    error: { wrap: 'border-red-200 bg-red-50 text-red-800', icon: <FiXCircle className="h-5 w-5 flex-shrink-0 text-red-600" /> },
    info: { wrap: 'border-indigo-200 bg-indigo-50 text-indigo-800', icon: <FiInfo className="h-5 w-5 flex-shrink-0 text-indigo-600" /> },
  }
  const s = styles[toast.type] || styles.info

  return (
    <div role="status" className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${s.wrap}`}>
      {s.icon}
      <span className="text-sm font-medium leading-snug">{toast.message}</span>
      <button onClick={onClose} aria-label="Dismiss notification" className="ml-auto flex-shrink-0 text-slate-400 transition-colors hover:text-slate-600">
        <FiX className="h-4 w-4" />
      </button>
    </div>
  )
}
