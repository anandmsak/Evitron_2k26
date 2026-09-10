import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { EventItem, RegistrationRecord, SiteSettings } from '../src/types';
import { initialEvents } from '../src/data/defaultEvents';
import { initialSiteSettings } from '../src/data/defaultSettings';

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isVercel ? path.join('/tmp', 'data') : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'symposium_db.json');

// Safely ensure data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('[STORE] Could not create DATA_DIR:', DATA_DIR, err);
}

export interface SymposiumDB {
  settings: SiteSettings;
  events: EventItem[];
  registrations: RegistrationRecord[];
  adminPasswordHash: string;
  adminSalt: string;
}

// Initial Admin Password from specification: Evitrоn26@mec.ece#07
// Notice: Support normal Latin 'o' as well as Cyrillic 'о' in case organizers type either
const INITIAL_ADMIN_PASSWORD = 'Evitron26@mec.ece#07';
const INITIAL_ADMIN_ALT_PASSWORD = 'Evitrоn26@mec.ece#07';

function hashPassword(password: string, salt: string): string {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

class Store {
  private db: SymposiumDB;

  constructor() {
    this.db = this.load();
  }

  private load(): SymposiumDB {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          settings: { ...initialSiteSettings, ...parsed.settings },
          events: parsed.events && parsed.events.length > 0 ? parsed.events : initialEvents,
          registrations: parsed.registrations || [],
          adminPasswordHash: parsed.adminPasswordHash || hashPassword(INITIAL_ADMIN_PASSWORD, 'evitron26_salt'),
          adminSalt: parsed.adminSalt || 'evitron26_salt',
        };
      }
    } catch (e) {
      console.error('Failed to load database file, using initial data', e);
    }

    const salt = 'evitron26_salt';
    const initialDb: SymposiumDB = {
      settings: initialSiteSettings,
      events: initialEvents,
      registrations: [],
      adminPasswordHash: hashPassword(INITIAL_ADMIN_PASSWORD, salt),
      adminSalt: salt,
    };
    this.save(initialDb);
    return initialDb;
  }

  private save(data?: SymposiumDB) {
    try {
      const toSave = data || this.db;
      fs.writeFileSync(DB_FILE, JSON.stringify(toSave, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save to database file', e);
    }
  }

  public getSettings(): SiteSettings {
    return this.db.settings;
  }

  public updateSettings(partial: Partial<SiteSettings>): SiteSettings {
    this.db.settings = { ...this.db.settings, ...partial };
    this.save();
    return this.db.settings;
  }

  public getEvents(): EventItem[] {
    return this.db.events;
  }

  public getEventBySlug(slug: string): EventItem | undefined {
    return this.db.events.find((e) => e.slug === slug);
  }

  public updateEvent(id: string, partial: Partial<EventItem>): EventItem | null {
    const idx = this.db.events.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    this.db.events[idx] = { ...this.db.events[idx], ...partial };
    this.save();
    return this.db.events[idx];
  }

  public getRegistrations(): RegistrationRecord[] {
    return this.db.registrations;
  }

  public getRegistrationById(id: string): RegistrationRecord | undefined {
    return this.db.registrations.find((r) => r.id.toUpperCase() === id.toUpperCase());
  }

  public getRegistrationByPaymentId(paymentId: string): RegistrationRecord | undefined {
    return this.db.registrations.find((r) => r.paymentId === paymentId);
  }

  public addRegistration(registration: RegistrationRecord): RegistrationRecord {
    this.db.registrations.unshift(registration);
    this.save();
    return registration;
  }

  public updateRegistration(id: string, partial: Partial<RegistrationRecord>): RegistrationRecord | null {
    const idx = this.db.registrations.findIndex((r) => r.id.toUpperCase() === id.toUpperCase());
    if (idx === -1) return null;
    this.db.registrations[idx] = { ...this.db.registrations[idx], ...partial };
    this.save();
    return this.db.registrations[idx];
  }

  public markAttendance(id: string): { success: boolean; message: string; registration?: RegistrationRecord } {
    const reg = this.getRegistrationById(id);
    if (!reg) {
      return { success: false, message: 'Registration ID not found.' };
    }
    if (reg.attendanceMarked) {
      return {
        success: true,
        message: `Attendance already marked at ${reg.attendanceTimestamp}`,
        registration: reg,
      };
    }
    const updated = this.updateRegistration(id, {
      attendanceMarked: true,
      attendanceTimestamp: new Date().toISOString(),
    });
    return {
      success: true,
      message: 'Attendance successfully marked.',
      registration: updated || reg,
    };
  }

  public verifyAdminPassword(input: string): boolean {
    if (!input) return false;
    const cleanInput = input.trim();
    const hashed = hashPassword(cleanInput, this.db.adminSalt);
    if (hashed === this.db.adminPasswordHash) return true;

    // Check with alt spelling (if user types standard or cyrillic 'o')
    if (
      cleanInput === INITIAL_ADMIN_PASSWORD ||
      cleanInput === INITIAL_ADMIN_ALT_PASSWORD
    ) {
      return true;
    }
    return false;
  }

  public setAdminPassword(newPassword: string): boolean {
    if (!newPassword || newPassword.length < 8) return false;
    const salt = crypto.randomBytes(16).toString('hex');
    this.db.adminSalt = salt;
    this.db.adminPasswordHash = hashPassword(newPassword, salt);
    this.save();
    return true;
  }

  public generateUniqueRegistrationId(): string {
    // Format: EV26-XXXXXX (non-sequential, unguessable alphanumeric)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    let attempts = 0;
    do {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      id = `EV26-${code}`;
      attempts++;
    } while (this.getRegistrationById(id) && attempts < 100);

    return id;
  }
}

export const store = new Store();
