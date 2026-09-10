import React from 'react';
import { Mail, Phone, Instagram, MapPin, Award, ExternalLink } from 'lucide-react';
import { SiteSettings } from '../types';
import { defaultSettings } from '../data/defaultSettings';

interface FooterProps {
  settings?: SiteSettings;
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ settings, onNavigate }) => {
  const currentSettings = settings || defaultSettings;
  return (
    <footer className="bg-stone-900 text-stone-300 pt-12 pb-8 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Col 1: About EVITRON */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <img
                src="/emblem.png"
                alt="EVITRON 2K26 Reactor Emblem"
                className="w-9 h-9 rounded-lg object-contain shadow-sm"
                referrerPolicy="no-referrer"
              />
              <span className="text-xl font-extrabold text-white tracking-tight">
                EVITRON <span className="text-[#B22222]">2K26</span>
              </span>
            </div>
            <p className="text-xs text-stone-400 font-semibold uppercase tracking-wider">
              National Level Technical Symposium
            </p>
            <p className="text-xs text-stone-300 leading-relaxed">
              Department of Electronics and Communication Engineering, Mahendra Engineering College (Autonomous). In association with VELOCITY & IEEE Student Branch.
            </p>
            <div className="pt-2">
              <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded bg-stone-800 text-stone-200 border border-stone-700">
                Motto: Create. Innovate. Elevate.
              </span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-4 border-b border-stone-800 pb-2">
              Important Links
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('/')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/events/workshops')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Workshops (Cadence, Embedded, LabVIEW)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/events/technical')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Technical Events (Paper, Project, Robotics)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/events/non-technical')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Non-Technical Events
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/register')}
                  className="text-[#ff7878] font-semibold hover:underline cursor-pointer"
                >
                  Symposium Registration
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/ticket')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Verify / Download Ticket Pass
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Faculty & Convenor */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-4 border-b border-stone-800 pb-2">
              Organizing Committee
            </h4>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-stone-400 font-medium block">Convenor:</span>
                <span className="font-semibold text-white">Dr. V. Senthil Kumaran</span>
                <span className="text-stone-400 block">HOD - ECE</span>
              </div>
              <div>
                <span className="text-stone-400 font-medium block">Faculty Coordinators:</span>
                <div className="text-stone-200">
                  <p className="font-semibold text-white">Dr. M. Ravikumar</p>
                  <a href="tel:9940747695" className="text-stone-400 hover:text-white">
                    +91 99407 47695
                  </a>
                </div>
                <div className="text-stone-200 mt-1">
                  <p className="font-semibold text-white">Dr. B. Prabhakaran</p>
                  <a href="tel:9600997789" className="text-stone-400 hover:text-white">
                    +91 96009 97789
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Col 4: Student Coordinators & Contact */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-4 border-b border-stone-800 pb-2">
              Student Coordinators & Help
            </h4>
            <div className="space-y-3 text-xs">
              <div>
                <p className="font-semibold text-white">Anandha Krishnan P</p>
                <a href="tel:6383109049" className="text-stone-400 hover:text-white flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#B22222]" /> +91 63831 09049
                </a>
              </div>
              <div>
                <p className="font-semibold text-white">Sri Sarvesan M G</p>
                <a href="tel:6374933410" className="text-stone-400 hover:text-white flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#B22222]" /> +91 63749 33410
                </a>
              </div>

              <div className="pt-2 border-t border-stone-800 space-y-1.5">
                <a
                  href={`mailto:${currentSettings.contactEmail}`}
                  className="flex items-center gap-1.5 text-stone-300 hover:text-white"
                >
                  <Mail className="w-3.5 h-3.5 text-[#B22222]" />
                  <span>{currentSettings.contactEmail}</span>
                </a>
                <a
                  href={`https://instagram.com/${currentSettings.instagramHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-stone-300 hover:text-white"
                >
                  <Instagram className="w-3.5 h-3.5 text-[#B22222]" />
                  <span>@{currentSettings.instagramHandle}</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Venue & Copyright */}
        <div className="pt-8 border-t border-stone-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-stone-400">
          <div className="flex items-center gap-2 text-center md:text-left">
            <MapPin className="w-4 h-4 text-[#B22222] shrink-0" />
            <span>Mahendhirapuri, Mallasamudram (M), Namakkal (Dt), Tamil Nadu - 637 503</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-right text-[11px] text-stone-500">
            <span>© 2026 Department of ECE, Mahendra Engineering College.</span>
            <span className="hidden sm:inline text-stone-700">•</span>
            <button
              id="footer-organizer-portal-link"
              onClick={() => onNavigate('/admin')}
              className="text-[10px] text-stone-600 hover:text-stone-400 transition-colors cursor-pointer"
            >
              Coordinator Portal
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
