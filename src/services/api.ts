import { EventItem, RegistrationRecord, SiteSettings } from '../types';
import { defaultSettings } from '../data/defaultSettings';
import { defaultEvents } from '../data/defaultEvents';
import QRCode from 'qrcode';

const metaEnv = (import.meta as any).env;
const API_BASE =
  metaEnv && metaEnv.VITE_API_BASE_URL
    ? (metaEnv.VITE_API_BASE_URL as string).replace(/\/$/, '')
    : '';

export const INITIAL_ADMIN_PASSWORD = 'Evitron26@mec.ece#07';
export const INITIAL_ADMIN_ALT_PASSWORD = 'Evitrоn26@mec.ece#07'; // Cyrillic 'о' variant

const GOOGLE_SHEET_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbwQFDmE-3bG517qhy5jP6my90QCKsps5GLn2q7ih3vHJmTq96PikBitSCJgIqyxOqRoaQ/exec';

// Safely parse JSON from fetch response without throwing syntax error on HTML (e.g. Vercel 404 pages)
async function parseJsonSafely(res: Response): Promise<{ isJson: boolean; data: any; rawText: string }> {
  try {
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return { isJson: true, data, rawText: text };
    } catch {
      return { isJson: false, data: null, rawText: text };
    }
  } catch {
    return { isJson: false, data: null, rawText: '' };
  }
}

// ----------------------------------------------------
// LOCAL STORAGE PERSISTENCE HELPERS (FOR STANDALONE / VERCEL STATIC MODE)
// ----------------------------------------------------

