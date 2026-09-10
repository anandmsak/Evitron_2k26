import dotenv from 'dotenv';
dotenv.config({ override: true });
import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { store } from './server/store';
import {
  createOrder,
  verifyPaymentHmacSignature,
  fetchAndVerifyRazorpayPayment,
  verifyWebhookSignature,
  getRazorpayKeyId,
  checkRazorpayHealth,
  getAppEnv,
  AppEnvironment,
} from './server/razorpay';
import { generateQrDataUrl, buildUpiUri, buildAttendeeQrText } from './server/qr';
import { sendRegistrationConfirmationEmail, emailAuditLog } from './server/email';
import { Participant, RegistrationRecord } from './src/types';

const PORT = 3000;
const app = express();

const DEFAULT_GOOGLE_SHEET_WEBHOOK_URL =
  process.env.GOOGLE_SHEET_WEBHOOK_URL ||
  'https://script.google.com/macros/s/AKfycbwQFDmE-3bG517qhy5jP6my90QCKsps5GLn2q7ih3vHJmTq96PikBitSCJgIqyxOqRoaQ/exec';

// Real-time Google Sheet Webhook Synchronizer
async function syncToGoogleSheetWebhook(reg: RegistrationRecord, eventTitles: string[]) {
  const webhookUrl = DEFAULT_GOOGLE_SHEET_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const payload = {
      regId: reg.id,
      createdAt: reg.createdAt,
      track: reg.registrationType,
      events: eventTitles.join(', '),
      leaderName: reg.teamLeader.fullName,
      leaderEmail: reg.teamLeader.email,
      leaderPhone: reg.teamLeader.phone,
      college: reg.teamLeader.college,
      department: reg.teamLeader.department,
      year: reg.teamLeader.year,
      participantsCount: reg.participants.length,
      member2: reg.participants[1] ? `${reg.participants[1].fullName} (${reg.participants[1].phone})` : '',
      member3: reg.participants[2] ? `${reg.participants[2].fullName} (${reg.participants[2].phone})` : '',
      amount: reg.totalAmount,
      paymentMethod: reg.paymentMethod,
      paymentStatus: reg.paymentStatus,
      paymentRef: reg.paymentId || reg.upiReference || '',
      attendance: reg.attendanceMarked ? 'Present' : 'Absent',
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
    console.log(`[SHEETS SYNC] Synced ${reg.id} to Google Sheet successfully`);
  } catch (err: any) {
    console.log(`[SHEETS SYNC] Sync notification status for ${reg.id}:`, err?.message || err);
  }
}

// Middleware for parsing JSON with raw body capture for webhook signature verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// In-memory active admin session tokens
const activeAdminSessions = new Set<string>();

// Helper to authenticate admin requests
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Admin session required.' });
  }
  const token = authHeader.split(' ')[1];
  if (!activeAdminSessions.has(token)) {
    return res.status(401).json({ error: 'Invalid or expired admin session token.' });
  }
  next();
}

// ----------------------------------------------------
// PUBLIC API ENDPOINTS
// ----------------------------------------------------

app.get('/api/health', async (_req, res) => {
  const currentEnv = getAppEnv(store.getSettings().appEnv);
  const razorpayHealth = await checkRazorpayHealth(currentEnv);
  res.json({
    status: 'ok',
    symposium: 'EVITRON 2K26',
    timestamp: new Date().toISOString(),
    environment: currentEnv,
    razorpay: {
      environment: currentEnv,
      status: razorpayHealth.status,
      connected: razorpayHealth.status === 'CONNECTED',
      liveConnected: razorpayHealth.liveConnected,
      testConnected: razorpayHealth.testConnected,
      keyMode: razorpayHealth.keyMode,
      keyIdPrefix: razorpayHealth.keyIdPrefix,
      details: razorpayHealth.details,
    },
  });
});

