'use client'
import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

function CheckoutForm({ course, onSuccess, onCancel }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      
      // Create payment intent
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId: course.id,
          amount: course.discountedPrice || course.originalPrice
        })
      })

      const { clientSecret } = await response.json()

      // Confirm payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)
        }
      })

      if (result.error) {
        setError(result.error.message)
      } else {
        // Enroll user
        await fetch('/api/enroll', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            courseId: course.id,
            paymentIntentId: result.paymentIntent.id
          })
        })
        
        onSuccess()
      }
    } catch (err) {
      setError('Payment failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded">
        <CardElement options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': { color: '#aab7c4' }
            }
          }
        }} />
      </div>
      
      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}
      
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 px-4 border rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : `Pay $${course.discountedPrice || course.originalPrice}`}
        </button>
      </div>
    </form>
  )
}

export default function StripeCheckout({ course, onSuccess, onCancel }) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm course={course} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  )
}