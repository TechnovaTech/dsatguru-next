'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ModuleTestsIndex() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/tutor/module-tests/math') }, [router])
  return null
}