function getLocalRegistrations(): RegistrationRecord[] {
  try {
    const raw = localStorage.getItem('evitron_registrations');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalRegistrations(regs: RegistrationRecord[]): void {
  try {
    localStorage.setItem('evitron_registrations', JSON.stringify(regs));
  } catch (e) {
    console.warn('Could not save to localStorage:', e);
  }
}

function getLocalSettings(): SiteSettings {
  try {
    const raw = localStorage.getItem('evitron_site_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultSettings, ...parsed };
    }
  } catch {}
  return defaultSettings;
}

function saveLocalSettings(settings: SiteSettings): void {
  try {
    localStorage.setItem('evitron_site_settings', JSON.stringify(settings));
  } catch {}
}

function getLocalEvents(): EventItem[] {
  try {
    const raw = localStorage.getItem('evitron_events');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return defaultEvents;
}

function saveLocalEvents(events: EventItem[]): void {
  try {
    localStorage.setItem('evitron_events', JSON.stringify(events));
  } catch {}
}

// ----------------------------------------------------
// PUBLIC API ENDPOINTS
// ----------------------------------------------------

export async function fetchSiteSettings(): Promise<SiteSettings & { razorpayKeyId?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/settings`);
    const parsed = await parseJsonSafely(res);
    if (res.ok && parsed.isJson && parsed.data?.symposiumTitle) {
      saveLocalSettings(parsed.data);
      return parsed.data;
    }
  } catch (err) {
    console.warn('API /api/settings unreachable, using local configuration:', err);
  }
  return getLocalSettings();
}

export const fetchPublicSettings = fetchSiteSettings;

export async function fetchEvents(): Promise<EventItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/events`);
    const parsed = await parseJsonSafely(res);
    if (res.ok && parsed.isJson && Array.isArray(parsed.data) && parsed.data.length > 0) {
      saveLocalEvents(parsed.data);
      return parsed.data;
    }
  } catch (err) {
    console.warn('API /api/events unreachable, using local events catalogue:', err);
  }
  return getLocalEvents();
}

export const fetchPublicEvents = fetchEvents;

export async function fetchEventBySlug(slug: string): Promise<EventItem> {
  try {
    const res = await fetch(`${API_BASE}/api/events/${encodeURIComponent(slug)}`);
    const parsed = await parseJsonSafely(res);
    if (res.ok && parsed.isJson && parsed.data?.id) {
      return parsed.data;
    }
  } catch {}

  const localEvents = getLocalEvents();
  const event = localEvents.find((e) => e.slug === slug);
  if (!event) throw new Error('Event not found');
  return event;
}

export async function createOrder(payload: any): Promise<{
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}> {
  const res = await fetch(`${API_BASE}/api/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const parsed = await parseJsonSafely(res);
  if (res.ok && parsed.isJson) {
    return parsed.data;
  }
  throw new Error(parsed.data?.error || 'Failed to initialize payment gateway order');
}

export async function verifyPayment(payload: any): Promise<{
  success: boolean;
  registrationId: string;
  registration: RegistrationRecord;
}> {
  const res = await fetch(`${API_BASE}/api/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const parsed = await parseJsonSafely(res);
  if (res.ok && parsed.isJson) {
    // Save copy in local storage
    if (parsed.data?.registration) {
      const existing = getLocalRegistrations();
      const updated = [parsed.data.registration, ...existing.filter((r) => r.id !== parsed.data.registration.id)];
      saveLocalRegistrations(updated);
    }
    return parsed.data;
  }
  throw new Error(parsed.data?.error || 'Payment verification failed');
}

export async function submitUpiRegistration(payload: any): Promise<{
  success: boolean;
  registrationId: string;
  registration: RegistrationRecord;
}> {
  try {
    const res = await fetch(`${API_BASE}/api/register-upi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const parsed = await parseJsonSafely(res);
    if (res.ok && parsed.isJson && parsed.data?.registrationId) {
      // Store local backup
      if (parsed.data?.registration) {
        const existing = getLocalRegistrations();
        const updated = [parsed.data.registration, ...existing.filter((r) => r.id !== parsed.data.registration.id)];
        saveLocalRegistrations(updated);
      }
      return parsed.data;
    }
    if (parsed.isJson && parsed.data?.error) {
      throw new Error(parsed.data.error);
    }
  } catch (err: any) {
    // If it was an explicit validation error from backend, rethrow it
    if (err.message && !err.message.includes('Unexpected') && !err.message.includes('fetch')) {
      throw err;
    }
    console.warn('Backend /api/register-upi unreachable, submitting in standalone direct mode:', err);
  }

  // Standalone Direct Mode fallback for Vercel static deployments
  const cleanId = `EV26-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const now = new Date().toISOString();

  const newReg: RegistrationRecord = {
    id: cleanId,
    createdAt: now,
    registrationType: payload.registrationType,
    selectedWorkshopId: payload.selectedWorkshopId,
    selectedTechnicalIds: payload.selectedTechnicalIds || [],
    selectedNonTechnicalIds: payload.selectedNonTechnicalIds || [],
    teamLeader: payload.teamLeader,
    participants: payload.participants || [payload.teamLeader],
    totalAmount: payload.totalAmount || (payload.registrationType === 'workshop' ? 350 : 1050),
    paymentMethod: 'upi',
    paymentStatus: 'pending_verification',
    upiReference: payload.upiReference,
    attendanceMarked: false,
  };

  const existing = getLocalRegistrations();
  saveLocalRegistrations([newReg, ...existing]);

  // Sync to Google Sheet webhook directly from browser
  try {
    const allEvents = getLocalEvents();
    const eventTitles: string[] = [];
    if (newReg.selectedWorkshopId) {
      const w = allEvents.find((e) => e.id === newReg.selectedWorkshopId);
      if (w) eventTitles.push(w.title);
    }
    for (const tid of newReg.selectedTechnicalIds) {
      const t = allEvents.find((e) => e.id === tid);
      if (t) eventTitles.push(t.title);
    }
    for (const nid of newReg.selectedNonTechnicalIds) {
      const n = allEvents.find((e) => e.id === nid);
      if (n) eventTitles.push(n.title);
    }

    const sheetPayload = {
      regId: newReg.id,
      createdAt: newReg.createdAt,
      track: newReg.registrationType,
      events: eventTitles.join(', '),
      leaderName: newReg.teamLeader.fullName,
      leaderEmail: newReg.teamLeader.email,
      leaderPhone: newReg.teamLeader.phone,
      college: newReg.teamLeader.college,
      department: newReg.teamLeader.department,
      year: newReg.teamLeader.year,
      participantsCount: newReg.participants.length,
      member2: newReg.participants[1] ? `${newReg.participants[1].fullName} (${newReg.participants[1].phone})` : '',
      member3: newReg.participants[2] ? `${newReg.participants[2].fullName} (${newReg.participants[2].phone})` : '',
      amount: newReg.totalAmount,
      paymentMethod: newReg.paymentMethod,
      paymentStatus: newReg.paymentStatus,
      paymentRef: newReg.upiReference || '',
      attendance: 'Absent',
    };

    fetch(GOOGLE_SHEET_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sheetPayload),
    }).catch(() => {});
  } catch {}

  return {
    success: true,
    registrationId: cleanId,
    registration: newReg,
  };
}

export async function fetchRegistrationById(id: string): Promise<RegistrationRecord & { qrDataUrl: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/registration/${encodeURIComponent(id)}`);
    const parsed = await parseJsonSafely(res);
    if (res.ok && parsed.isJson && parsed.data?.id) {
      return parsed.data;
    }
  } catch {}

  // Check local registrations
  const localRegs = getLocalRegistrations();
  const reg = localRegs.find((r) => r.id.toUpperCase() === id.toUpperCase());
  if (reg) {
    const qrDataUrl = await QRCode.toDataURL(`Registration ID: ${reg.id}\nLeader: ${reg.teamLeader.fullName}`, {
      width: 256,
      margin: 1,
    });
    return { ...reg, qrDataUrl };
  }

  throw new Error('Registration record not found.');
}

export async function markAttendanceApi(id: string): Promise<{
  success: boolean;
  message: string;
  registration?: RegistrationRecord;
}> {
  try {
    const res = await fetch(`${API_BASE}/api/attendance/mark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationId: id }),
    });
    const parsed = await parseJsonSafely(res);
    if (res.ok && parsed.isJson) {
      return parsed.data;
    }
  } catch {}

  // Local fallback
  const localRegs = getLocalRegistrations();
  const match = String(id).match(/EV26-[A-Z0-9]{6}/i);
  const cleanId = match ? match[0].toUpperCase() : String(id).trim().toUpperCase();
  const idx = localRegs.findIndex((r) => r.id.toUpperCase() === cleanId);

  if (idx !== -1) {
    localRegs[idx].attendanceMarked = true;
    localRegs[idx].attendanceTimestamp = new Date().toISOString();
    saveLocalRegistrations(localRegs);
    return {
      success: true,
      message: `Attendance marked successfully for ${localRegs[idx].teamLeader.fullName} (${cleanId}).`,
      registration: localRegs[idx],
    };
  }

  throw new Error(`Registration ID "${cleanId}" not found in database.`);
}

