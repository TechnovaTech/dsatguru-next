export const metadata = {
  title: 'Thank You | DSATGURU',
  description:
    'Your DSATGURU enrollment is confirmed. Join the student WhatsApp group and head to your dashboard to start preparing.',
  alternates: { canonical: '/thank-you' },
  // Post-checkout return page: never meant to be indexed or crawled.
  robots: { index: false, follow: false },
}

export default function ThankYouLayout({ children }) {
  return children
}
