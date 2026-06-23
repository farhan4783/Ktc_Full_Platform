import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || '');

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@kodetocareer.com';

export { resend, FROM_EMAIL };
