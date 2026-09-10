import React, { useState } from 'react';
import {
  ShieldAlert,
  Users,
  Wrench,
  Cpu,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  QrCode,
  CreditCard,
  ExternalLink,
  Copy,
  Printer,
  Download,
  ArrowLeft,
  Check,
  Ticket,
} from 'lucide-react';
import { EventItem, Participant, RegistrationRecord, SiteSettings } from '../types';
import { defaultSettings } from '../data/defaultSettings';
import { createOrder, verifyPayment, submitUpiRegistration } from '../services/api';

interface RegistrationPageProps {
  events: EventItem[];
  settings?: SiteSettings;
  onNavigate: (path: string) => void;
}

export const RegistrationPage: React.FC<RegistrationPageProps> = ({ events, settings: propSettings, onNavigate }) => {
  const settings = propSettings || defaultSettings;
  // Step: 'selection' | 'form' | 'payment' | 'success'
  const [step, setStep] = useState<'selection' | 'form' | 'payment' | 'success'>('selection');

  // Track selection: 'workshop' | 'technical' | null
  const [chosenTrack, setChosenTrack] = useState<'workshop' | 'technical' | null>(null);

  // Selected event IDs
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>('');
  const [selectedTechnicalIds, setSelectedTechnicalIds] = useState<string[]>([]);
  const [selectedNonTechnicalIds, setSelectedNonTechnicalIds] = useState<string[]>([]);

  // Participants form state
  // Workshop: 1 participant. Technical: strictly 3 participants (Leader, Member 2, Member 3)
  const [participants, setParticipants] = useState<Participant[]>([
    { fullName: '', email: '', phone: '', college: '', department: '', year: '' },
    { fullName: '', email: '', phone: '', college: '', department: '', year: '' },
    { fullName: '', email: '', phone: '', college: '', department: '', year: '' },
  ]);

  // UPI Form state
  const [upiReference, setUpiReference] = useState('');
  const [upiCopied, setUpiCopied] = useState(false);

  // UI state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmedRegistration, setConfirmedRegistration] = useState<RegistrationRecord | null>(null);
  const [ticketQrDataUrl, setTicketQrDataUrl] = useState<string>('');

  const workshops = events.filter((e) => e.category === 'workshops');
  const technicalEvents = events.filter((e) => e.category === 'technical');
  const nonTechnicalEvents = events.filter((e) => e.category === 'non-technical');

  // If registrations are globally closed by admin
  if (!settings.isRegistrationOpen) {
    return (
      <div className="py-16 max-w-2xl mx-auto px-4 text-center">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-stone-900 mb-2">Registrations Closed</h1>
          <p className="text-sm text-stone-600 mb-6 leading-relaxed">
            {settings.closedReason || 'Online registrations for EVITRON 2K26 are currently closed.'}
          </p>
          <div className="text-xs text-stone-500 border-t border-amber-200 pt-4">
            For spot registration inquiries or coordinator assistance, please contact:{' '}
            <span className="font-semibold text-stone-800">{settings.contactEmail}</span>
          </div>
          <div className="mt-6">
            <button
              onClick={() => onNavigate('/')}
              className="px-5 py-2.5 bg-stone-900 text-white text-xs font-bold rounded-lg"
            >
              Return to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // EVENT SELECTION LOGIC (STRICT RULE ENFORCEMENT)
  // 1. Workshop: strictly 1 workshop only. No tech, no non-tech. (Individual pass: 1 person).
  // 2. Technical: strictly 1 technical event only (Team of 3).
  // 3. Non-Technical: strictly at most 1 non-technical event, ONLY IF 1 technical event is selected.
  //    Non-technical alone can NEVER be selected.
  // ----------------------------------------------------

  const handleSelectWorkshop = (id: string) => {
    setErrorMsg(null);
    if (selectedWorkshopId === id) {
      setSelectedWorkshopId('');
      setChosenTrack(null);
    } else {
      setChosenTrack('workshop');
      setSelectedWorkshopId(id);
      setSelectedTechnicalIds([]);
      setSelectedNonTechnicalIds([]);
    }
  };

  const handleToggleTechnical = (id: string) => {
    setSelectedWorkshopId(''); // Workshop disappears/clears
    setErrorMsg(null);

    if (selectedTechnicalIds.includes(id)) {
      // Deselect technical -> clear non-technical as well since non-tech cannot exist without tech
      setSelectedTechnicalIds([]);
      setSelectedNonTechnicalIds([]);
      setChosenTrack(null);
    } else {
      // Strictly 1 technical event allowed (replaces any previous technical selection)
      setChosenTrack('technical');
      setSelectedTechnicalIds([id]);
    }
  };

  const handleToggleNonTechnical = (id: string) => {
    // RULE: Non-technical alone is strictly NOT ALLOWED
    if (selectedTechnicalIds.length === 0) {
      setErrorMsg('Please select 1 technical event first before choosing a non-technical event. Non-technical events cannot be selected alone.');
      return;
    }
    setErrorMsg(null);

    if (selectedNonTechnicalIds.includes(id)) {
      // Deselecting non-tech is allowed (optional)
      setSelectedNonTechnicalIds([]);
    } else {
      // Strictly at most 1 non-technical event allowed (replaces any previous non-tech selection)
      setSelectedNonTechnicalIds([id]);
    }
  };

  // Fee Calculation
  let totalAmount = 0;
  if (chosenTrack === 'workshop' && selectedWorkshopId) {
    totalAmount = 350; // 1 person
  } else if (chosenTrack === 'technical' && selectedTechnicalIds.length > 0) {
    totalAmount = 1050; // Team of exactly 3 = 3 x ₹350
  }

  // Validate step 1 (Event Selection)
  const validateEventSelection = () => {
    setErrorMsg(null);
    if (!chosenTrack) {
      setErrorMsg('Please select a workshop or technical event to proceed.');
      return false;
    }
    if (chosenTrack === 'workshop') {
      if (!selectedWorkshopId) {
        setErrorMsg('Please select strictly 1 workshop.');
        return false;
      }
      return true;
    }
    if (chosenTrack === 'technical') {
      if (selectedTechnicalIds.length === 0) {
        setErrorMsg('Please select 1 technical event before proceeding.');
        return false;
      }
      if (selectedTechnicalIds.length > 1) {
        setErrorMsg('Strictly only 1 technical event can be selected.');
        return false;
      }
      if (selectedNonTechnicalIds.length > 1) {
        setErrorMsg('Strictly at most 1 non-technical event can be selected.');
        return false;
      }
      return true;
    }
    return false;
  };

  const handleProceedToForm = () => {
    if (validateEventSelection()) {
      setStep('form');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Update participant details
  const updateParticipant = (index: number, field: keyof Participant, val: string) => {
    const next = [...participants];
    next[index] = { ...next[index], [field]: val };
    setParticipants(next);
  };

  // Validate step 2 (Participant details)
  const validateParticipantForm = (): boolean => {
    setErrorMsg(null);
    const activeParticipants = chosenTrack === 'workshop' ? [participants[0]] : participants.slice(0, 3);

    for (let i = 0; i < activeParticipants.length; i++) {
      const p = activeParticipants[i];
      const role = i === 0 ? (chosenTrack === 'workshop' ? 'Participant' : 'Team Leader') : `Member ${i + 1}`;
      if (!p.fullName.trim()) {
        setErrorMsg(`Please enter the Full Name for ${role}.`);
        return false;
      }
      if (!p.email.trim() || !p.email.includes('@') || !p.email.includes('.')) {
        setErrorMsg(`Please enter a valid Email address for ${role}.`);
        return false;
      }
      const digits = p.phone.replace(/\D/g, '');
      if (digits.length < 10) {
        setErrorMsg(`Please enter a valid 10-digit Mobile Number for ${role}.`);
        return false;
      }
      if (!p.college.trim()) {
        setErrorMsg(`Please enter the College Name for ${role}.`);
        return false;
      }
    }
    return true;
  };

  const handleProceedToPayment = () => {
    if (validateParticipantForm()) {
      setStep('payment');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Package payload for backend
  const getRegistrationPayload = () => {
    const activeParticipants =
      chosenTrack === 'workshop' ? [participants[0]] : participants.slice(0, 3);

    return {
      registrationType: chosenTrack,
      selectedWorkshopId: chosenTrack === 'workshop' ? selectedWorkshopId : undefined,
      selectedTechnicalIds: chosenTrack === 'technical' ? selectedTechnicalIds : [],
      selectedNonTechnicalIds: chosenTrack === 'technical' ? selectedNonTechnicalIds : [],
      participants: activeParticipants,
    };
  };

  // Handle UPI Submission
  const handleUpiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiReference || upiReference.trim().length < 4) {
      setErrorMsg('Please enter a valid 12-digit UPI Transaction / UTR Number.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const payload = {
        registrationData: getRegistrationPayload(),
        upiReference: upiReference.trim(),
      };
      const result = await submitUpiRegistration(payload);
      setConfirmedRegistration(result.registration);

      // Fetch QR Code data URL
      const qrRes = await fetch(`/api/registration/${result.registrationId}`);
      if (qrRes.ok) {
        const full = await qrRes.json();
        setTicketQrDataUrl(full.qrDataUrl);
      }

      setStep('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit UPI registration.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Razorpay Checkout (Real Online Gateway Integration Only)
  const handleRazorpayCheckout = async () => {
    setIsProcessing(true);
    setErrorMsg(null);

    const isDevMode = settings.appEnv === 'development';
    const isConnected = isDevMode ? settings.razorpayConnected : settings.razorpayLiveConnected;

    // If Razorpay gateway is not connected for active environment, stop immediately
    if (!isConnected) {
      if (isDevMode) {
        setErrorMsg(
          'Razorpay Test Mode credentials are currently pending verification. Please pay using Option 1 (Instant UPI QR) on the left for instant registration.'
        );
      } else {
        setErrorMsg(
          'Razorpay Live Gateway is not connected. Please pay using Option 1 (Instant UPI QR) on the left or contact the symposium coordinators.'
        );
      }
      setIsProcessing(false);
      return;
    }

    try {
      const payload = getRegistrationPayload();
      const order = await createOrder(payload);

      // Ensure standard Razorpay SDK script is loaded for live gateway orders
      const win = window as any;
      if (!win.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error('Failed to load Razorpay Checkout SDK. Please check your internet connection.'));
          document.body.appendChild(script);
        });
      }

      if (!win.Razorpay) {
        throw new Error('Razorpay Checkout SDK could not be initialized.');
      }

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'EVITRON 2K26',
        description: chosenTrack === 'workshop' ? 'Workshop Registration Pass' : 'Technical Symposium Team Pass',
        order_id: order.orderId,
        handler: async (response: any) => {
          try {
            setIsProcessing(true);
            const verifyRes = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              registrationData: payload,
            });
            setConfirmedRegistration(verifyRes.registration);
            const qrRes = await fetch(`/api/registration/${verifyRes.registrationId}`);
            if (qrRes.ok) {
              const full = await qrRes.json();
              setTicketQrDataUrl(full.qrDataUrl);
            }
            setStep('success');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch (vErr: any) {
            setErrorMsg(vErr.message || 'Payment signature verification failed.');
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: participants[0].fullName,
          email: participants[0].email,
          contact: participants[0].phone,
        },
        theme: {
          color: '#B22222',
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const rzp = new win.Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setIsProcessing(false);
        setErrorMsg(resp.error?.description || 'Payment was unsuccessful or cancelled.');
      });
      rzp.open();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize payment gateway. Live credentials (rzp_live_...) are required.');
      setIsProcessing(false);
    }
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(settings.upiId);
    setUpiCopied(true);
    setTimeout(() => setUpiCopied(false), 2000);
  };

  // ----------------------------------------------------
  // STEP 4: SUCCESS / CONFIRMATION SCREEN
  // ----------------------------------------------------
  if (step === 'success' && confirmedRegistration) {
    const selectedEvts = events.filter(
      (e) =>
        e.id === confirmedRegistration.selectedWorkshopId ||
        confirmedRegistration.selectedTechnicalIds.includes(e.id) ||
        confirmedRegistration.selectedNonTechnicalIds.includes(e.id)
    );

    return (
      <div className="py-8 sm:py-12 max-w-3xl mx-auto px-4 sm:px-6">
        {/* Ticket Card */}
        <div id="symposium-ticket-card" className="bg-white border-2 border-stone-800 rounded-2xl shadow-lg overflow-hidden">
          {/* Ticket Header */}
          <div className="bg-[#B22222] text-white p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src="/emblem.png"
                alt="EVITRON 2K26 Emblem"
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/10 p-1 border border-white/20 object-contain shrink-0 shadow-xs"
                referrerPolicy="no-referrer"
              />
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-red-200">
                  OFFICIAL ENTRY PASS
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  EVITRON 2K26
                </h1>
                <p className="text-xs text-red-100 font-medium mt-0.5">
                  National Level Technical Symposium • Mahendra Engineering College
                </p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs border border-white/20 px-4 py-2 rounded-lg text-right">
              <span className="text-[11px] uppercase tracking-wider text-red-200 block">Registration ID</span>
              <span className="text-xl font-extrabold text-white font-mono">{confirmedRegistration.id}</span>
            </div>
          </div>

          {/* Ticket Body */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-stone-200 pb-6">
              {/* QR Code */}
              <div className="flex flex-col items-center shrink-0">
                <div className="w-40 h-40 bg-stone-50 border border-stone-300 rounded-xl p-2 flex items-center justify-center shadow-xs">
                  {ticketQrDataUrl ? (
                    <img
                      src={ticketQrDataUrl}
                      alt={`Registration QR ${confirmedRegistration.id}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-xs text-stone-400 text-center">Generating QR...</div>
                  )}
                </div>
                <span className="text-[10px] font-mono text-stone-500 mt-1 font-bold">
                  {confirmedRegistration.id}
                </span>
                <span className="text-[10px] text-stone-400">Scan at registration desk</span>
              </div>

              {/* Summary */}
              <div className="space-y-3 text-xs flex-1 w-full">
                <div>
                  <span className="text-stone-400 block font-medium">Team Leader / Participant:</span>
                  <span className="font-bold text-stone-900 text-sm">{confirmedRegistration.teamLeader.fullName}</span>
                  <span className="text-stone-500 block">{confirmedRegistration.teamLeader.college}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-100">
                  <div>
                    <span className="text-stone-400 block font-medium">Event Date:</span>
                    <span className="font-bold text-stone-800">08 October 2026</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block font-medium">Reporting Time:</span>
                    <span className="font-bold text-stone-800">08:30 AM IST</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-100">
                  <div>
                    <span className="text-stone-400 block font-medium">Payment Status:</span>
                    <span
                      className={`inline-block font-bold uppercase px-2 py-0.5 rounded text-[11px] ${
                        confirmedRegistration.paymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {confirmedRegistration.paymentStatus === 'paid' ? 'Paid / Confirmed' : 'Pending Verification'}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block font-medium">Amount Paid:</span>
                    <span className="font-bold text-stone-900">₹{confirmedRegistration.totalAmount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Events */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                Registered Events
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedEvts.map((evt) => (
                  <div key={evt.id} className="p-2.5 bg-stone-50 rounded-lg border border-stone-200 text-xs">
                    <span className="font-bold text-stone-900 block">{evt.title}</span>
                    <span className="text-stone-500 text-[11px]">{evt.tagline}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Participants list */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                Registered Attendees ({confirmedRegistration.participants.length})
              </h3>
              <div className="space-y-2">
                {confirmedRegistration.participants.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-stone-50 rounded-lg border border-stone-200 text-xs gap-1"
                  >
                    <div>
                      <span className="font-bold text-stone-900">
                        {idx === 0
                          ? confirmedRegistration.registrationType === 'workshop'
                            ? 'Participant: '
                            : 'Team Leader: '
                          : `Member ${idx + 1}: `}
                        {p.fullName}
                      </span>
                      <span className="text-stone-500 block text-[11px]">{p.college}</span>
                    </div>
                    <div className="text-stone-600 sm:text-right text-[11px]">
                      <span>{p.phone}</span> • <span>{p.email}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notice */}
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-stone-800 space-y-1">
              <span className="font-bold text-[#B22222] block">Registration Notice:</span>
              <p>• Payment successful. Your registration has been confirmed.</p>
              <p>• A confirmation email has been triggered from <span className="font-semibold">evitron26@gmail.com</span>.</p>
              <p>• Please bring your College ID card and this ticket (printed or on smartphone) on 08/10/2026.</p>
            </div>
          </div>

          {/* Ticket Footer Actions */}
          <div className="bg-stone-50 border-t border-stone-200 p-4 sm:p-6 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              Print / Save Ticket Pass
            </button>

            <button
              onClick={() => onNavigate('/')}
              className="px-4 py-2.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 text-xs font-bold rounded-lg cursor-pointer"
            >
              Return to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 sm:py-12 max-w-4xl mx-auto px-4 sm:px-6 min-h-[80vh]">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-md mx-auto mb-2 text-xs font-bold">
          <span className={step === 'selection' ? 'text-[#B22222]' : 'text-stone-400'}>
            1. Select Events
          </span>
          <span className="text-stone-300">──</span>
          <span className={step === 'form' ? 'text-[#B22222]' : 'text-stone-400'}>
            2. Participant Details
          </span>
          <span className="text-stone-300">──</span>
          <span className={step === 'payment' ? 'text-[#B22222]' : 'text-stone-400'}>
            3. Payment & Confirm
          </span>
        </div>
        <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#B22222] transition-all duration-300"
            style={{
              width: step === 'selection' ? '33%' : step === 'form' ? '66%' : '100%',
            }}
          />
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-[#B22222] rounded-r-lg text-xs text-red-800 flex items-start gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-[#B22222] shrink-0 mt-0.5" />
          <div className="font-semibold">{errorMsg}</div>
        </div>
      )}

      {/* ----------------------------------------------------
          STEP 1: SELECT EVENTS (STRICT RULES ENFORCEMENT)
          ---------------------------------------------------- */}
      {step === 'selection' && (
        <div className="space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Select Your Symposium Events
            </h1>
            <p className="text-xs text-stone-600 mt-2">
              Choose either a hands-on <span className="font-bold text-stone-800">Workshop</span> (Individual) OR the{' '}
              <span className="font-bold text-stone-800">Technical Symposium Track</span> (Team of Exactly 3).
            </p>
          </div>

          {/* TRACK OPTION A: WORKSHOP */}
          <div
            className={`bg-white rounded-xl border-2 p-5 sm:p-6 transition-all ${
              chosenTrack === 'workshop'
                ? 'border-[#B22222] shadow-sm ring-1 ring-[#B22222]/30'
                : 'border-stone-200 opacity-95'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-red-50 text-[#B22222] flex items-center justify-center font-bold">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-stone-900">Track A: Workshops</h2>
                  <span className="text-[11px] text-stone-500 font-medium">
                    Individual (1 Participant) • ₹350 per person
                  </span>
                </div>
              </div>

              <span className="text-[11px] font-bold px-2.5 py-1 bg-stone-100 text-stone-700 rounded">
                Strictly 1 Workshop Only
              </span>
            </div>

            <p className="text-xs text-stone-600 mb-4">
              Rule: If you select a workshop, technical and non-technical selections will be disabled.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {workshops.map((w) => {
                const isSelected = selectedWorkshopId === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleSelectWorkshop(w.id)}
                    className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-red-50/70 border-[#B22222] shadow-xs'
                        : 'bg-white border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-stone-900 text-xs">{w.title}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#B22222]" />}
                    </div>
                    <p className="text-[11px] text-stone-500 line-clamp-2">{w.tagline}</p>
                    <div className="mt-2 text-[10px] font-semibold text-[#B22222]">₹350 / Participant</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TRACK OPTION B: TECHNICAL & NON-TECHNICAL */}
          <div
            className={`bg-white rounded-xl border-2 p-5 sm:p-6 transition-all ${
              chosenTrack === 'technical'
                ? 'border-[#B22222] shadow-sm ring-1 ring-[#B22222]/30'
                : 'border-stone-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-stone-100 text-stone-800 flex items-center justify-center font-bold">
                  <Cpu className="w-4 h-4 text-[#B22222]" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-stone-900">Track B: Technical Symposium Track</h2>
                  <span className="text-[11px] text-stone-500 font-medium">
                    Team of Exactly 3 Participants • ₹1050 per team
                  </span>
                </div>
              </div>

              <span className="text-[11px] font-bold px-2.5 py-1 bg-stone-100 text-stone-700 rounded">
                Exactly 3 Members Required
              </span>
            </div>

            <div className="p-3 bg-stone-50 rounded-lg text-xs text-stone-600 mb-4 border border-stone-100">
              <span className="font-bold text-stone-900">Mandatory Rules:</span>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                <li>Every technical symposium team requires exactly 3 participants (₹1050 flat fee).</li>
                <li><strong>Strictly 1 Technical Event</strong> can be selected.</li>
                <li><strong>Optional:</strong> You may choose <strong>at most 1 Non-Technical Event</strong>, but ONLY when 1 technical event is selected. Non-technical events can never be selected alone.</li>
              </ul>
            </div>

            {/* Technical Events List */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Select Technical Event (Strictly 1 Allowed):
                </h3>
                {selectedTechnicalIds.length === 1 && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    1 Technical Selected
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {technicalEvents.map((t) => {
                  const isSelected = selectedTechnicalIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleToggleTechnical(t.id)}
                      className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-red-50/70 border-[#B22222] shadow-xs ring-1 ring-[#B22222]/30'
                          : 'bg-white border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-stone-900 text-xs">{t.title}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#B22222]" />}
                      </div>
                      <p className="text-[11px] text-stone-500">{t.tagline}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Non-Technical Events List (Disabled unless Technical is selected) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Optional Non-Technical Event (Max 1 Allowed):
                </h3>
                {selectedTechnicalIds.length === 0 ? (
                  <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Select 1 Technical Event First
                  </span>
                ) : (
                  <span className="text-[10px] text-stone-500 font-medium">
                    {selectedNonTechnicalIds.length === 1 ? '1 Non-Technical Selected' : 'Optional (0 or 1)'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {nonTechnicalEvents.map((n) => {
                  const isSelected = selectedNonTechnicalIds.includes(n.id);
                  const isDisabled = selectedTechnicalIds.length === 0;

                  return (
                    <button
                      key={n.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleToggleNonTechnical(n.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        isDisabled
                          ? 'opacity-40 bg-stone-50 border-stone-200 cursor-not-allowed'
                          : isSelected
                          ? 'bg-red-50/70 border-[#B22222] cursor-pointer'
                          : 'bg-white border-stone-200 hover:border-stone-300 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-stone-900 text-xs">{n.title}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#B22222]" />}
                      </div>
                      <p className="text-[10px] text-stone-500">{n.tagline}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Fee & Selection Summary Bar */}
          <div className="bg-stone-900 text-white rounded-xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-stone-400 font-medium block">Registration Fee Summary</span>
              <div className="text-xl sm:text-2xl font-extrabold text-white">
                Total Payable: <span className="text-[#ff7878]">₹{totalAmount}</span>
              </div>
              <p className="text-[11px] text-stone-300 mt-0.5">
                {chosenTrack === 'workshop'
                  ? '1 Participant (Individual Workshop Pass)'
                  : chosenTrack === 'technical'
                  ? 'Team of 3 Participants (₹1050 flat for the entire team)'
                  : 'Select an event to view fee'}
              </p>
            </div>

            <button
              id="proceed-to-participants-btn"
              onClick={handleProceedToForm}
              disabled={totalAmount === 0}
              className={`px-6 py-3 rounded-lg font-bold text-xs sm:text-sm shadow-sm transition-colors ${
                totalAmount > 0
                  ? 'bg-[#B22222] hover:bg-[#961c1c] active:bg-[#7e1717] text-white cursor-pointer'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed'
              }`}
            >
              Continue to Participant Details →
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          STEP 2: PARTICIPANTS FORM (EXACTLY 3 FOR TECH, 1 FOR WORKSHOP)
          ---------------------------------------------------- */}
      {step === 'form' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900">
                {chosenTrack === 'workshop' ? 'Participant Information' : 'Team Participant Details'}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {chosenTrack === 'workshop'
                  ? 'Workshop registration is individual (1 participant).'
                  : 'Technical events require exactly 3 participants (1 Team Leader + 2 Members).'}
              </p>
            </div>

            <button
              onClick={() => setStep('selection')}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Change Events
            </button>
          </div>

          {/* Form cards */}
          {(chosenTrack === 'workshop' ? [0] : [0, 1, 2]).map((idx) => {
            const roleTitle =
              chosenTrack === 'workshop'
                ? 'Participant'
                : idx === 0
                ? 'Team Leader (Paying Member)'
                : `Team Member ${idx + 1}`;

            const p = participants[idx];

            return (
              <div key={idx} className="bg-white border border-stone-200 rounded-xl p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4 border-b border-stone-100 pb-2">
                  <span className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-800 flex items-center justify-center text-xs">
                      {idx + 1}
                    </span>
                    {roleTitle}
                  </span>
                  {idx === 0 && chosenTrack === 'technical' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#B22222] bg-red-50 px-2 py-0.5 rounded">
                      Primary Contact
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Full Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={p.fullName}
                      onChange={(e) => updateParticipant(idx, 'fullName', e.target.value)}
                      placeholder="e.g. Anandha Krishnan"
                      className="w-full px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-[#B22222] focus:border-[#B22222] outline-none text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Email Address <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="email"
                      value={p.email}
                      onChange={(e) => updateParticipant(idx, 'email', e.target.value)}
                      placeholder="e.g. anandh@example.com"
                      className="w-full px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-[#B22222] focus:border-[#B22222] outline-none text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Mobile Number (10 Digits) <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="tel"
                      value={p.phone}
                      onChange={(e) => updateParticipant(idx, 'phone', e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-[#B22222] focus:border-[#B22222] outline-none text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      College Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={p.college}
                      onChange={(e) => updateParticipant(idx, 'college', e.target.value)}
                      placeholder="e.g. Mahendra Engineering College"
                      className="w-full px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-[#B22222] focus:border-[#B22222] outline-none text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Department (Optional)
                    </label>
                    <input
                      type="text"
                      value={p.department || ''}
                      onChange={(e) => updateParticipant(idx, 'department', e.target.value)}
                      placeholder="e.g. ECE / EEE"
                      className="w-full px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-[#B22222] focus:border-[#B22222] outline-none text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Year of Study (Optional)
                    </label>
                    <input
                      type="text"
                      value={p.year || ''}
                      onChange={(e) => updateParticipant(idx, 'year', e.target.value)}
                      placeholder="e.g. III Year"
                      className="w-full px-3 py-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-[#B22222] focus:border-[#B22222] outline-none text-stone-900"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setStep('selection')}
              className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-lg cursor-pointer"
            >
              ← Back to Events
            </button>

            <button
              type="button"
              id="proceed-to-payment-btn"
              onClick={handleProceedToPayment}
              className="px-6 py-3 bg-[#B22222] hover:bg-[#961c1c] active:bg-[#7e1717] text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm cursor-pointer"
            >
              Proceed to Payment (₹{totalAmount}) →
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          STEP 3: PAYMENT (OPTION 1: UPI / OPTION 2: RAZORPAY)
          ---------------------------------------------------- */}
      {step === 'payment' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900">
                Payment & Confirmation
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Total Payable: <span className="font-extrabold text-stone-900 text-sm">₹{totalAmount}</span>
              </p>
            </div>

            <button
              onClick={() => setStep('form')}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Edit Details
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* OPTION 1: UPI PAYMENT */}
            <div className="bg-white border-2 border-stone-300 rounded-xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#B22222]">
                    OPTION 1 — UPI QR
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                    Instant & Zero Fee
                  </span>
                </div>

                <h3 className="text-lg font-extrabold text-stone-900 mb-1">
                  Pay via UPI / GPay / PhonePe / Paytm
                </h3>
                <p className="text-xs text-stone-500 mb-4">
                  Scan the dynamic symposium QR code or pay directly using the UPI ID below.
                </p>

                {/* QR Code Container */}
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col items-center justify-center mb-4">
                  <div className="w-48 h-48 bg-white border border-stone-300 rounded-lg p-2 shadow-xs flex items-center justify-center">
                    {settings.upiQrImageUrl ? (
                      <img
                        src={settings.upiQrImageUrl}
                        alt="Symposium UPI QR Code"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <QrCode className="w-24 h-24 text-stone-400" />
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <span className="text-xs font-bold text-stone-900">Scan & Pay: ₹{totalAmount}</span>
                    <span className="text-[10px] text-stone-500 block">EVITRON 2K26 Registration</span>
                  </div>
                </div>

                {/* UPI ID Copy Field */}
                <div className="mb-4">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Symposium UPI ID
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={settings.upiId}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-md font-mono text-xs text-stone-900"
                    />
                    <button
                      type="button"
                      onClick={copyUpiId}
                      className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-md border border-stone-300 flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {upiCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{upiCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* UTR Reference Form */}
                <form onSubmit={handleUpiSubmit} className="space-y-3 pt-2 border-t border-stone-100">
                  <div>
                    <label className="block text-stone-800 font-bold text-xs mb-1">
                      Enter UPI Transaction Reference (UTR / Ref ID):
                    </label>
                    <input
                      type="text"
                      value={upiReference}
                      onChange={(e) => setUpiReference(e.target.value)}
                      placeholder="e.g. 4289xxxxxxxx (12 digits)"
                      className="w-full px-3 py-2 border border-stone-300 rounded-md text-xs text-stone-900 font-mono outline-none focus:ring-1 focus:ring-[#B22222]"
                    />
                    <span className="text-[10px] text-stone-400 mt-0.5 block">
                      Find this in your GPay / PhonePe / Paytm transaction receipt.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isProcessing ? 'Verifying & Submitting...' : 'Confirm UPI Payment & Get Ticket'}
                  </button>
                </form>
              </div>

              {/* Upload Screenshot Google Drive Folder Callout */}
              <div className="mt-5 p-3.5 bg-red-50/60 border border-red-200 rounded-lg text-left">
                <div className="flex items-start gap-2.5">
                  <ExternalLink className="w-4 h-4 text-[#B22222] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-stone-900 block">
                      Official Payment Screenshot Drive Folder
                    </span>
                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      After transferring ₹{totalAmount}, kindly upload your UPI payment screenshot to our symposium Google Drive folder. Please label the file with your <strong>Team Leader Name & Phone</strong>.
                    </p>
                    <a
                      href={settings.driveUploadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-[#B22222] hover:bg-[#961c1c] active:bg-[#7e1717] text-white font-bold text-xs rounded shadow-xs cursor-pointer transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open Google Drive Folder to Upload Screenshot
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* OPTION 2: RAZORPAY GATEWAY */}
            <div className="bg-white border-2 border-stone-300 rounded-xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#B22222]">
                    OPTION 2 — RAZORPAY
                  </span>
                  {settings.appEnv === 'development' ? (
                    settings.razorpayConnected ? (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                        Test Mode Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-stone-100 text-stone-700 px-2 py-0.5 rounded flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-500"></span>
                        Test Not Connected
                      </span>
                    )
                  ) : settings.razorpayLiveConnected ? (
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      Live Connected
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                      Live Not Connected
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-extrabold text-stone-900 mb-1">
                  Razorpay Secure Checkout {settings.appEnv === 'development' && <span className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded ml-1">Sandbox Test</span>}
                </h3>
                <p className="text-xs text-stone-500 mb-4">
                  {settings.appEnv === 'development'
                    ? 'Authentic Razorpay Test Mode integration. Real checkout, HMAC verification, ticket QR, email, and Google Sheet sync.'
                    : 'Real payment gateway integration via Cards, Netbanking, UPI, and Wallets.'}
                </p>

                {((settings.appEnv === 'development' && !settings.razorpayConnected) ||
                  (settings.appEnv === 'production' && !settings.razorpayLiveConnected)) && (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 mb-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold">
                          Razorpay {settings.appEnv === 'development' ? 'Test Mode (Verification Pending)' : 'Live Gateway Not Connected'}
                        </strong>
                        <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                          {settings.razorpayStatusDetails ||
                            (settings.appEnv === 'development'
                              ? 'Razorpay test credentials verification is pending. Instant UPI QR payment is active.'
                              : 'Requires valid live credentials starting with rzp_live_...')}
                        </p>
                        <p className="text-[11px] text-amber-800 mt-1">
                          Please register using <strong>Option 1 (Instant UPI QR)</strong> on the left.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-2 mb-4 text-stone-600">
                  <div className="flex items-center justify-between">
                    <span>Payable Amount:</span>
                    <span className="font-extrabold text-stone-900 text-sm">₹{totalAmount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Registered Attendee:</span>
                    <span className="font-semibold text-stone-800">{participants[0].fullName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Environment:</span>
                    <span className="font-semibold text-stone-800">
                      {settings.appEnv === 'development' ? 'Development (Real Test Mode)' : 'Production (Strict Live Only)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Verification Mode:</span>
                    <span className="font-semibold text-stone-800">Server HMAC + Razorpay API</span>
                  </div>
                </div>

                <div className="p-3 bg-red-50/50 rounded-lg border border-red-100 text-[11px] text-stone-700 mb-6">
                  <span className="font-bold text-[#B22222]">Verification Guarantee:</span> Registrations, attendee QR codes, and confirmation emails are only issued after confirmed cryptographic HMAC signature and verified Razorpay API payment capture.
                </div>
              </div>

              <div>
                <button
                  type="button"
                  id="btn-razorpay-checkout"
                  disabled={isProcessing}
                  onClick={handleRazorpayCheckout}
                  className={`w-full py-3.5 px-4 font-bold text-xs sm:text-sm rounded-lg shadow-sm cursor-pointer flex items-center justify-center gap-2 ${
                    (settings.appEnv === 'development' ? settings.razorpayConnected : settings.razorpayLiveConnected)
                      ? 'bg-[#B22222] hover:bg-[#961c1c] active:bg-[#7e1717] text-white'
                      : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  {isProcessing
                    ? 'Initiating Gateway...'
                    : (settings.appEnv === 'development' ? settings.razorpayConnected : settings.razorpayLiveConnected)
                    ? `Pay ₹${totalAmount} via Razorpay ${settings.appEnv === 'development' ? '(Test Mode)' : '(Live)'}`
                    : `Razorpay ${settings.appEnv === 'development' ? 'Test' : 'Live'} Gateway Not Connected`}
                </button>
              </div>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={() => setStep('form')}
              className="text-xs font-semibold text-stone-500 hover:text-stone-800"
            >
              ← Back to Participant Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
