import { resend, FROM_EMAIL } from '../config/email';
import { logger } from '../utils/logger';

// ============================================================
// Email Service
// Per TRD v2: Uses Resend (3,000 emails/month free)
// Templates for: OTP, Welcome, Password Reset, etc.
// ============================================================

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email via Resend
 */
async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // In development, just log
    if (process.env.NODE_ENV === 'development' && !process.env.RESEND_API_KEY) {
      logger.info(`[EMAIL] To: ${options.to} | Subject: ${options.subject}`);
      logger.debug(`[EMAIL] Body: ${options.html.substring(0, 200)}...`);
      return true;
    }

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      logger.error('Email send failed:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Email service error:', error);
    return false;
  }
}

// ============================================================
// Email Templates
// ============================================================

/**
 * Send OTP for email verification
 */
export async function sendVerificationOtp(email: string, otp: string, firstName: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Verify your KodetoCareer account',
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1E3A8A; font-size: 24px; margin: 0;">KodetoCareer</h1>
        </div>
        <h2 style="color: #0F172A; font-size: 20px;">Verify your email</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Hi ${firstName},<br><br>
          Thank you for registering with KodetoCareer! Please use the OTP below to verify your email address.
        </p>
        <div style="background: #F8FAFC; border: 2px solid #E2E8F0; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <p style="color: #475569; font-size: 12px; margin: 0 0 8px;">Your verification code</p>
          <p style="color: #1E3A8A; font-size: 36px; font-weight: 700; letter-spacing: 8px; margin: 0;">${otp}</p>
        </div>
        <p style="color: #94A3B8; font-size: 12px;">
          This code expires in 10 minutes. If you didn't request this, please ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 32px 0;" />
        <p style="color: #94A3B8; font-size: 11px; text-align: center;">
          © ${new Date().getFullYear()} KodetoCareer. All rights reserved.
        </p>
      </div>
    `,
  });
}

/**
 * Send OTP for password reset
 */
export async function sendPasswordResetOtp(email: string, otp: string, firstName: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Reset your KodetoCareer password',
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1E3A8A; font-size: 24px; margin: 0;">KodetoCareer</h1>
        </div>
        <h2 style="color: #0F172A; font-size: 20px;">Password Reset</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Hi ${firstName},<br><br>
          We received a request to reset your password. Use the code below to proceed.
        </p>
        <div style="background: #FEF3C7; border: 2px solid #F59E0B; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <p style="color: #92400E; font-size: 12px; margin: 0 0 8px;">Password reset code</p>
          <p style="color: #92400E; font-size: 36px; font-weight: 700; letter-spacing: 8px; margin: 0;">${otp}</p>
        </div>
        <p style="color: #94A3B8; font-size: 12px;">
          This code expires in 10 minutes. If you didn't request this, your account is safe — no action needed.
        </p>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 32px 0;" />
        <p style="color: #94A3B8; font-size: 11px; text-align: center;">
          © ${new Date().getFullYear()} KodetoCareer. All rights reserved.
        </p>
      </div>
    `,
  });
}

/**
 * Send welcome email with temporary password (for admin-created accounts)
 */
export async function sendWelcomeEmail(
  email: string,
  firstName: string,
  tempPassword: string,
  role: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Welcome to KodetoCareer — Your account is ready',
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1E3A8A; font-size: 24px; margin: 0;">KodetoCareer</h1>
        </div>
        <h2 style="color: #0F172A; font-size: 20px;">Welcome aboard, ${firstName}!</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Your ${role.replace('_', ' ').toLowerCase()} account has been created on KodetoCareer.
          Use the credentials below to log in.
        </p>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 24px; margin: 24px 0;">
          <p style="margin: 0 0 8px;"><strong style="color: #0F172A;">Email:</strong> <span style="color: #475569;">${email}</span></p>
          <p style="margin: 0;"><strong style="color: #0F172A;">Temporary Password:</strong> <span style="color: #1E3A8A; font-family: monospace;">${tempPassword}</span></p>
        </div>
        <div style="background: #FEF3C7; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
          <p style="color: #92400E; font-size: 12px; margin: 0;">⚠️ You will be required to change your password on first login.</p>
        </div>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 32px 0;" />
        <p style="color: #94A3B8; font-size: 11px; text-align: center;">
          © ${new Date().getFullYear()} KodetoCareer. All rights reserved.
        </p>
      </div>
    `,
  });
}
