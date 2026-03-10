'use client'
import { useParams, useSearchParams } from 'next/navigation'
import TestResultView from '../../../components/TestResultView'

export default function TutorTestResultPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const testId = params.id
  const sessionId = searchParams.get('session_id') || searchParams.get('sessionId')
  const returnUrl = '/tutor/results'
  const viewMode = 'admin' // Use admin view mode for tutors

  return (
    <TestResultView 
        testId={testId} 
        sessionId={sessionId} 
        returnUrl={returnUrl} 
        viewMode={viewMode} 
    />
  )
}
