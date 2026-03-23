import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import { env } from '../config/env'

const useResend = !!env.resendApiKey

const resendClient = useResend ? new Resend(env.resendApiKey) : null

const transporter = !useResend
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.gmailUser,
        pass: env.gmailPass
      }
    })
  : null

const sendMail = async (to: string, subject: string, html: string) => {
  const from = env.emailFrom
  if (!from) {
    throw new Error('EMAIL_FROM is not configured')
  }

  if (useResend && resendClient) {
    await resendClient.emails.send({
      from,
      to,
      subject,
      html
    })
  } else if (transporter) {
    await transporter.sendMail({ to, from, subject, html })
  } else {
    throw new Error('No email provider configured')
  }
}

export const sendVerificationEmail = async (to: string, code: string) => {
  const subject = 'Verify your VideoNotes AI account'
  const html = `
    <p>Welcome to <strong>VideoNotes AI</strong>!</p>
    <p>Your email verification code is:</p>
    <p style="font-size: 20px; font-weight: bold;">${code}</p>
    <p>This code expires in 15 minutes.</p>
  `
  await sendMail(to, subject, html)
}

export const sendPasswordResetEmail = async (to: string, code: string) => {
  const subject = 'Reset your VideoNotes AI password'
  const html = `
    <p>You requested to reset your <strong>VideoNotes AI</strong> password.</p>
    <p>Your reset code is:</p>
    <p style="font-size: 20px; font-weight: bold;">${code}</p>
    <p>This code expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
  `
  await sendMail(to, subject, html)
}

export const sendJobCompletionEmail = async (to: string, jobId: string) => {
  const subject = 'Your VideoNotes AI job is ready'
  const html = `
    <p>Your VideoNotes AI job <strong>${jobId}</strong> has completed.</p>
    <p>You can log in to your dashboard to download the generated PDF.</p>
  `
  await sendMail(to, subject, html)
}

