import nodemailer, { SendMailOptions } from 'nodemailer';
import { RegistrationRecord } from '../src/types';
import { buildAttendeeQrText, generateAttendeeQrBuffer } from './qr';

export interface EmailDispatchResult {
  sent: boolean;
  provider: 'smtp' | 'resend' | 'logged';
  message: string;
  recipient: string;
  timestamp: string;
  subject: string;
}

// In-memory log of dispatched / queued emails for audit in admin
export const emailAuditLog: EmailDispatchResult[] = [];

export async function sendRegistrationConfirmationEmail(
  reg: RegistrationRecord,
  eventTitles: string[]
): Promise<EmailDispatchResult> {
  const recipient = reg.teamLeader.email;
  const subject = `EVITRON 2K26 Official Entry Pass & Registration Confirmed - [${reg.id}]`;

  // Gather CC recipients from other team members if provided
  const otherEmails = reg.participants
    .slice(1)
    .map((p) => p.email?.trim())
    .filter((em): em is string => Boolean(em && em.includes('@') && em !== recipient));

  const trackLabel =
    reg.registrationType === 'workshop'
      ? 'Hands-on Workshop Track (Individual)'
      : 'National Technical Symposium Track (Team of 3)';

  const qrPayloadData = {
    symposium: 'EVITRON 2K26',
    regId: reg.id,
    leaderName: reg.teamLeader.fullName,
    leaderPhone: reg.teamLeader.phone,
    leaderEmail: reg.teamLeader.email,
    college: reg.teamLeader.college,
    department: reg.teamLeader.department,
    track: trackLabel,
    events: eventTitles,
    members: reg.participants.map((p) => ({
      name: p.fullName,
      phone: p.phone,
      college: p.college,
      dept: p.department,
      year: p.year,
    })),
    amount: reg.totalAmount,
    paymentStatus: reg.paymentStatus,
    paymentMethod: reg.paymentMethod,
    date: '08 October 2026',
    venue: 'Mahendra Engineering College (Autonomous), Namakkal',
  };

  const qrText = buildAttendeeQrText(qrPayloadData);
  const qrBuffer = await generateAttendeeQrBuffer(qrText);

  const memberRowsHtml = reg.participants
    .map(
      (p, idx) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px 12px; font-weight: bold; color: #374151;">${idx === 0 ? 'Leader' : `Member ${idx + 1}`}</td>
        <td style="padding: 8px 12px; color: #111827; font-weight: 600;">${p.fullName}</td>
        <td style="padding: 8px 12px; color: #4b5563;">${p.department} (${p.year})</td>
        <td style="padding: 8px 12px; color: #4b5563;">${p.phone}</td>
        <td style="padding: 8px 12px; color: #4b5563;">${p.college}</td>
      </tr>
    `
    )
    .join('');

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>EVITRON 2K26 Official Ticket Pass</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08);">
    
    <!-- Top Header Banner -->
    <div style="background-color: #B22222; color: #ffffff; padding: 24px; text-align: center;">
      <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #fecaca; font-weight: 700;">
        Department of Electronics & Communication Engineering
      </p>
      <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 1px;">EVITRON 2K26</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #ffffff; font-weight: 500;">
        National Level Technical Symposium • Mahendra Engineering College
      </p>
      <div style="display: inline-block; margin-top: 14px; background: rgba(0,0,0,0.25); padding: 6px 16px; border-radius: 6px; font-size: 13px; font-family: monospace; font-weight: bold; border: 1px solid rgba(255,255,255,0.2);">
        REGISTRATION ID: ${reg.id}
      </div>
    </div>

    <!-- Main Content -->
    <div style="padding: 28px;">
      
      <p style="margin-top: 0; font-size: 15px; color: #1f2937; line-height: 1.5;">
        Dear <strong>${reg.teamLeader.fullName}</strong> and Team,
      </p>
      <p style="font-size: 14px; color: #4b5563; line-height: 1.5;">
        Congratulations! Your registration for <strong>EVITRON 2K26</strong> has been received and confirmed. Below is your official Entry Pass and Attendance QR Code.
      </p>

      <!-- Scannable Attendance QR Code Box -->
      <div style="background: #fdf2f2; border: 2px dashed #B22222; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #991b1b; margin-bottom: 12px;">
          OFFICIAL ATTENDANCE & VERIFICATION QR CODE
        </span>
        <img src="cid:attendee_entry_qr" alt="EVITRON 2K26 Entry Pass QR" style="width: 220px; height: 220px; border-radius: 8px; border: 1px solid #d1d5db; background: #ffffff; padding: 6px; margin: 0 auto; display: block;" />
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #374151; font-weight: bold; font-family: monospace;">
          ID: ${reg.id}
        </p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">
          Show this QR code at the registration desk on <strong>08 October 2026</strong> for physical check-in and welcome kit collection.
        </p>
      </div>

      <!-- Registration Details Grid -->
      <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px;">
        Registration Summary
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 6px 0; color: #6b7280; width: 40%;">Track:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #111827;">${trackLabel}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Registered Events:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #B22222;">${eventTitles.join(', ')}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Payment Status:</td>
          <td style="padding: 6px 0;">
            <span style="display: inline-block; background: ${reg.paymentStatus === 'paid' ? '#def7ec' : '#fef3c7'}; color: ${reg.paymentStatus === 'paid' ? '#03543f' : '#92400e'}; font-weight: 700; font-size: 11px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">
              ${reg.paymentStatus}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Total Registration Fee:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #111827;">₹${reg.totalAmount} (${reg.paymentMethod.toUpperCase()})</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Payment Ref / UTR:</td>
          <td style="padding: 6px 0; font-family: monospace; color: #111827;">${reg.paymentId || reg.upiReference || 'Pending verification'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Event Date:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #111827;">08 October 2026 (Thursday)</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Reporting Time:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #111827;">08:30 AM IST</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Venue:</td>
          <td style="padding: 6px 0; color: #111827;">Mahendra Engineering College (Autonomous), Namakkal</td>
        </tr>
      </table>

      <!-- Team Members Table -->
      <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px;">
        Registered Participants (${reg.participants.length})
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px;">
        <thead>
          <tr style="background: #f9fafb; text-align: left;">
            <th style="padding: 8px 12px; color: #4b5563; font-weight: 700;">Role</th>
            <th style="padding: 8px 12px; color: #4b5563; font-weight: 700;">Name</th>
            <th style="padding: 8px 12px; color: #4b5563; font-weight: 700;">Dept/Year</th>
            <th style="padding: 8px 12px; color: #4b5563; font-weight: 700;">Phone</th>
            <th style="padding: 8px 12px; color: #4b5563; font-weight: 700;">College</th>
          </tr>
        </thead>
        <tbody>
          ${memberRowsHtml}
        </tbody>
      </table>

      <!-- Important Event Guidelines -->
      <div style="background: #f9fafb; border-left: 4px solid #B22222; padding: 14px; border-radius: 4px; font-size: 12px; color: #374151; line-height: 1.6;">
        <strong>Important Guidelines:</strong>
        <ul style="margin: 6px 0 0 0; padding-left: 18px;">
          <li>All team participants must bring their original physical <strong>College Identity Cards</strong>.</li>
          <li>Lunch, refreshments, workshop lab access, and symposium welcome kits are included.</li>
          <li>Paper presentation participants must submit PPT slides during morning desk registration.</li>
          <li>For any queries, please reply directly to this email at <a href="mailto:evitron26@gmail.com" style="color:#B22222;font-weight:bold;">evitron26@gmail.com</a>.</li>
        </ul>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #111827; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px;">
      <p style="margin: 0; color: #ffffff; font-weight: 700;">EVITRON 2K26 Organizing Committee</p>
      <p style="margin: 4px 0 0 0;">Department of ECE, Mahendra Engineering College (Autonomous)</p>
      <p style="margin: 2px 0 0 0;">Associations: VELOCITY & IEEE Student Branch</p>
      <p style="margin: 6px 0 0 0; font-size: 11px; color: #6b7280;">Helpline: 63831 09049 / 63749 33410 • Email: evitron26@gmail.com</p>
    </div>

  </div>
</body>
</html>
  `;

  // SMTP configuration (Strictly from evitron26@gmail.com)
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  const smtpUser = process.env.SMTP_USER || 'evitron26@gmail.com';
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const mailOptions: SendMailOptions = {
        from: `"EVITRON 2K26 - MEC ECE" <${smtpUser}>`,
        to: recipient,
        cc: otherEmails.length > 0 ? otherEmails : undefined,
        subject: subject,
        text: qrText,
        html: htmlContent,
        attachments: [
          {
            filename: `EVITRON26_${reg.id}_Entry_Pass_QR.png`,
            content: qrBuffer,
            cid: 'attendee_entry_qr',
          },
        ],
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`[REAL EMAIL DISPATCHED] MessageId: ${info.messageId} to ${recipient}`);

      const result: EmailDispatchResult = {
        sent: true,
        provider: 'smtp',
        message: `Official confirmation email with attendance QR sent to ${recipient} (Message ID: ${info.messageId})`,
        recipient,
        timestamp: new Date().toISOString(),
        subject,
      };
      emailAuditLog.unshift(result);
      return result;
    } catch (err: any) {
      console.error('SMTP email dispatch error:', err);
      const failResult: EmailDispatchResult = {
        sent: false,
        provider: 'smtp',
        message: `Failed to deliver email via SMTP: ${err.message || err}`,
        recipient,
        timestamp: new Date().toISOString(),
        subject,
      };
      emailAuditLog.unshift(failResult);
      return failResult;
    }
  }

  // Fallback when SMTP_PASS is not yet provided in .env
  console.warn(
    `[EMAIL NOTICE] SMTP_PASS not set. To send live emails from ${smtpUser}, add SMTP_PASS in .env. Generated full ticket & QR for ${reg.id}.`
  );

  const result: EmailDispatchResult = {
    sent: true,
    provider: 'logged',
    message: `Generated real ticket & QR for ${reg.id}. To dispatch live emails from ${smtpUser}, configure SMTP_PASS in .env.`,
    recipient,
    timestamp: new Date().toISOString(),
    subject,
  };
  emailAuditLog.unshift(result);
  return result;
}

