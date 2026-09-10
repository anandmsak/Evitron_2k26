import React, { useState, useEffect } from 'react';
import { Search, Ticket, CheckCircle, Clock, AlertCircle, Printer, MapPin, Calendar, ArrowLeft } from 'lucide-react';
import { RegistrationRecord, SiteSettings } from '../types';
import { defaultSettings } from '../data/defaultSettings';
import { fetchRegistrationById } from '../services/api';

interface TicketLookupPageProps {
  initialRegId?: string;
  settings?: SiteSettings;
  onNavigate: (path: string) => void;
}

export const TicketLookupPage: React.FC<TicketLookupPageProps> = ({ initialRegId, settings: propSettings, onNavigate }) => {
  const settings = propSettings || defaultSettings;
  const [searchId, setSearchId] = useState(initialRegId || '');
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<(RegistrationRecord & { qrDataUrl: string }) | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialRegId) {
      handleSearch(initialRegId);
    }
  }, [initialRegId]);

  const handleSearch = async (idToSearch = searchId) => {
    if (!idToSearch.trim()) {
      setErrorMsg('Please enter a Registration ID.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchRegistrationById(idToSearch.trim());
      setTicket(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'No registration record found with this ID.');
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-8 sm:py-12 max-w-3xl mx-auto px-4 sm:px-6 min-h-[75vh]">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 px-3 py-1.5 bg-stone-100 rounded-md border border-stone-200 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
      </div>

      <div className="text-center max-w-xl mx-auto mb-8">
        <div className="w-10 h-10 rounded-lg bg-red-50 text-[#B22222] flex items-center justify-center mx-auto mb-3">
          <Ticket className="w-5 h-5" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
          Verify Registration Pass
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Enter your unique Registration ID (e.g. EV26-XXXXXX) to view and download your symposium entry ticket.
        </p>

        {/* Search input */}
        <div className="mt-6 flex items-center gap-2">
          <input
            type="text"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value.toUpperCase())}
            placeholder="e.g. EV26-ABC123"
            className="w-full px-4 py-2.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 outline-none focus:ring-2 focus:ring-[#B22222]"
          />
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="px-5 py-2.5 bg-[#B22222] hover:bg-[#961c1c] active:bg-[#7e1717] text-white text-xs font-bold rounded-lg cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs"
          >
            <Search className="w-3.5 h-3.5" />
            {loading ? 'Searching...' : 'Find Ticket'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-[#B22222] rounded-r-lg text-xs text-red-800 flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-[#B22222] shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {ticket && (
        <div className="bg-white border-2 border-stone-800 rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-[#B22222] text-white p-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/emblem.png"
                alt="EVITRON 2K26 Emblem"
                className="w-11 h-11 rounded-xl bg-white/10 p-1 border border-white/20 object-contain shrink-0"
                referrerPolicy="no-referrer"
              />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-200 block">
                  OFFICIAL ENTRY PASS
                </span>
                <h2 className="text-xl font-extrabold">{settings.symposiumTitle}</h2>
                <p className="text-xs text-red-100">{settings.department} • {settings.college}</p>
              </div>
            </div>
            <div className="bg-white/10 px-3 py-1.5 rounded-lg text-right">
              <span className="text-[10px] text-red-200 block uppercase">Registration ID</span>
              <span className="text-lg font-mono font-bold">{ticket.id}</span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 border-b border-stone-200 pb-6">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-36 h-36 bg-stone-50 border border-stone-300 rounded-xl p-2 flex items-center justify-center">
                  <img
                    src={ticket.qrDataUrl}
                    alt={`QR Code ${ticket.id}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[10px] font-mono text-stone-500 font-bold mt-1">{ticket.id}</span>
              </div>

              <div className="space-y-2 text-xs flex-1 w-full">
                <div>
                  <span className="text-stone-400 block font-medium">Team Leader / Participant:</span>
                  <span className="font-bold text-stone-900 text-sm">{ticket.teamLeader.fullName}</span>
                  <span className="text-stone-500 block">{ticket.teamLeader.college}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                  <div>
                    <span className="text-stone-400 block font-medium">Payment Status:</span>
                    <span
                      className={`inline-block font-bold uppercase px-2 py-0.5 rounded text-[10px] ${
                        ticket.paymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ticket.paymentStatus === 'paid' ? 'Paid / Confirmed' : 'Pending Verification'}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block font-medium">Attendance:</span>
                    <span
                      className={`inline-block font-bold uppercase px-2 py-0.5 rounded text-[10px] ${
                        ticket.attendanceMarked
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {ticket.attendanceMarked ? 'Present' : 'Not Yet Scanned'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100">
                  <span className="text-stone-400 block font-medium">Contact:</span>
                  <span className="text-stone-700">{ticket.teamLeader.phone} • {ticket.teamLeader.email}</span>
                </div>
              </div>
            </div>

            {/* Participants */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                Registered Attendees ({ticket.participants.length})
              </h3>
              <div className="space-y-1.5">
                {ticket.participants.map((p, idx) => (
                  <div key={idx} className="p-2.5 bg-stone-50 rounded-lg border border-stone-200 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold text-stone-900">
                        {idx === 0 ? 'Leader: ' : `Member ${idx + 1}: `}
                        {p.fullName}
                      </span>
                      <span className="text-stone-500 block text-[11px]">{p.college}</span>
                    </div>
                    <div className="text-stone-600 text-[11px]">{p.phone}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-stone-50 border-t border-stone-200 p-4 flex justify-between items-center">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Pass
            </button>
            <span className="text-xs text-stone-500">Event Date: 08/10/2026</span>
          </div>
        </div>
      )}
    </div>
  );
};
