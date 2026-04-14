'use client'
import { useParams, useSearchParams } from 'next/navigation'
import TestResultView from '../../../../components/TestResultView'

export default function AdminTestResultPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const testId = params.id
  const sessionId = searchParams.get('session_id') || searchParams.get('sessionId')
  const returnUrl = '/admin/admin-tests/results'
  const viewMode = 'admin'

  return (
    <TestResultView 
        testId={testId} 
        sessionId={sessionId} 
        returnUrl={returnUrl} 
        viewMode={viewMode} 
    />
  )
}
