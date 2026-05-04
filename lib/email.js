import nodemailer from 'nodemailer'

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })
}

export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString() // 6-digit OTP
}

export async function sendOTPEmail(email, otp, type) {
  const transporter = createTransporter()
  const isRegister = type === 'register'

  const subject = isRegister
    ? 'Verify your DSATGuru account'
    : 'Reset your DSATGuru password'

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #2563eb; font-size: 24px; margin: 0;">DSATGuru</h1>
      </div>
      <div style="background: white; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb;">
        <h2 style="color: #111827; font-size: 20px; margin-top: 0;">
          ${isRegister ? 'Verify your email address' : 'Reset your password'}
        </h2>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
          ${isRegister
            ? 'Enter the verification code below to complete your registration.'
            : 'Enter the code below to reset your password.'}
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <div style="display: inline-block; background: #eff6ff; border: 2px solid #2563eb; border-radius: 12px; padding: 16px 40px;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1d4ed8;">${otp}</span>
          </div>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
        </p>
      </div>
      <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 16px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `DSATGuru <${process.env.SMTP_USER}>`,
    to: email,
    subject,
    html
  })
}
