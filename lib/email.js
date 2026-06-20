import nodemailer from 'nodemailer'

function baseTransportOptions() {
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    // Don't let a slow/blocked SMTP server hang the request forever.
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000
  }
}

function createTransporter() {
  return nodemailer.createTransport(baseTransportOptions())
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

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Email-client-safe (table layout + inline styles) DSATGURU announcement template.
function announcementEmailHtml({ title, body, siteUrl }) {
  const safeTitle = escapeHtml(title)
  const safeBody = escapeHtml(body).replace(/\r?\n/g, '<br/>')
  const year = new Date().getFullYear()
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f1f5f9;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;">
          <tr><td style="background:#4f46e5;padding:22px 32px;">
            <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:0.5px;">DSAT<span style="color:#c7d2fe;">GURU</span></span>
            <span style="float:right;color:#e0e7ff;font-size:12px;font-weight:600;padding-top:9px;">&#128226; Announcement</span>
          </td></tr>
          <tr><td style="padding:32px;">
            <h1 style="margin:0 0 16px;color:#0f172a;font-size:22px;line-height:1.3;">${safeTitle}</h1>
            <div style="color:#334155;font-size:15px;line-height:1.7;">${safeBody}</div>
            <div style="text-align:center;margin:32px 0 4px;">
              <a href="${siteUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 30px;border-radius:10px;">Open DSATGURU</a>
            </div>
          </td></tr>
          <tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
              You're receiving this because you have a DSATGURU account.<br/>
              &copy; ${year} DSATGURU &middot; Digital SAT Prep
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

// Send one announcement to many recipients via batched BCC (keeps addresses
// private and minimises SMTP round-trips). Failures are logged, never thrown,
// so a mail hiccup can't break announcement creation.
export async function sendAnnouncementEmails({ title, body, recipients }) {
  const emails = Array.from(new Set((recipients || []).filter(Boolean)))
  if (!emails.length) return { sent: 0 }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[announcement-email] SMTP not configured — skipping email send')
    return { sent: 0, skipped: true }
  }

  const transporter = nodemailer.createTransport({
    ...baseTransportOptions(),
    pool: true,
    maxConnections: 3,
    maxMessages: 100
  })
  const from = process.env.SMTP_FROM || `DSATGuru <${process.env.SMTP_USER}>`
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dsatguru.com'
  const html = announcementEmailHtml({ title, body, siteUrl })
  const subject = `\u{1F4E2} ${title}`

  const BATCH = 50
  let sent = 0
  try {
    for (let i = 0; i < emails.length; i += BATCH) {
      const batch = emails.slice(i, i + BATCH)
      try {
        await transporter.sendMail({ from, to: from, bcc: batch, subject, html })
        sent += batch.length
      } catch (e) {
        console.error(`[announcement-email] batch ${Math.floor(i / BATCH) + 1} failed:`, e?.message)
      }
    }
  } finally {
    transporter.close()
  }
  return { sent }
}