// ----------------------------------------------------
// ADMIN API CALLS WITH ZERO-CRASH LOCAL FALLBACK
// ----------------------------------------------------

export async function adminLogin(password: string): Promise<{ success: boolean; token: string }> {
  const cleanInput = (password || '').trim();
  if (!cleanInput) {
    throw new Error('Please enter administrator password.');
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: cleanInput }),
    });

    const parsed = await parseJsonSafely(res);
    if (parsed.isJson) {
      if (res.ok && parsed.data?.token) {
        return { success: true, token: parsed.data.token };
      }
      if (res.status === 401 || parsed.data?.error) {
        throw new Error(parsed.data.error || 'Incorrect administrator password.');
      }
    }
  } catch (err: any) {
    // If it was an intentional rejection from the API server, rethrow!
    if (err.message && (err.message.includes('Incorrect') || err.message.includes('Password required'))) {
      throw err;
    }
    console.warn('Backend login endpoint unavailable or returned non-JSON. Verifying credentials client-side:', err);
  }

  // Client-side authentication fallback (for Vercel static deployments or offline portal)
  const savedPassword = localStorage.getItem('evitron_admin_password');
  const isMatch =
    cleanInput === INITIAL_ADMIN_PASSWORD ||
    cleanInput === INITIAL_ADMIN_ALT_PASSWORD ||
    (savedPassword && cleanInput === savedPassword);

  if (isMatch) {
    const localToken = `evitron_local_${Math.random().toString(36).substring(2)}_${Date.now().toString(36)}`;
    return { success: true, token: localToken };
  }

  throw new Error('Incorrect administrator password. Please check your credentials.');
}

export async function fetchAdminStats(token: string): Promise<any> {
  if (!token.startsWith('evitron_local_')) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const parsed = await parseJsonSafely(res);
      if (res.ok && parsed.isJson) {
        return parsed.data;
      }
    } catch {}
  }

  // Calculate stats from local storage
  const registrations = getLocalRegistrations();
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

  return {
    totalRegistrations: registrations.length,
    totalParticipants,
    workshopCount,
    technicalCount,
    paidCount,
    pendingCount,
    eventCounts,
    recentRegistrations: registrations.slice(0, 10),
  };
}

