import React, { useState, useEffect } from 'react';
import {
  Lock,
  LogOut,
  Users,
  Wrench,
  Cpu,
  CreditCard,
  QrCode,
  Settings,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Search,
  RefreshCw,
  ExternalLink,
  Edit,
  Save,
  Check,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { EventItem, RegistrationRecord, SiteSettings } from '../types';
import {
  adminLogin,
  fetchAdminStats,
  fetchAdminRegistrations,
  updateRegistrationStatus,
  updateSiteSettings,
  updateEventDetails,
  markAttendanceApi,
  syncGoogleSheetsApi,
} from '../services/api';

interface AdminDashboardProps {
  initialSettings: SiteSettings;
  events: EventItem[];
  onRefreshEvents: () => void;
  onRefreshSettings: () => void;
  onNavigate: (path: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  initialSettings,
  events,
  onRefreshEvents,
  onRefreshSettings,
  onNavigate,
}) => {
  // Strict single-session security: never auto-restore token, always prompt for password on every visit
  const [token, setToken] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'registrations' | 'settings' | 'upi' | 'events' | 'attendance'>('overview');

  // Stats & Registrations
  const [stats, setStats] = useState<any>(null);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Auto-cleanup on unmount: navigating away locks portal immediately
  useEffect(() => {
    return () => {
      sessionStorage.removeItem('evitron_admin_token');
      localStorage.removeItem('evitron_admin_token');
    };
  }, []);

  // Background tab & inactivity auto-lockout protection
  useEffect(() => {
    if (!token) return;

    let visibilityTimer: any = null;
    let idleTimer: any = null;

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      // Auto-lockout after 10 minutes of complete inactivity
      idleTimer = setTimeout(() => {
        handleLogout();
      }, 10 * 60 * 1000);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // If tab is hidden or backgrounded for more than 5 seconds, automatically lock
        visibilityTimer = setTimeout(() => {
          handleLogout();
        }, 5000);
      } else {
        if (visibilityTimer) {
          clearTimeout(visibilityTimer);
          visibilityTimer = null;
        }
      }
    };

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((ev) => window.addEventListener(ev, resetIdleTimer, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);
    resetIdleTimer();

    return () => {
      activityEvents.forEach((ev) => window.removeEventListener(ev, resetIdleTimer));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimer) clearTimeout(visibilityTimer);
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [token]);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<SiteSettings>(initialSettings);
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');
  const [eventForm, setEventForm] = useState<Partial<EventItem>>({});

  // Attendance check state
  const [attendanceSearchId, setAttendanceSearchId] = useState('');
  const [attendanceResult, setAttendanceResult] = useState<any>(null);

  useEffect(() => {
    setSettingsForm(initialSettings);
  }, [initialSettings]);

  useEffect(() => {
    const current = events.find((e) => e.id === selectedEventId);
    if (current) {
      setEventForm({ ...current });
    }
  }, [selectedEventId, events]);

  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token, filterType, filterStatus]);

  const loadDashboardData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const statsData = await fetchAdminStats(token);
      setStats(statsData);

      let query = '';
      if (filterType) query += `type=${filterType}&`;
      if (filterStatus) query += `status=${filterStatus}&`;
      if (searchTerm) query += `search=${encodeURIComponent(searchTerm)}&`;

      const regData = await fetchAdminRegistrations(token, query);
      setRegistrations(regData);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('Unauthorized') || err.message?.includes('Invalid')) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await adminLogin(passwordInput);
      setToken(res.token);
      setPasswordInput('');
    } catch (err: any) {
      setLoginError(err.message || 'Incorrect organizer password.');
    }
  };

  const handleLogout = () => {
    setToken(null);
    setPasswordInput('');
    setRegistrations([]);
    setStats(null);
    sessionStorage.removeItem('evitron_admin_token');
    localStorage.removeItem('evitron_admin_token');
  };

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Toggle registration open/closed
  const handleToggleRegistration = async () => {
    if (!token) return;
    const newStatus = !settingsForm.isRegistrationOpen;
    try {
      const updated = await updateSiteSettings(token, { isRegistrationOpen: newStatus });
      setSettingsForm(updated);
      onRefreshSettings();
      showNotification(`Registrations are now ${newStatus ? 'OPEN' : 'CLOSED'}.`);
    } catch (err: any) {
      alert('Failed to update registration status: ' + err.message);
    }
  };

  // Save general site settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const updated = await updateSiteSettings(token, settingsForm);
      setSettingsForm(updated);
      onRefreshSettings();
      showNotification('Site settings updated successfully.');
    } catch (err: any) {
      alert('Failed to save settings: ' + err.message);
    }
  };

  // Save UPI & Payment settings
  const handleSaveUpiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const updated = await updateSiteSettings(token, {
        upiId: settingsForm.upiId,
        upiPayeeName: settingsForm.upiPayeeName,
        upiQrImageUrl: settingsForm.upiQrImageUrl,
        driveUploadUrl: settingsForm.driveUploadUrl,
      });
      setSettingsForm(updated);
      onRefreshSettings();
      showNotification('UPI & Payment settings updated successfully.');
    } catch (err: any) {
      alert('Failed to update UPI settings: ' + err.message);
    }
  };

  // Switch Development / Production environment
  const handleToggleEnvironment = async (newEnv: 'development' | 'production') => {
    if (!token) return;
    if (newEnv === 'production') {
      const confirmProd = window.confirm(
        'Switch to PRODUCTION mode?\n\nStrict Security Rule:\nProduction strictly requires real LIVE Razorpay credentials (rzp_live_...).\nTest keys (rzp_test_...) and simulations are strictly prohibited in production.\n\nProceed?'
      );
      if (!confirmProd) return;
    }
    try {
      const updated = await updateSiteSettings(token, { appEnv: newEnv });
      setSettingsForm(updated);
      onRefreshSettings();
      showNotification(`System switched to ${newEnv.toUpperCase()} mode.`);
    } catch (err: any) {
      alert('Failed to switch environment: ' + err.message);
    }
  };

  // Save event details
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedEventId) return;
    try {
      await updateEventDetails(token, selectedEventId, eventForm);
      onRefreshEvents();
      showNotification('Event coordinator & rules updated successfully.');
    } catch (err: any) {
      alert('Failed to update event: ' + err.message);
    }
  };

  // Verify / approve payment status
  const handleUpdateStatus = async (regId: string, newStatus: 'paid' | 'pending_verification' | 'failed') => {
    if (!token) return;
    try {
      await updateRegistrationStatus(token, regId, newStatus);
      loadDashboardData();
      showNotification(`Registration ${regId} marked as ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  // Check-in / mark attendance
  const handleMarkAttendance = async () => {
    if (!attendanceSearchId.trim()) return;
    try {
      const res = await markAttendanceApi(attendanceSearchId.trim());
      setAttendanceResult(res);
      loadDashboardData();
    } catch (err: any) {
      setAttendanceResult({ success: false, message: err.message });
    }
  };

  const [isSyncingSheets, setIsSyncingSheets] = useState(false);

  // Sync to Google Sheet Webhook
  const handleSyncGoogleSheets = async () => {
    if (!token) return;
    setIsSyncingSheets(true);
    try {
      const data = await syncGoogleSheetsApi(token);
      setActionNotice(data.message || 'Successfully synchronized registrations with Google Sheets!');
    } catch (err: any) {
      setActionNotice(err.message || 'Error syncing with Google Sheets.');
    } finally {
      setIsSyncingSheets(false);
      setTimeout(() => setActionNotice(null), 6000);
    }
  };

  // Export to CSV Spreadsheet
  const exportToCsv = () => {
    if (registrations.length === 0) return;
    const headers = [
      'Registration ID',
      'Created At',
      'Type',
      'Registered Events',
      'Leader Name',
      'Leader Email',
      'Leader Phone',
      'Leader College',
      'Leader Dept',
      'Leader Year',
      'Participant 2',
      'Participant 3',
      'Amount',
      'Method',
      'Payment Status',
      'Payment ID / UTR',
      'Attendance',
    ];

    const rows = registrations.map((r) => {
      const eventTitles: string[] = [];
      if (r.selectedWorkshopId) {
        const w = events.find((e) => e.id === r.selectedWorkshopId);
        if (w) eventTitles.push(w.title);
      }
      for (const tid of r.selectedTechnicalIds) {
        const t = events.find((e) => e.id === tid);
        if (t) eventTitles.push(t.title);
      }
      for (const nid of r.selectedNonTechnicalIds) {
        const n = events.find((e) => e.id === nid);
        if (n) eventTitles.push(n.title);
      }

      return [
        r.id,
        r.createdAt,
        r.registrationType,
        `"${eventTitles.join('; ')}"`,
        `"${r.teamLeader.fullName}"`,
        r.teamLeader.email,
        r.teamLeader.phone,
        `"${r.teamLeader.college}"`,
        `"${r.teamLeader.department || ''}"`,
        `"${r.teamLeader.year || ''}"`,
        r.participants[1] ? `"${r.participants[1].fullName} (${r.participants[1].phone} - ${r.participants[1].college})"` : 'N/A',
        r.participants[2] ? `"${r.participants[2].fullName} (${r.participants[2].phone} - ${r.participants[2].college})` : 'N/A',
        r.totalAmount,
        r.paymentMethod,
        r.paymentStatus,
        r.paymentId || r.upiReference || 'N/A',
        r.attendanceMarked ? 'YES' : 'NO',
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `EVITRON2K26_Registrations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If not logged in: Show organizer login screen
  if (!token) {
    return (
      <div className="py-16 max-w-md mx-auto px-4 min-h-[70vh] flex items-center justify-center">
        <div className="w-full bg-white border border-stone-200 rounded-xl p-6 sm:p-8 shadow-sm">
          <div className="text-center mb-6">
            <img
              src="/emblem.png"
              alt="EVITRON 2K26 Emblem"
              className="w-14 h-14 object-contain mx-auto mb-3 drop-shadow-xs"
              onError={(e) => {
                // Fallback to stylized emblem if image fails
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-[10px] font-semibold mx-auto mb-2">
              <Lock className="w-3 h-3 text-amber-600" />
              <span>Single-Session Security • Password Required Each Visit</span>
            </div>
            <h1 className="text-xl font-extrabold text-stone-900">Organizer Portal</h1>
            <p className="text-xs text-stone-500 mt-1">
              EVITRON 2K26 Administrative & Control Dashboard
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Organizer Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  autoFocus
                  autoComplete="current-password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#B22222]"
                />
                <Lock className="w-4 h-4 text-stone-400 absolute right-3 top-3" />
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                Strict single-use access. Session automatically terminates when leaving or logging out.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#B22222] hover:bg-[#961c1c] active:bg-[#7e1717] text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs"
            >
              Sign In to Dashboard
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-stone-100 text-center">
            <button
              onClick={() => onNavigate('/')}
              className="text-xs text-stone-500 hover:text-stone-800"
            >
              ← Return to public website
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Logged-in Admin Dashboard
  return (
    <div className="py-6 sm:py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[85vh]">
      {/* Top Banner & Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
              EVITRON 2K26 Admin Console
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
              {token?.startsWith('evitron_local_') ? 'Active Session (Direct Client Mode)' : 'Active Session (Live Cloud)'}
            </span>
          </div>
          <p className="text-xs text-stone-500">
            ECE Dept, Mahendra Engineering College • VELOCITY & IEEE
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Environment Switcher Pill */}
          <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-300 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => handleToggleEnvironment('development')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                settingsForm.appEnv === 'development'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${settingsForm.appEnv === 'development' ? 'bg-white animate-pulse' : 'bg-stone-400'}`} />
              TEST MODE
            </button>
            <button
              type="button"
              onClick={() => handleToggleEnvironment('production')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                settingsForm.appEnv === 'production'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${settingsForm.appEnv === 'production' ? 'bg-white animate-pulse' : 'bg-stone-400'}`} />
              PRODUCTION (LIVE)
            </button>
          </div>

          {/* Quick Registration Open / Closed toggle */}
          <button
            onClick={handleToggleRegistration}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              settingsForm.isRegistrationOpen
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-red-700 hover:bg-red-800 text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>Registrations: {settingsForm.isRegistrationOpen ? 'OPEN' : 'CLOSED'}</span>
          </button>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </div>

      {/* Action toast */}
      {actionNotice && (
        <div className="mb-4 p-3 bg-stone-900 text-white text-xs font-semibold rounded-lg shadow-md flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-stone-200 mb-6 text-xs font-bold">
        {[
          { key: 'overview', label: 'Overview & Metrics' },
          { key: 'registrations', label: `Registrations (${registrations.length})` },
          { key: 'upi', label: 'UPI & Payment Controls' },
          { key: 'events', label: 'Event Coordinators CMS' },
          { key: 'settings', label: 'Site Settings & Deadlines' },
          { key: 'attendance', label: 'Event-Day Scanner' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2.5 rounded-t-lg transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'bg-white text-[#B22222] border-t-2 border-x border-[#B22222] -mb-px'
                : 'text-stone-600 hover:text-stone-900 bg-stone-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Key KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
              <span className="text-stone-500 text-xs font-medium block">Total Registrations</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                {stats.totalRegistrations}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
              <span className="text-stone-500 text-xs font-medium block">Total Attendees</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#B22222]">
                {stats.totalParticipants}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
              <span className="text-stone-500 text-xs font-medium block">Workshops Count</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                {stats.workshopCount}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
              <span className="text-stone-500 text-xs font-medium block">Technical Teams</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                {stats.technicalCount}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment status breakdown */}
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-4">
                Payment Verification Status
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <span className="font-bold text-emerald-900">Paid & Confirmed</span>
                  <span className="text-base font-extrabold text-emerald-800">{stats.paidCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <span className="font-bold text-amber-900">Pending UPI Verification</span>
                  <span className="text-base font-extrabold text-amber-800">{stats.pendingCount}</span>
                </div>
              </div>
            </div>

            {/* Event Distribution */}
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-4">
                Event-Wise Distribution
              </h3>
              <div className="space-y-2 text-xs">
                {events.map((evt) => {
                  const count = stats.eventCounts?.[evt.id] || 0;
                  return (
                    <div key={evt.id} className="flex items-center justify-between py-1 border-b border-stone-100">
                      <span className="text-stone-700 font-medium truncate max-w-[240px]">{evt.title}</span>
                      <span className="font-mono font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded text-[11px]">
                        {count} registered
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REGISTRATIONS LIST */}
      {activeTab === 'registrations' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadDashboardData()}
                placeholder="Search by ID, name, email, phone, college..."
                className="w-full text-xs outline-none bg-transparent"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-md outline-none"
              >
                <option value="">All Categories</option>
                <option value="workshop">Workshops</option>
                <option value="technical">Technical Teams</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-md outline-none"
              >
                <option value="">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending_verification">Pending</option>
              </select>

              <button
                onClick={exportToCsv}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-md flex items-center gap-1.5 font-semibold cursor-pointer shadow-xs"
                title="Download full registration roster in CSV spreadsheet format"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>

              <button
                onClick={handleSyncGoogleSheets}
                disabled={isSyncingSheets}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-md flex items-center gap-1.5 font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                title="Trigger real-time synchronization to Google Sheets webhook"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                {isSyncingSheets ? 'Syncing...' : 'Sync Google Sheet'}
              </button>

              <a
                href={settingsForm.driveUploadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-1.5 font-semibold cursor-pointer shadow-xs"
                title="View participant payment screenshots in Google Drive folder"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Drive Screenshots
              </a>
            </div>
          </div>

          {/* Registrations Table */}
          <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 text-stone-600 border-b border-stone-200 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3">Reg ID</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Track</th>
                  <th className="p-3">Team Leader / College</th>
                  <th className="p-3">Participants</th>
                  <th className="p-3">Fee</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Attendance</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {registrations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-stone-400">
                      No registrations found matching the filters.
                    </td>
                  </tr>
                ) : (
                  registrations.map((r) => (
                    <tr key={r.id} className="hover:bg-stone-50/70">
                      <td className="p-3 font-mono font-bold text-stone-900">{r.id}</td>
                      <td className="p-3 text-stone-500 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.registrationType === 'workshop'
                              ? 'bg-red-50 text-[#B22222]'
                              : 'bg-stone-100 text-stone-800'
                          }`}
                        >
                          {r.registrationType}
                        </span>
                      </td>
                      <td className="p-3 max-w-[200px]">
                        <span className="font-bold text-stone-900 block truncate">
                          {r.teamLeader.fullName}
                        </span>
                        <span className="text-[11px] text-stone-500 block truncate">
                          {r.teamLeader.college}
                        </span>
                        <span className="text-[10px] text-stone-400 block">
                          {r.teamLeader.phone}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-stone-800">
                          {r.participants.length} Attendee{r.participants.length > 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-stone-900">₹{r.totalAmount}</td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                        {r.upiReference && (
                          <span className="block text-[10px] font-mono text-stone-400 truncate max-w-[100px]">
                            UTR: {r.upiReference}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.attendanceMarked
                              ? 'bg-blue-100 text-blue-800'
                              : 'text-stone-400'
                          }`}
                        >
                          {r.attendanceMarked ? 'Present' : 'Absent'}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {r.paymentStatus === 'pending_verification' && (
                          <button
                            onClick={() => handleUpdateStatus(r.id, 'paid')}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded cursor-pointer mr-1"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => onNavigate(`/ticket/${r.id}`)}
                          className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-[10px] rounded cursor-pointer"
                        >
                          Pass
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: UPI & PAYMENT GATEWAY CONTROLS */}
      {activeTab === 'upi' && (
        <div className="space-y-6 max-w-3xl">
          {/* ENVIRONMENT & RAZORPAY GATEWAY SWITCH */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#B22222]" />
                  Environment & Razorpay Gateway Controls
                </h3>
                <p className="text-xs text-stone-500">
                  Switch between Development (Real Test Mode) and Production (Strict Live Only).
                </p>
              </div>

              {/* Status Badge */}
              <span
                className={`text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                  settingsForm.appEnv === 'production'
                    ? 'bg-rose-100 text-rose-900 border border-rose-200'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    settingsForm.appEnv === 'production' ? 'bg-rose-600' : 'bg-amber-600'
                  } animate-pulse`}
                />
                ACTIVE: {settingsForm.appEnv === 'production' ? 'PRODUCTION (LIVE ONLY)' : 'DEVELOPMENT (TEST MODE)'}
              </span>
            </div>

            {/* Environment Switcher Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div
                onClick={() => handleToggleEnvironment('development')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  settingsForm.appEnv === 'development'
                    ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                    : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-sm text-stone-900 flex items-center gap-1.5">
                    DEVELOPMENT
                  </span>
                  {settingsForm.appEnv === 'development' && (
                    <span className="text-[10px] font-extrabold bg-amber-500 text-white px-2 py-0.5 rounded">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-600 mb-2 leading-relaxed">
                  Real Razorpay Test Mode with <code>rzp_test_...</code> keys. Tests authentic payment → cryptographic verification → registration → email → QR → Google Sheet pipeline.
                </p>
                <div className="text-[11px] text-amber-900 font-semibold bg-amber-100/70 p-2 rounded border border-amber-200">
                  Zero fake/simulated payment fallback. Uses authentic Razorpay sandbox checkout.
                </div>
              </div>

              <div
                onClick={() => handleToggleEnvironment('production')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  settingsForm.appEnv === 'production'
                    ? 'border-rose-600 bg-rose-50/60 shadow-xs'
                    : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-sm text-stone-900 flex items-center gap-1.5">
                    PRODUCTION
                  </span>
                  {settingsForm.appEnv === 'production' && (
                    <span className="text-[10px] font-extrabold bg-rose-700 text-white px-2 py-0.5 rounded">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-600 mb-2 leading-relaxed">
                  Strictly live-only gateway. Requires authentic <code>rzp_live_...</code> keys. Never allows test keys or simulations.
                </p>
                <div className="text-[11px] text-rose-900 font-semibold bg-rose-100/70 p-2 rounded border border-rose-200">
                  Security guarantee: Any test key or missing credential immediately halts payment.
                </div>
              </div>
            </div>

            {/* Gateway Diagnostic Health Card */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <span className="font-bold text-stone-700">Razorpay API Gateway Connection:</span>
                {(settingsForm.appEnv === 'development' ? settingsForm.razorpayConnected : settingsForm.razorpayLiveConnected) ? (
                  <span className="font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    CONNECTED ({settingsForm.razorpayKeyMode || 'AUTHENTICATED'})
                  </span>
                ) : (
                  <span className="font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    NOT CONNECTED
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-600 pt-1">
                <div>
                  <span className="font-semibold text-stone-800">Target Environment:</span>{' '}
                  <span className="font-mono uppercase">{settingsForm.appEnv || 'development'}</span>
                </div>
                <div>
                  <span className="font-semibold text-stone-800">Key Mode:</span>{' '}
                  <span className="font-mono">{settingsForm.razorpayKeyMode || 'NONE'}</span>
                </div>
              </div>

              <div className="text-[11px] text-stone-600 pt-1 border-t border-stone-200">
                <span className="font-semibold text-stone-800 block mb-0.5">Diagnostic Details:</span>
                <p className="text-stone-700 bg-white p-2.5 rounded border border-stone-200 leading-relaxed font-mono text-[10px]">
                  {settingsForm.razorpayStatusDetails || 'Checking gateway status...'}
                </p>
              </div>

              <div className="pt-2 text-[11px] text-stone-500 leading-relaxed">
                To update credentials, set <code>RAZORPAY_KEY_ID</code> and <code>RAZORPAY_KEY_SECRET</code> in the project settings or environment variables.
              </div>
            </div>
          </div>

          {/* UPI CONTROLS */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
            <div className="mb-4">
              <h3 className="text-base font-extrabold text-stone-900">
                UPI & Payment Screenshot Verification
              </h3>
              <p className="text-xs text-stone-500">
                Update UPI ID, dynamic QR image, and screenshot Drive upload link. Changes reflect immediately on payment page.
              </p>
            </div>

            <form onSubmit={handleSaveUpiSettings} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Active UPI ID
                </label>
                <input
                  type="text"
                  value={settingsForm.upiId}
                  onChange={(e) => setSettingsForm({ ...settingsForm, upiId: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-md font-mono outline-none focus:ring-1 focus:ring-[#B22222]"
                />
                <span className="text-[11px] text-stone-400 mt-0.5 block">
                  e.g. evitron26@mec or organizer VPA
                </span>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Payee Display Name
                </label>
                <input
                  type="text"
                  value={settingsForm.upiPayeeName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, upiPayeeName: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-md outline-none focus:ring-1 focus:ring-[#B22222]"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Custom UPI QR Image URL (Optional)
                </label>
                <input
                  type="text"
                  value={settingsForm.upiQrImageUrl}
                  onChange={(e) => setSettingsForm({ ...settingsForm, upiQrImageUrl: e.target.value })}
                  placeholder="Leave blank to auto-generate dynamic QR code"
                  className="w-full px-3 py-2 border border-stone-300 rounded-md outline-none focus:ring-1 focus:ring-[#B22222]"
                />
                <span className="text-[11px] text-stone-400 mt-0.5 block">
                  If left blank, the system dynamically encodes the active UPI ID.
                </span>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Google Drive Payment Screenshot Upload Link
                </label>
                <input
                  type="url"
                  value={settingsForm.driveUploadUrl}
                  onChange={(e) => setSettingsForm({ ...settingsForm, driveUploadUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-md outline-none focus:ring-1 focus:ring-[#B22222]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#B22222] hover:bg-[#961c1c] active:bg-[#7e1717] text-white font-bold rounded-lg cursor-pointer"
                >
                  Save Payment Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: EVENT COORDINATORS CMS */}
      {activeTab === 'events' && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
          <div className="mb-4">
            <h3 className="text-base font-extrabold text-stone-900">
              Event Details & Coordinator Management
            </h3>
            <p className="text-xs text-stone-500">
              Select an event to update coordinators, venues, and descriptions. These details are not hardcoded.
            </p>
          </div>

          <div className="mb-6 max-w-md">
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Select Event to Edit:
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-md text-xs font-bold text-stone-900 outline-none"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  [{evt.category.toUpperCase()}] {evt.title}
                </option>
              ))}
            </select>
          </div>

          {eventForm && (
            <form onSubmit={handleSaveEvent} className="space-y-4 text-xs max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Event Title</label>
                  <input
                    type="text"
                    value={eventForm.title || ''}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-md outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Tagline / Subtitle</label>
                  <input
                    type="text"
                    value={eventForm.tagline || ''}
                    onChange={(e) => setEventForm({ ...eventForm, tagline: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-md outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Coordinator Name</label>
                  <input
                    type="text"
                    value={eventForm.coordinatorName || ''}
                    onChange={(e) => setEventForm({ ...eventForm, coordinatorName: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-md outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Coordinator Phone</label>
                  <input
                    type="text"
                    value={eventForm.coordinatorPhone || ''}
                    onChange={(e) => setEventForm({ ...eventForm, coordinatorPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-md outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Venue</label>
                  <input
                    type="text"
                    value={eventForm.venue || ''}
                    onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-md outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Time Slot</label>
                  <input
                    type="text"
                    value={eventForm.time || ''}
                    onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-md outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Event Description</label>
                <textarea
                  rows={3}
                  value={eventForm.description || ''}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-md outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#B22222] hover:bg-[#961c1c] active:bg-[#7e1717] text-white font-bold rounded-lg cursor-pointer"
                >
                  Save Event Details
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 5: SITE SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs max-w-2xl">
          <h3 className="text-base font-extrabold text-stone-900 mb-4">
            Symposium Dates & Announcements
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Symposium Title</label>
                <input
                  type="text"
                  value={settingsForm.symposiumTitle}
                  onChange={(e) => setSettingsForm({ ...settingsForm, symposiumTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-md outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Event Date</label>
                <input
                  type="text"
                  value={settingsForm.eventDate}
                  onChange={(e) => setSettingsForm({ ...settingsForm, eventDate: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-md outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Registration Deadline</label>
                <input
                  type="text"
                  value={settingsForm.registrationDeadline}
                  onChange={(e) => setSettingsForm({ ...settingsForm, registrationDeadline: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-md outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Paper Abstract Deadline</label>
                <input
                  type="text"
                  value={settingsForm.paperSubmissionDeadline}
                  onChange={(e) => setSettingsForm({ ...settingsForm, paperSubmissionDeadline: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-md outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Announcement Banner Text</label>
              <textarea
                rows={2}
                value={settingsForm.announcementText}
                onChange={(e) => setSettingsForm({ ...settingsForm, announcementText: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-md outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#B22222] hover:bg-[#961c1c] active:bg-[#7e1717] text-white font-bold rounded-lg cursor-pointer"
              >
                Save Site Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 6: EVENT DAY ATTENDANCE SCANNER */}
      {activeTab === 'attendance' && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs max-w-xl">
          <div className="mb-4">
            <h3 className="text-base font-extrabold text-stone-900">
              Event-Day QR Attendance Desk
            </h3>
            <p className="text-xs text-stone-500">
              Scan or enter the attendee Registration ID to verify payment and mark attendance.
            </p>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              value={attendanceSearchId}
              onChange={(e) => setAttendanceSearchId(e.target.value.toUpperCase())}
              placeholder="e.g. EV26-XXXXXX"
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-xs font-mono font-bold outline-none"
            />
            <button
              onClick={handleMarkAttendance}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg cursor-pointer shrink-0"
            >
              Check-In Attendee
            </button>
          </div>

          {attendanceResult && (
            <div
              className={`p-4 rounded-lg text-xs ${
                attendanceResult.success
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border border-red-200 text-red-900'
              }`}
            >
              <span className="font-bold block mb-1">
                {attendanceResult.success ? 'Success' : 'Error'}
              </span>
              <p>{attendanceResult.message}</p>
              {attendanceResult.registration && (
                <div className="mt-2 pt-2 border-t border-emerald-200/50 space-y-1">
                  <div>
                    <span className="font-semibold">Leader:</span> {attendanceResult.registration.teamLeader.fullName}
                  </div>
                  <div>
                    <span className="font-semibold">College:</span> {attendanceResult.registration.teamLeader.college}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