// GET site settings
app.get('/api/settings', async (_req, res) => {
  const settings = store.getSettings();
  const currentEnv = getAppEnv(settings.appEnv);
  let upiQrImage = settings.upiQrImageUrl;

  // Auto-generate dynamic QR code data URL for UPI if none is custom-uploaded
  if (!upiQrImage && settings.upiId) {
    const sampleUri = buildUpiUri(settings.upiId, settings.upiPayeeName, settings.feePerPerson, 'EVITRON 2K26 Registration');
    upiQrImage = await generateQrDataUrl(sampleUri);
  }

  const razorpayHealth = await checkRazorpayHealth(currentEnv);

  res.json({
    ...settings,
    appEnv: currentEnv,
    upiQrImageUrl: upiQrImage,
    razorpayKeyId: razorpayHealth.status === 'CONNECTED' ? getRazorpayKeyId() : '',
    razorpayConnected: razorpayHealth.status === 'CONNECTED',
    razorpayLiveConnected: razorpayHealth.liveConnected,
    razorpayTestConnected: razorpayHealth.testConnected,
    razorpayStatus: razorpayHealth.status,
    razorpayStatusDetails: razorpayHealth.details,
    razorpayKeyMode: razorpayHealth.keyMode,
  });
});

// GET all active events
app.get('/api/events', (_req, res) => {
  const events = store.getEvents().filter((e) => e.isActive);
  res.json(events);
});

// GET single event by slug
app.get('/api/events/:slug', (req, res) => {
  const event = store.getEventBySlug(req.params.slug);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  res.json(event);
});

// VALIDATION HELPER FOR REGISTRATION RULES
function validateRegistrationRules(body: {
  registrationType: 'workshop' | 'technical';
  selectedWorkshopId?: string;
  selectedTechnicalIds?: string[];
  selectedNonTechnicalIds?: string[];
  participants: Participant[];
}) {
  const settings = store.getSettings();
  if (!settings.isRegistrationOpen) {
    return { valid: false, status: 403, error: settings.closedReason || 'Registrations are currently closed.' };
  }

  const { registrationType, selectedWorkshopId, selectedTechnicalIds = [], selectedNonTechnicalIds = [], participants } = body;

  if (!participants || !Array.isArray(participants)) {
    return { valid: false, status: 400, error: 'Invalid participants list.' };
  }

  // Check every participant has required fields
  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];
    if (!p.fullName?.trim() || !p.email?.trim() || !p.phone?.trim() || !p.college?.trim()) {
      return { valid: false, status: 400, error: `Participant #${i + 1} has incomplete details (Name, Email, Phone, and College are required).` };
    }
    // Basic email format check
    if (!p.email.includes('@') || !p.email.includes('.')) {
      return { valid: false, status: 400, error: `Invalid email address for participant #${i + 1}: ${p.email}` };
    }
    // Mobile number check (at least 10 digits)
    const digits = p.phone.replace(/\D/g, '');
    if (digits.length < 10) {
      return { valid: false, status: 400, error: `Please enter a valid 10-digit mobile number for participant #${i + 1}.` };
    }
  }

  // RULE 1: WORKSHOP
  if (registrationType === 'workshop') {
    if (!selectedWorkshopId) {
      return { valid: false, status: 400, error: 'Please select a workshop.' };
    }
    // Cannot select technical or non-technical
    if (selectedTechnicalIds.length > 0 || selectedNonTechnicalIds.length > 0) {
      return { valid: false, status: 400, error: 'Workshop participants cannot register for technical or non-technical events.' };
    }
    // Team size must be exactly 1
    if (participants.length !== 1) {
      return { valid: false, status: 400, error: 'Workshop registration is individual (strictly 1 participant).' };
    }
    return { valid: true, expectedAmount: 350 };
  }

  // RULE 2 & 3: TECHNICAL & NON-TECHNICAL
  if (registrationType === 'technical') {
    // Strictly 1 technical event
    if (selectedTechnicalIds.length === 0) {
      return {
        valid: false,
        status: 400,
        error: 'Please select strictly 1 technical event. Non-technical events cannot be selected alone.',
      };
    }
    if (selectedTechnicalIds.length > 1) {
      return {
        valid: false,
        status: 400,
        error: 'Strictly only 1 technical event can be selected.',
      };
    }

    // At most 1 non-technical event
    if (selectedNonTechnicalIds.length > 1) {
      return {
        valid: false,
        status: 400,
        error: 'Strictly at most 1 non-technical event can be selected.',
      };
    }

    // Must NOT have a workshop selected
    if (selectedWorkshopId) {
      return { valid: false, status: 400, error: 'Cannot mix workshop and technical symposium registration.' };
    }

    // Team size must be EXACTLY 3 participants
    if (participants.length !== 3) {
      return {
        valid: false,
        status: 400,
        error: `Every technical symposium registration requires exactly 3 participants per team (Team Leader + 2 Members). You provided ${participants.length}.`,
      };
    }

    // Fee is ₹1050 for the 3-person team
    return { valid: true, expectedAmount: 1050 };
  }

  return { valid: false, status: 400, error: 'Invalid registration category.' };
}

