import QRCode from 'qrcode';

export interface AttendeeQrPayload {
  symposium: string;
  regId: string;
  leaderName: string;
  leaderPhone: string;
  leaderEmail: string;
  college: string;
  department: string;
  track: string;
  events: string[];
  members: { name: string; phone: string; college: string; dept?: string; year?: string }[];
  amount: number;
  paymentStatus: string;
  paymentMethod: string;
  date: string;
  venue: string;
}

export function buildAttendeeQrText(payload: AttendeeQrPayload): string {
  const membersText = payload.members
    .map((m, idx) => `[${idx + 1}] ${m.name} | ${m.phone} | ${m.college}`)
    .join('\n');

  return [
    `=== EVITRON 2K26 OFFICIAL ENTRY PASS ===`,
    `Registration ID: ${payload.regId}`,
    `Leader: ${payload.leaderName}`,
    `Phone: ${payload.leaderPhone}`,
    `Email: ${payload.leaderEmail}`,
    `College: ${payload.college}`,
    `Department: ${payload.department}`,
    `Category: ${payload.track}`,
    `Events: ${payload.events.join(', ')}`,
    `Team Members:\n${membersText}`,
    `Fee: INR ${payload.amount} | Status: ${payload.paymentStatus.toUpperCase()}`,
    `Symposium Date: ${payload.date} (08:30 AM IST)`,
    `Venue: ${payload.venue}`,
  ].join('\n');
}

export async function generateQrDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 360,
      margin: 2,
      color: {
        dark: '#1c1917',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('QR Generation failed:', err);
    return '';
  }
}

export async function generateAttendeeQrBuffer(text: string): Promise<Buffer> {
  return await QRCode.toBuffer(text, {
    width: 400,
    margin: 2,
    color: {
      dark: '#1c1917',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}

export function buildUpiUri(upiId: string, payeeName: string, amount: number, transactionNote: string): string {
  const cleanUpi = encodeURIComponent(upiId.trim());
  const cleanName = encodeURIComponent(payeeName.trim());
  const cleanNote = encodeURIComponent(transactionNote.trim());
  return `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${amount.toFixed(2)}&cu=INR&tn=${cleanNote}`;
}
