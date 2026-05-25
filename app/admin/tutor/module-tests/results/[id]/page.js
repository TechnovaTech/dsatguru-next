'use client'
import { useParams, useSearchParams } from 'next/navigation'
import TestResultView from '../../../../../components/TestResultView'

export default function AdminModuleTestResultPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const testId = params.id
  const sessionId = searchParams.get('session_id') || searchParams.get('sessionId')

  return (
    <TestResultView
      testId={testId}
      sessionId={sessionId}
      returnUrl="/admin/tutor/module-tests/results"
      viewMode="admin"
    />
  )
}