// POST create-order (Razorpay)
app.post('/api/create-order', async (req, res) => {
  try {
    const validation = validateRegistrationRules(req.body);
    if (!validation.valid) {
      return res.status(validation.status || 400).json({ error: validation.error });
    }

    const currentEnv = getAppEnv(store.getSettings().appEnv);
    const amount = validation.expectedAmount || 350;
    const receipt = `rcpt_${Date.now()}`;
    const order = await createOrder(
      amount,
      receipt,
      {
        type: req.body.registrationType,
        lead_email: req.body.participants[0]?.email || '',
      },
      currentEnv
    );

    res.json({
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      keyId: order.keyId,
    });
  } catch (err: any) {
    console.error('Create order failed:', err.message || err);
    res.status(400).json({ error: err.message || 'Failed to create payment order with Razorpay Gateway.' });
  }
});

// POST verify-payment (Razorpay completion)
app.post('/api/verify-payment', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      registrationData,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment proof tokens (order_id, payment_id, or signature).' });
    }

    // 1. Cryptographic HMAC SHA-256 Signature Verification
    const isHmacValid = verifyPaymentHmacSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isHmacValid) {
      return res.status(400).json({ error: 'Payment signature cryptographic verification failed. Transaction rejected.' });
    }

    // 2. Validate registration payload rules
    const validation = validateRegistrationRules(registrationData);
    if (!validation.valid) {
      return res.status(validation.status || 400).json({ error: validation.error });
    }

    const expectedAmount = validation.expectedAmount || 350;
    const currentEnv = getAppEnv(store.getSettings().appEnv);

    // 3. Server-side verification with Real Razorpay API
    const apiVerification = await fetchAndVerifyRazorpayPayment(
      razorpay_payment_id,
      razorpay_order_id,
      expectedAmount,
      currentEnv
    );

    if (!apiVerification.valid) {
      return res.status(400).json({
        error: `Razorpay API Payment Verification failed: ${apiVerification.error}`,
      });
    }

    // Idempotency check: if payment_id already exists, return existing registration
    const existing = store.getRegistrationByPaymentId(razorpay_payment_id);
    if (existing) {
      return res.json({ success: true, registrationId: existing.id, registration: existing });
    }

    // 4. ONLY AFTER BOTH CRYPTOGRAPHIC + API VERIFICATIONS SUCCEED: Create registration record
    const regId = store.generateUniqueRegistrationId();
    const newRecord: RegistrationRecord = {
      id: regId,
      createdAt: new Date().toISOString(),
      registrationType: registrationData.registrationType,
      selectedWorkshopId: registrationData.selectedWorkshopId,
      selectedTechnicalIds: registrationData.selectedTechnicalIds || [],
      selectedNonTechnicalIds: registrationData.selectedNonTechnicalIds || [],
      participants: registrationData.participants,
      teamLeader: registrationData.participants[0],
      totalAmount: expectedAmount,
      paymentMethod: 'razorpay',
      paymentStatus: 'paid',
      paymentId: razorpay_payment_id,
      attendanceMarked: false,
    };

    store.addRegistration(newRecord);

    // Resolve event titles for email & sheets
    const allEvents = store.getEvents();
    const eventTitles: string[] = [];
    if (newRecord.selectedWorkshopId) {
      const w = allEvents.find((e) => e.id === newRecord.selectedWorkshopId);
      if (w) eventTitles.push(`${w.title} (${w.tagline})`);
    }
    for (const tid of newRecord.selectedTechnicalIds) {
      const t = allEvents.find((e) => e.id === tid);
      if (t) eventTitles.push(t.title);
    }
    for (const nid of newRecord.selectedNonTechnicalIds) {
      const n = allEvents.find((e) => e.id === nid);
      if (n) eventTitles.push(n.title);
    }

    // Dispatch confirmation email & sync Google Sheet
    sendRegistrationConfirmationEmail(newRecord, eventTitles).catch((err) =>
      console.log('[NOTIFICATION] Async email dispatch status:', err?.message || err)
    );
    syncToGoogleSheetWebhook(newRecord, eventTitles).catch((err) =>
      console.log('[NOTIFICATION] Async sheets sync status:', err?.message || err)
    );

    res.json({
      success: true,
      registrationId: regId,
      registration: newRecord,
    });
  } catch (err: any) {
    console.error('Verify payment failed:', err.message || err);
    res.status(500).json({ error: err.message || 'Payment verification processing error.' });
  }
});

