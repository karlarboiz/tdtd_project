import nodemailer from 'nodemailer'
import { getAppUrl, isSmtpConfigured } from './auth-config.js'

function createTransport() {
  const host = process.env.TDTD_SMTP_HOST?.trim()
  if (!host) return null

  const portRaw = process.env.TDTD_SMTP_PORT
  const port = portRaw ? Number(portRaw) : 587
  const user = process.env.TDTD_SMTP_USER?.trim()
  const pass = process.env.TDTD_SMTP_PASS

  return nodemailer.createTransport({
    host,
    port: Number.isFinite(port) ? port : 587,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  })
}

function getFromAddress(): string {
  return (
    process.env.TDTD_SMTP_FROM?.trim() ||
    process.env.TDTD_SMTP_USER?.trim() ||
    'noreply@tdtd.local'
  )
}

export async function sendPasswordResetEmail(
  to: string,
  rawToken: string,
): Promise<void> {
  const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`
  const transport = createTransport()

  if (!transport || !isSmtpConfigured()) {
    console.info(`[mail] Password reset link for ${to}: ${resetUrl}`)
    return
  }

  const subject = 'Reset your TDTD password'
  const text = [
    'You requested a password reset for your TDTD account.',
    '',
    `Open this link to choose a new password (valid for a limited time):`,
    resetUrl,
    '',
    'If you did not request this, you can ignore this email.',
  ].join('\n')

  const html = `
    <p>You requested a password reset for your TDTD account.</p>
    <p><a href="${resetUrl}">Reset your password</a></p>
    <p>If you did not request this, you can ignore this email.</p>
  `

  await transport.sendMail({
    from: getFromAddress(),
    to,
    subject,
    text,
    html,
  })
}
