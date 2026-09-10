import { SiteSettings } from '../types';

export const initialSiteSettings: SiteSettings = {
  symposiumTitle: 'EVITRON 2K26',
  subTitle: 'National Level Technical Symposium',
  department: 'Department of Electronics and Communication Engineering',
  college: 'Mahendra Engineering College (Autonomous)',
  associations: 'VELOCITY & IEEE',
  eventDate: '08/10/2026',
  countdownTarget: '2026-10-08T09:00:00',
  registrationDeadline: '01/10/2026',
  paperSubmissionDeadline: '27/09/2026',
  isRegistrationOpen: true,
  closedReason: 'Registrations are currently closed. Please contact event coordinators for further inquiries.',
  upiId: 'evitron26@mec',
  upiPayeeName: 'EVITRON 2K26 - MEC ECE',
  upiQrImageUrl: '', // dynamically generated or admin uploaded
  driveUploadUrl: 'https://drive.google.com/drive/folders/1c4zL3RdaMjO4yyZ2U8BNySsx0FhorA7i?usp=sharing',
  contactEmail: 'evitron26@gmail.com',
  instagramHandle: 'velocityecemec',
  venue: 'Mahendhirapuri, Mallasamudram (M), Namakkal (Dt), Tamil Nadu - 637 503',
  announcementText: 'Registrations are now live! Paper abstract submission deadline is 27/09/2026. Cash prizes, welcome kits, food and refreshments included.',
  announcementActive: true,
  feePerPerson: 350,
  appEnv: 'development',
};

export const defaultSettings = initialSiteSettings;

