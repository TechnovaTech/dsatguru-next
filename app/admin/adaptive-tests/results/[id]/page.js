'use client'
import { useParams, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import TestResultView from '../../../../components/TestResultView'

function AdaptiveResultDetail() {
  const params = useParams()
  const searchParams = useSearchParams()
  const testId = params.id
  const sessionId = searchParams.get('session_id') || searchParams.get('sessionId')

  return (
    <TestResultView
      testId={testId}
      sessionId={sessionId}
      returnUrl="/admin/adaptive-tests/results"
      viewMode="admin"
    />
  )
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
        <p className="mt-3 text-sm text-slate-500">Loading...</p>
      </div>
    }>
      <AdaptiveResultDetail />
    </Suspense>
  )
}