export async function fetchAdminRegistrations(token: string, query = ''): Promise<RegistrationRecord[]> {
  if (!token.startsWith('evitron_local_')) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/registrations${query ? `?${query}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const parsed = await parseJsonSafely(res);
      if (res.ok && parsed.isJson && Array.isArray(parsed.data)) {
        return parsed.data;
      }
    } catch {}
  }

  // Filter local registrations
  let regs = getLocalRegistrations();
  const params = new URLSearchParams(query);
  const type = params.get('type');
  const status = params.get('status');
  const search = params.get('search')?.toLowerCase();

  if (type) regs = regs.filter((r) => r.registrationType === type);
  if (status) regs = regs.filter((r) => r.paymentStatus === status);
  if (search) {
    regs = regs.filter(
      (r) =>
        r.id.toLowerCase().includes(search) ||
        r.teamLeader.fullName.toLowerCase().includes(search) ||
        r.teamLeader.email.toLowerCase().includes(search) ||
        r.teamLeader.college.toLowerCase().includes(search) ||
        (r.upiReference && r.upiReference.toLowerCase().includes(search))
    );
  }

  return regs;
}

export async function updateRegistrationStatus(
  token: string,
  id: string,
  status: 'paid' | 'pending_verification' | 'failed'
): Promise<RegistrationRecord> {
  // Update in local store
  const localRegs = getLocalRegistrations();
  const idx = localRegs.findIndex((r) => r.id === id);
  let updatedRecord: RegistrationRecord | null = null;
  if (idx !== -1) {
    localRegs[idx].paymentStatus = status;
    saveLocalRegistrations(localRegs);
    updatedRecord = localRegs[idx];
  }

  if (!token.startsWith('evitron_local_')) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/registrations/${id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      const parsed = await parseJsonSafely(res);
      if (res.ok && parsed.isJson) {
        return parsed.data;
      }
    } catch {}
  }

  if (updatedRecord) return updatedRecord;
  throw new Error('Registration not found to update status.');
}

export async function updateSiteSettings(token: string, updates: Partial<SiteSettings>): Promise<SiteSettings> {
  const current = getLocalSettings();
  const updated = { ...current, ...updates };
  saveLocalSettings(updated);

  if (!token.startsWith('evitron_local_')) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/settings`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      const parsed = await parseJsonSafely(res);
      if (res.ok && parsed.isJson) {
        return parsed.data;
      }
    } catch {}
  }

  return updated;
}

export async function updateEventDetails(
  token: string,
  eventId: string,
  updates: Partial<EventItem>
): Promise<EventItem> {
  const currentEvents = getLocalEvents();
  const idx = currentEvents.findIndex((e) => e.id === eventId);
  let updatedEvent: EventItem | null = null;

  if (idx !== -1) {
    currentEvents[idx] = { ...currentEvents[idx], ...updates };
    saveLocalEvents(currentEvents);
    updatedEvent = currentEvents[idx];
  }

  if (!token.startsWith('evitron_local_')) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      const parsed = await parseJsonSafely(res);
      if (res.ok && parsed.isJson) {
        return parsed.data;
      }
    } catch {}
  }

  if (updatedEvent) return updatedEvent;
  throw new Error('Event not found.');
}

export async function syncGoogleSheetsApi(token: string): Promise<{ success: boolean; message: string }> {
  if (!token.startsWith('evitron_local_')) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/sync-google-sheet`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const parsed = await parseJsonSafely(res);
      if (res.ok && parsed.isJson) {
        return parsed.data;
      }
      if (parsed.data?.error) throw new Error(parsed.data.error);
    } catch (e: any) {
      if (e.message && !e.message.includes('fetch') && !e.message.includes('Unexpected')) {
        throw e;
      }
    }
  }

  // Client-side batch sync to Google Sheet webhook
  const registrations = getLocalRegistrations();
  const allEvents = getLocalEvents();
  let count = 0;

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
      await fetch(GOOGLE_SHEET_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regId: r.id,
          createdAt: r.createdAt,
          track: r.registrationType,
          events: eventTitles.join(', '),
          leaderName: r.teamLeader.fullName,
          leaderEmail: r.teamLeader.email,
          leaderPhone: r.teamLeader.phone,
          college: r.teamLeader.college,
          department: r.teamLeader.department,
          year: r.teamLeader.year,
          participantsCount: r.participants.length,
          member2: r.participants[1] ? `${r.participants[1].fullName} (${r.participants[1].phone})` : '',
          member3: r.participants[2] ? `${r.participants[2].fullName} (${r.participants[2].phone})` : '',
          amount: r.totalAmount,
          paymentMethod: r.paymentMethod,
          paymentStatus: r.paymentStatus,
          paymentRef: r.paymentId || r.upiReference || '',
          attendance: r.attendanceMarked ? 'Present' : 'Absent',
        }),
      });
      count++;
    } catch {}
  }

  return {
    success: true,
    message: `Synchronized ${count} registration record(s) with Google Sheet webhook.`,
  };
}
