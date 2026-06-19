import { FiClipboard } from 'react-icons/fi'

export default function Page() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">Student Attempts</h1>
        <p className="mt-2 text-sm text-slate-500">Review individual student test attempts and answers.</p>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
            <FiClipboard size={28} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Coming soon</h2>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            A detailed view of student attempts is on the way. Check back later to explore each student&apos;s submitted answers and results.
          </p>
        </div>
      </div>
    </div>
  )
}
