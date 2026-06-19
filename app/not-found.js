import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
        <p className="text-6xl font-extrabold text-indigo-600 mb-2">404</p>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Page not found</h1>
        <p className="text-slate-600 mb-6">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It may have been moved or no longer exists.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