// POST register-upi (Manual UPI payment submission)
app.post('/api/register-upi', async (req, res) => {
  try {
    const { registrationData, upiReference } = req.body;

    if (!upiReference || upiReference.trim().length < 4) {
      return res.status(400).json({ error: 'Please enter a valid 12-digit UPI Transaction Reference (UTR) Number.' });
    }

    const validation = validateRegistrationRules(registrationData);
    if (!validation.valid) {
      return res.status(validation.status || 400).json({ error: validation.error });
    }

    const regId = store.generateUniqueRegistrationId();
    const newRecord: RegistrationRecord = {
      id: regId,
      createdAt: new Date().toISOString(),
      registrationType: registrationData.registrationType,
      selectedWorkshopId: registrationData.selectedWorkshopId,
      selectedTechnicalIds: registrationData.selectedTechnicalIds || [],
      selectedNonTechnicalIds: registrationData.selectedNonTechnicalIds || [],
      participants: registrationData.participants,
      teamLeader: registrationData.participants[0],
      totalAmount: validation.expectedAmount || 350,
      paymentMethod: 'upi',
      paymentStatus: 'pending_verification',
      upiReference: upiReference.trim(),
      driveScreenshotSubmitted: true,
      attendanceMarked: false,
    };

    store.addRegistration(newRecord);

    const allEvents = store.getEvents();
    const eventTitles: string[] = [];
    if (newRecord.selectedWorkshopId) {
      const w = allEvents.find((e) => e.id === newRecord.selectedWorkshopId);
      if (w) eventTitles.push(w.title);
    }
    for (const tid of newRecord.selectedTechnicalIds) {
      const t = allEvents.find((e) => e.id === tid);
      if (t) eventTitles.push(t.title);
    }
    for (const nid of newRecord.selectedNonTechnicalIds) {
      const n = allEvents.find((e) => e.id === nid);
      if (n) eventTitles.push(n.title);
    }

    sendRegistrationConfirmationEmail(newRecord, eventTitles).catch((err) =>
      console.log('[NOTIFICATION] Async email dispatch status:', err?.message || err)
    );
    syncToGoogleSheetWebhook(newRecord, eventTitles).catch((err) =>
      console.log('[NOTIFICATION] Async sheets sync status:', err?.message || err)
    );

    res.json({
      success: true,
      registrationId: regId,
      registration: newRecord,
    });
  } catch (err: any) {
    console.error('UPI registration failed:', err);
    res.status(500).json({ error: err.message || 'Failed to submit UPI registration.' });
  }
});

