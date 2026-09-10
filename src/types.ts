export type EventCategory = 'workshops' | 'technical' | 'non-technical';

export interface FAQItem {
  q: string;
  a: string;
}

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  category: EventCategory;
  description: string;
  venue: string;
  time: string;
  date: string;
  eligibility: string;
  teamSize: number; // 1 for workshops, 3 for technical, 3 for non-technical team
  teamSizeLabel: string;
  feePerPerson: number;
  rules: string[];
  procedure: string[];
  perks: string[];
  outcomes: string[];
  certificates: string;
  importantInstructions: string[];
  faqs: FAQItem[];
  coordinatorName: string;
  coordinatorPhone: string;
  coordinatorEmail: string;
  isActive: boolean;
}

export interface Participant {
  fullName: string;
  email: string;
  phone: string;
  college: string;
  department?: string;
  year?: string;
}

export interface RegistrationRecord {
  id: string; // e.g. EV26-XXXXXX
  createdAt: string;
  registrationType: 'workshop' | 'technical';
  selectedWorkshopId?: string;
  selectedTechnicalIds: string[];
  selectedNonTechnicalIds: string[];
  participants: Participant[]; // 1 for workshop, exactly 3 for technical
  teamLeader: Participant;
  totalAmount: number;
  paymentMethod: 'razorpay' | 'upi';
  paymentStatus: 'paid' | 'pending_verification' | 'failed';
  paymentId?: string;
  upiReference?: string;
  driveScreenshotSubmitted?: boolean;
  attendanceMarked: boolean;
  attendanceTimestamp?: string;
}

export interface SiteSettings {
  symposiumTitle: string;
  subTitle: string;
  department: string;
  college: string;
  associations: string;
  eventDate: string;
  countdownTarget: string; // ISO or date string e.g. '2026-10-08T09:00:00'
  registrationDeadline: string;
  paperSubmissionDeadline: string;
  isRegistrationOpen: boolean;
  closedReason?: string;
  upiId: string;
  upiPayeeName: string;
  upiQrImageUrl: string;
  driveUploadUrl: string;
  contactEmail: string;
  instagramHandle: string;
  venue: string;
  announcementText: string;
  announcementActive: boolean;
  feePerPerson: number;
  appEnv: 'development' | 'production';
  razorpayKeyId?: string;
  razorpayConnected?: boolean;
  razorpayLiveConnected?: boolean;
  razorpayTestConnected?: boolean;
  razorpayStatus?: 'CONNECTED' | 'NOT CONNECTED';
  razorpayStatusDetails?: string;
  razorpayKeyMode?: 'LIVE' | 'TEST' | 'NONE';
}
