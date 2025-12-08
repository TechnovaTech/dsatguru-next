import { useEffect } from 'react'
import { useRouter } from 'next/router'
import api from '../../lib/api'

export default function CheckoutStatus() {
  const router = useRouter()
  useEffect(() => {
    const { pathname, query } = router
    const sessionId = query.session_id
    const returnTo = query.return_to || '/dashboard'
    ;(async () => {
      try {
        if (pathname.includes('checkout-success') && sessionId) await api.post('/api/checkout/confirm-session', { sessionId })
        if (pathname.includes('checkout-cancel') && sessionId) await api.post('/api/checkout/cancel-session', { sessionId })
      } catch {}
      setTimeout(() => router.replace(returnTo), 3000)
    })()
  }, [router])
  return <div>Processing checkout result...</div>
}