// POST Webhook from Razorpay
app.post('/api/webhook', (req: any, res) => {
  const webhookSignature = req.headers['x-razorpay-signature'];
  const rawBody = req.rawBody;

  if (process.env.RAZORPAY_WEBHOOK_SECRET) {
    if (!webhookSignature || !verifyWebhookSignature(rawBody, webhookSignature)) {
      return res.status(400).json({ error: 'Invalid webhook signature.' });
    }
  } else {
    console.log('[RAZORPAY WEBHOOK] RAZORPAY_WEBHOOK_SECRET is pending/not set. Skipping HMAC verification for event:', req.body?.event);
  }

  const payload = req.body;
  const event = payload.event;

  // Handle payment.captured
  if (event === 'payment.captured') {
    const payment = payload.payload?.payment?.entity;
    if (payment?.id) {
      const existing = store.getRegistrationByPaymentId(payment.id);
      if (existing) {
        // Idempotent: already handled
        return res.json({ status: 'ok', alreadyProcessed: true });
      }
    }
  }

  res.json({ status: 'ok' });
});

// GET single registration by Registration ID (for ticket verification & download)
app.get('/api/registration/:id', async (req, res) => {
  const reg = store.getRegistrationById(req.params.id);
  if (!reg) {
    return res.status(404).json({ error: 'Registration not found' });
  }

  // Resolve event names for full QR payload
  const allEvents = store.getEvents();
  const eventTitles: string[] = [];
  if (reg.selectedWorkshopId) {
    const w = allEvents.find((e) => e.id === reg.selectedWorkshopId);
    if (w) eventTitles.push(`${w.title} (${w.tagline})`);
  }
  for (const tid of reg.selectedTechnicalIds) {
    const t = allEvents.find((e) => e.id === tid);
    if (t) eventTitles.push(t.title);
  }
  for (const nid of reg.selectedNonTechnicalIds) {
    const n = allEvents.find((e) => e.id === nid);
    if (n) eventTitles.push(n.title);
  }

  const trackLabel =
    reg.registrationType === 'workshop'
      ? 'Hands-on Workshop Track (Individual)'
      : 'National Technical Symposium Track (Team of 3)';

  // Build real attendee QR code containing full details for instant attendance scanning
  const qrText = buildAttendeeQrText({
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
  });

  const qrDataUrl = await generateQrDataUrl(qrText);

  res.json({
    ...reg,
    qrDataUrl,
    qrText,
  });
});

// POST Mark Attendance (for event-day scanner / Android app)
app.post('/api/attendance/mark', (req, res) => {
  const { registrationId } = req.body;
  if (!registrationId) {
    return res.status(400).json({ error: 'Registration ID is required.' });
  }

  // Handle both raw ID (e.g. EV26-ABC123) and full scanned QR text containing Registration ID: EV26-ABC123
  const match = String(registrationId).match(/EV26-[A-Z0-9]{6}/i);
  const cleanId = match ? match[0].toUpperCase() : String(registrationId).trim().toUpperCase();

  const result = store.markAttendance(cleanId);
  if (!result.success) {
    return res.status(404).json(result);
  }
  res.json(result);
});

// ----------------------------------------------------
// ADMIN API ENDPOINTS
// ----------------------------------------------------

// POST admin login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  const isMatch = store.verifyAdminPassword(password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Incorrect administrator password.' });
  }

  // Generate session token
  const token = crypto.randomBytes(32).toString('hex');
  activeAdminSessions.add(token);

  res.json({
    success: true,
    token,
    message: 'Admin authentication successful.',
  });
});

