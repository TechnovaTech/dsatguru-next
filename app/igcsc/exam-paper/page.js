'use client'
// The paper browser moved into the Question Bank. Old bookmarks and links land
// there instead of on a page that no longer exists.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '../_components/ui'

export default function ExamPaperRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/igcsc/question-bank') }, [router])
  return <Loading label="Opening the Question Bank…" />
}
