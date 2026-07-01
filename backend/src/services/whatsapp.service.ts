import { logger } from '../utils/logger';

// ============================================================
// WhatsApp Service (via Twilio WhatsApp API)
// Per TRD v2: WhatsApp is configured as an alert channel
// ============================================================

interface WhatsAppOptions {
  to: string;
  message: string;
}

/**
 * Send a WhatsApp message via Twilio (Sandbox or Live API)
 */
export async function sendWhatsAppMessage(options: WhatsAppOptions): Promise<boolean> {
  try {
    const cleanPhone = options.to.replace(/[^\d+]/g, '');
    const recipient = cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`;

    if (process.env.NODE_ENV === 'development') {
      logger.info(`[WHATSAPP DEVELOPMENT] To: ${recipient} | Msg: ${options.message}`);

      const hasNoSid = !process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKEN;
      const isDummyKey = process.env.TWILIO_SID?.startsWith('ACxxx') || process.env.TWILIO_SID === 'your_twilio_sid_here';

      if (hasNoSid || isDummyKey) {
        logger.info('[WHATSAPP DEVELOPMENT] Bypassing Twilio API (dummy or missing credentials)');
        return true;
      }
    }

    // Lazy load twilio dependency only if configurations are present
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

    const fromNum = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Twilio sandbox number

    await client.messages.create({
      body: options.message,
      from: fromNum.startsWith('whatsapp:') ? fromNum : `whatsapp:${fromNum}`,
      to: recipient.startsWith('whatsapp:') ? recipient : `whatsapp:${recipient}`,
    });

    return true;
  } catch (error: any) {
    logger.error('WhatsApp send failed:', error.message);
    return false;
  }
}

/**
 * Send OTP via WhatsApp
 */
export async function sendWhatsAppOtp(phone: string, otp: string, firstName: string): Promise<boolean> {
  const message = `Hello ${firstName}, your KodetoCareer verification OTP is *${otp}*. It is valid for 10 minutes. Do not share this OTP with anyone.`;
  return sendWhatsAppMessage({ to: phone, message });
}

/**
 * Send Low Attendance Alert via WhatsApp
 */
export async function sendWhatsAppAttendanceWarning(phone: string, attendancePct: number, firstName: string): Promise<boolean> {
  const message = `⚠️ *ATTENDANCE ALERT* ⚠️\n\nHello ${firstName},\nYour attendance has fallen to *${attendancePct.toFixed(1)}%*, which is below the mandatory 75% requirement. Please attend the upcoming sessions to restore your eligibility for certificates and placements.`;
  return sendWhatsAppMessage({ to: phone, message });
}

/**
 * Send New Job Alert via WhatsApp
 */
export async function sendWhatsAppJobAlert(phone: string, jobTitle: string, company: string, deadline: string): Promise<boolean> {
  const message = `💼 *NEW JOB OPPORTUNITY* 💼\n\nWe found a role matching your skill profile:\n*Role:* ${jobTitle}\n*Company:* ${company}\n*Deadline:* ${deadline}\n\nLog in to the KodetoCareer app to view full details and mark your interest!`;
  return sendWhatsAppMessage({ to: phone, message });
}