// GET admin dashboard stats
app.get('/api/admin/stats', requireAdmin, (_req, res) => {
  const registrations = store.getRegistrations();
  const totalRegistrations = registrations.length;
  let totalParticipants = 0;
  let workshopCount = 0;
  let technicalCount = 0;
  let paidCount = 0;
  let pendingCount = 0;
  const eventCounts: Record<string, number> = {};

  for (const r of registrations) {
    totalParticipants += r.participants.length;
    if (r.registrationType === 'workshop') {
      workshopCount++;
      if (r.selectedWorkshopId) {
        eventCounts[r.selectedWorkshopId] = (eventCounts[r.selectedWorkshopId] || 0) + 1;
      }
    } else {
      technicalCount++;
      for (const tid of r.selectedTechnicalIds) {
        eventCounts[tid] = (eventCounts[tid] || 0) + 1;
      }
      for (const nid of r.selectedNonTechnicalIds) {
        eventCounts[nid] = (eventCounts[nid] || 0) + 1;
      }
    }

    if (r.paymentStatus === 'paid') paidCount++;
    else if (r.paymentStatus === 'pending_verification') pendingCount++;
  }

  res.json({
    totalRegistrations,
    totalParticipants,
    workshopCount,
    technicalCount,
    paidCount,
    pendingCount,
    eventCounts,
    recentRegistrations: registrations.slice(0, 10),
  });
});

// GET all registrations with filtering
app.get('/api/admin/registrations', requireAdmin, (req, res) => {
  let registrations = store.getRegistrations();
  const { type, status, search } = req.query as { type?: string; status?: string; search?: string };

  if (type) {
    registrations = registrations.filter((r) => r.registrationType === type);
  }
  if (status) {
    registrations = registrations.filter((r) => r.paymentStatus === status);
  }
  if (search) {
    const q = search.toLowerCase();
    registrations = registrations.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.teamLeader.fullName.toLowerCase().includes(q) ||
        r.teamLeader.email.toLowerCase().includes(q) ||
        r.teamLeader.phone.includes(q) ||
        r.teamLeader.college.toLowerCase().includes(q) ||
        r.participants.some((p) => p.fullName.toLowerCase().includes(q))
    );
  }

  res.json(registrations);
});

// PATCH registration status (e.g. approve UPI payment)
app.patch('/api/admin/registrations/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  if (!['paid', 'pending_verification', 'failed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const updated = store.updateRegistration(req.params.id, { paymentStatus: status });
  if (!updated) {
    return res.status(404).json({ error: 'Registration not found' });
  }
  res.json(updated);
});

// PATCH or PUT site settings (UPI, registration open/closed toggle, announcement, environment, etc.)
const handleUpdateSettings = (req: express.Request, res: express.Response) => {
  const updated = store.updateSettings(req.body);
  res.json(updated);
};
app.patch('/api/admin/settings', requireAdmin, handleUpdateSettings);
app.put('/api/admin/settings', requireAdmin, handleUpdateSettings);

// PATCH event coordinator / details
app.patch('/api/admin/events/:id', requireAdmin, (req, res) => {
  const updated = store.updateEvent(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Event not found' });
  }
  res.json(updated);
});

// GET email audit queue for admin inspection
app.get('/api/admin/emails', requireAdmin, (_req, res) => {
  res.json(emailAuditLog);
});

