import type { FastifyBaseLogger } from 'fastify';
import type { Env } from '../env.js';
import { HttpError } from './http-error.js';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  send(message: EmailMessage): Promise<void>;
}

export function createMailer(env: Env, log: FastifyBaseLogger): Mailer {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      async send({ to, subject, text }) {
        log.warn({ to, subject }, `RESEND_API_KEY is not set, so this email was not sent:\n${text}`);
      },
    };
  }

  return {
    async send(message) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: env.EMAIL_FROM, ...message }),
      }).catch((error: unknown) => {
        log.error(error, 'Could not reach the email provider');
        return null;
      });
      if (!res?.ok) {
        if (res)
          log.error({ status: res.status, body: await res.text() }, 'Email provider rejected a message');
        throw new HttpError(502, 'We couldn’t send the verification email. Try again in a moment.');
      }
    },
  };
}

export function verificationEmail(to: string, name: string, code: string): EmailMessage {
  const subject = `${code} is your Noted verification code`;
  const text = `Hi ${name},\n\nEnter this code to finish creating your Noted account:\n\n${code}\n\nIt expires in 15 minutes. If you didn’t sign up for Noted, you can ignore this email.`;
  const html = `<p>Hi ${escapeHtml(name)},</p><p>Enter this code to finish creating your Noted account:</p><p style="font-size:28px;letter-spacing:6px;font-weight:600">${code}</p><p>It expires in 15 minutes. If you didn’t sign up for Noted, you can ignore this email.</p>`;
  return { to, subject, text, html };
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}
