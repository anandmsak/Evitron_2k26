import React from 'react';
import {
  Calendar,
  MapPin,
  Ticket,
  ArrowRight,
  Sparkles,
  Megaphone,
  Award,
  Coffee,
  Gift,
  FileText,
  Phone,
  Mail,
  Instagram,
  CheckCircle2,
  Users,
  Cpu,
} from 'lucide-react';
import { EventItem, SiteSettings } from '../types';
import { defaultSettings } from '../data/defaultSettings';
import { CountdownTimer } from '../components/CountdownTimer';
import { CategorySection } from '../components/CategorySection';

interface HomePageProps {
  settings?: SiteSettings;
  events: EventItem[];
  onNavigate: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ settings: propSettings, events, onNavigate }) => {
  const settings = propSettings || defaultSettings;
  return (
    <div className="space-y-12 pb-16">
      {/* Announcement bar matching image.png */}
      {settings.announcementActive && settings.announcementText && (
        <div className="bg-[#FDF2F2] border-b border-red-100 py-3 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto flex items-center justify-center gap-3 text-center">
            <Megaphone className="w-5 h-5 text-[#B22222] shrink-0" />
            <p className="text-xs sm:text-sm font-medium text-red-950 leading-relaxed text-left sm:text-center">
              {settings.announcementText}
            </p>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="pt-6 sm:pt-8 pb-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          {/* Department & College Badge */}
          <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 rounded-full bg-stone-50 border border-stone-200 text-stone-700 text-xs sm:text-sm font-bold tracking-wide uppercase shadow-2xs mb-6 sm:mb-7">
            <span>DEPT. OF ECE • MAHENDRA ENGINEERING COLLEGE</span>
            <span className="text-stone-300">|</span>
            <span className="text-[#B22222]">VELOCITY & IEEE</span>
          </div>

          {/* Official Symposium Logo */}
          <div className="flex justify-center items-center mb-4 sm:mb-5">
            <img
              src="/logo.png"
              alt="EVITRON 2K26 Official Logo"
              className="w-full max-w-[320px] sm:max-w-[400px] md:max-w-[440px] h-auto object-contain drop-shadow-sm"
              referrerPolicy="no-referrer"
              loading="eager"
            />
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-stone-900 tracking-tight uppercase mb-1.5 sm:mb-2">
            A NATIONAL LEVEL TECHNICAL SYMPOSIUM
          </h1>

          {/* Motto */}
          <p className="text-xs sm:text-sm font-semibold tracking-wide text-stone-500 mb-6 sm:mb-8">
            Motto: <span className="text-stone-900 font-extrabold tracking-widest uppercase">CREATE • INNOVATE • ELEVATE</span>
          </p>

          {/* Key Date & Location Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto mb-6">
            <div className="flex items-center justify-center gap-2.5 px-4 py-3 bg-white rounded-xl border border-stone-200 shadow-2xs text-xs sm:text-sm font-bold text-stone-900">
              <Calendar className="w-4 h-4 text-[#B22222] shrink-0" />
              <span>08 OCTOBER 2026 (Thursday)</span>
            </div>

            <div className="flex items-center justify-center gap-2.5 px-4 py-3 bg-white rounded-xl border border-stone-200 shadow-2xs text-xs sm:text-sm font-semibold text-stone-700">
              <MapPin className="w-4 h-4 text-[#B22222] shrink-0" />
              <span>Namakkal, Tamil Nadu</span>
            </div>
          </div>

          {/* Call to Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
            <button
              id="hero-explore-events-btn"
              onClick={() => {
                const el = document.getElementById('categories-container');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                else onNavigate('/events/workshops');
              }}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-stone-900 hover:bg-black text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-sm tracking-wide uppercase transition-colors cursor-pointer"
            >
              <span>EXPLORE EVENTS</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              id="hero-register-now-btn"
              onClick={() => onNavigate('/register')}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#B22222] hover:bg-[#961c1c] active:bg-[#7e1717] text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-sm tracking-wide uppercase transition-colors cursor-pointer"
            >
              <Ticket className="w-4 h-4" />
              <span>REGISTER NOW</span>
            </button>
          </div>
        </div>

        {/* Live Countdown Timer */}
        <div className="mt-12 max-w-xl mx-auto">
          <CountdownTimer targetDateStr={settings.countdownTarget} />
        </div>
      </section>

      {/* Perks & Key Dates Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 text-[#B22222] flex items-center justify-center shrink-0">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-stone-500 block uppercase">Registration</span>
              <span className="text-sm font-extrabold text-stone-900">₹350 / Person</span>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-stone-100 text-stone-800 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-[#B22222]" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-stone-500 block uppercase">Registration Closes</span>
              <span className="text-sm font-extrabold text-stone-900">01/10/2026</span>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-stone-100 text-stone-800 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-[#B22222]" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-stone-500 block uppercase">Paper Abstract Due</span>
              <span className="text-sm font-extrabold text-stone-900">27/09/2026</span>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-stone-500 block uppercase">All Registrants Get</span>
              <span className="text-xs font-extrabold text-stone-900">Food, Kit & Prizes</span>
            </div>
          </div>
        </div>
      </section>

      {/* Three Major Categories (Section 5) */}
      <div id="categories-container">
        <CategorySection events={events} onNavigate={onNavigate} />
      </div>

      {/* Perks Breakdown Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-xs font-bold uppercase tracking-widest text-[#B22222] block mb-1">
              Participant Benefits
            </span>
            <h2 className="text-2xl font-extrabold text-stone-900">
              What Every Participant Receives
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Included with your ₹350 registration fee
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80">
              <div className="w-9 h-9 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-[#B22222] mb-3">
                <Coffee className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-stone-900 text-sm mb-1">Food & Refreshments</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Complimentary breakfast, delicious lunch, and evening snacks during the symposium day.
              </p>
            </div>

            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80">
              <div className="w-9 h-9 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-[#B22222] mb-3">
                <Gift className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-stone-900 text-sm mb-1">Welcome Kit</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Official symposium delegate folder, personalized ID badge, notepad, and pen.
              </p>
            </div>

            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80">
              <div className="w-9 h-9 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-[#B22222] mb-3">
                <Award className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-stone-900 text-sm mb-1">Cash Prizes & Trophies</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Attractive cash prizes and winner mementos for top-performing technical and non-technical teams.
              </p>
            </div>

            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80">
              <div className="w-9 h-9 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-[#B22222] mb-3">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-stone-900 text-sm mb-1">Recognized Certificates</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Official certificates of participation / excellence awarded by VELOCITY Association & IEEE.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact & Coordination Desk */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 sm:p-8">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-xs font-bold uppercase tracking-widest text-[#B22222] block mb-1">
              Need Assistance?
            </span>
            <h2 className="text-2xl font-extrabold text-stone-900">
              Symposium Coordinators & Desk
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Reach out directly to faculty or student coordinators for queries
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Convenor */}
            <div className="bg-white p-5 rounded-xl border border-stone-200">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block mb-1">
                Convenor
              </span>
              <h3 className="text-base font-extrabold text-stone-900">Dr. V. Senthil Kumaran</h3>
              <p className="text-xs text-stone-600 font-medium mb-3">Head of Department — ECE</p>
              <div className="text-xs text-stone-500">
                Department of Electronics & Communication Engineering
              </div>
            </div>

            {/* Faculty Coordinators */}
            <div className="bg-white p-5 rounded-xl border border-stone-200">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block mb-1">
                Faculty Coordinators
              </span>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-bold text-stone-900 block">Dr. M. Ravikumar</span>
                  <a href="tel:9940747695" className="text-[#B22222] font-semibold hover:underline">
                    +91 99407 47695
                  </a>
                </div>
                <div className="pt-1 border-t border-stone-100">
                  <span className="font-bold text-stone-900 block">Dr. B. Prabhakaran</span>
                  <a href="tel:9600997789" className="text-[#B22222] font-semibold hover:underline">
                    +91 96009 97789
                  </a>
                </div>
              </div>
            </div>

            {/* Student Coordinators */}
            <div className="bg-white p-5 rounded-xl border border-stone-200">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block mb-1">
                Student Coordinators
              </span>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-bold text-stone-900 block">Anandha Krishnan P</span>
                  <a href="tel:6383109049" className="text-[#B22222] font-semibold hover:underline">
                    +91 63831 09049
                  </a>
                </div>
                <div className="pt-1 border-t border-stone-100">
                  <span className="font-bold text-stone-900 block">Sri Sarvesan M G</span>
                  <a href="tel:6374933410" className="text-[#B22222] font-semibold hover:underline">
                    +91 63749 33410
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