// GET export registrations to CSV (instant spreadsheet format)
app.get('/api/admin/export-spreadsheet', requireAdmin, (_req, res) => {
  const registrations = store.getRegistrations();
  const allEvents = store.getEvents();

  const headers = [
    'Registration ID',
    'Registered At',
    'Category',
    'Registered Events',
    'Team Leader Name',
    'Leader Email',
    'Leader Phone',
    'Leader College',
    'Leader Department',
    'Leader Year',
    'Total Members',
    'Member 2 Details',
    'Member 3 Details',
    'Total Fee (INR)',
    'Payment Method',
    'Payment Status',
    'Payment Ref / UTR',
    'Attendance Marked',
  ];

  const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const rows = registrations.map((r) => {
    const eventTitles: string[] = [];
    if (r.selectedWorkshopId) {
      const w = allEvents.find((e) => e.id === r.selectedWorkshopId);
      if (w) eventTitles.push(w.title);
    }
    for (const tid of r.selectedTechnicalIds) {
      const t = allEvents.find((e) => e.id === tid);
      if (t) eventTitles.push(t.title);
    }
    for (const nid of r.selectedNonTechnicalIds) {
      const n = allEvents.find((e) => e.id === nid);
      if (n) eventTitles.push(n.title);
    }

    return [
      escapeCsv(r.id),
      escapeCsv(r.createdAt),
      escapeCsv(r.registrationType === 'workshop' ? 'Workshop' : 'Symposium (Team of 3)'),
      escapeCsv(eventTitles.join('; ')),
      escapeCsv(r.teamLeader.fullName),
      escapeCsv(r.teamLeader.email),
      escapeCsv(r.teamLeader.phone),
      escapeCsv(r.teamLeader.college),
      escapeCsv(r.teamLeader.department),
      escapeCsv(r.teamLeader.year),
      escapeCsv(r.participants.length),
      escapeCsv(r.participants[1] ? `${r.participants[1].fullName} (${r.participants[1].phone} - ${r.participants[1].college})` : 'N/A'),
      escapeCsv(r.participants[2] ? `${r.participants[2].fullName} (${r.participants[2].phone} - ${r.participants[2].college})` : 'N/A'),
      escapeCsv(r.totalAmount),
      escapeCsv(r.paymentMethod.toUpperCase()),
      escapeCsv(r.paymentStatus.toUpperCase()),
      escapeCsv(r.paymentId || r.upiReference || ''),
      escapeCsv(r.attendanceMarked ? 'YES' : 'NO'),
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="EVITRON_2K26_Registrations.csv"');
  res.status(200).send(csvContent);
});

// POST trigger manual sync of all registrations to Google Sheets Webhook
app.post('/api/admin/sync-google-sheet', requireAdmin, async (_req, res) => {
  const webhookUrl = DEFAULT_GOOGLE_SHEET_WEBHOOK_URL;
  const registrations = store.getRegistrations();
  const allEvents = store.getEvents();

  if (!webhookUrl) {
    return res.status(400).json({
      error: 'GOOGLE_SHEET_WEBHOOK_URL is not configured in environment variables. You can download the spreadsheet via the CSV export button.',
      count: registrations.length,
    });
  }

  let successCount = 0;
  for (const r of registrations) {
    const eventTitles: string[] = [];
    if (r.selectedWorkshopId) {
      const w = allEvents.find((e) => e.id === r.selectedWorkshopId);
      if (w) eventTitles.push(w.title);
    }
    for (const tid of r.selectedTechnicalIds) {
      const t = allEvents.find((e) => e.id === tid);
      if (t) eventTitles.push(t.title);
    }
    for (const nid of r.selectedNonTechnicalIds) {
      const n = allEvents.find((e) => e.id === nid);
      if (n) eventTitles.push(n.title);
    }

    try {
      await syncToGoogleSheetWebhook(r, eventTitles);
      successCount++;
    } catch {}
  }

  res.json({
    success: true,
    message: `Successfully synchronized ${successCount} registrations to Google Sheet webhook.`,
  });
});


// ----------------------------------------------------
// VITE MIDDLEWARE / STATIC ASSETS
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`EVITRON 2K26 backend server running on http://0.0.0.0:${PORT}`);
    const currentEnv = getAppEnv(store.getSettings().appEnv);
    const health = await checkRazorpayHealth(currentEnv);
    console.log(`[GATEWAY] Environment: ${currentEnv.toUpperCase()} | Razorpay: ${health.keyMode} (${health.status})`);
  });
}

if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  startServer();
}

export default app;
