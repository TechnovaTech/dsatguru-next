export const metadata = {
  title: 'Forgot Password | DSATGURU',
  description:
    'Reset your DSATGURU account password. Enter your email to receive a one-time code and choose a new password.',
  alternates: { canonical: '/forgot-password' },
  // Account-recovery flow: nothing here should be indexed.
  robots: { index: false },
}

export default function ForgotPasswordLayout({ children }) {
  return children
}
