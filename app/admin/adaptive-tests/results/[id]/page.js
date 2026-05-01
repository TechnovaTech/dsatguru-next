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
    <Suspense fallback={<div className="p-8 text-gray-500">Loading...</div>}>
      <AdaptiveResultDetail />
    </Suspense>
  )
}
