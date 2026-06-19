'use client'

export default function DashboardError({ error, reset }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
          <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M10.34 3.94l-7.5 12.99A1.5 1.5 0 004.14 19.5h15.72a1.5 1.5 0 001.3-2.57l-7.5-12.99a1.5 1.5 0 00-2.62 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
        <p className="text-slate-600 mb-6">
          We couldn&apos;t load this part of your dashboard. Please try again.
        </p>
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
