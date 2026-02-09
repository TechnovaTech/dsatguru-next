'use client'
import { useParams, useSearchParams } from 'next/navigation'
import TestResultView from '../../../../components/TestResultView'

export default function TestResultPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const testId = params.id
  const sessionId = searchParams.get('session_id') || searchParams.get('sessionId')
  const returnUrl = searchParams.get('returnUrl') || '/dashboard/tests'
  const viewMode = searchParams.get('viewMode')

  return (
    <TestResultView 
        testId={testId} 
        sessionId={sessionId} 
        returnUrl={returnUrl} 
        viewMode={viewMode} 
    />
  )
}