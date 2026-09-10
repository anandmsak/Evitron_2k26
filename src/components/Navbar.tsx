import React, { useState } from 'react';
import { Menu, X, Calendar, MapPin, ShieldCheck, Ticket } from 'lucide-react';
import { SiteSettings } from '../types';

interface NavbarProps {
  settings: SiteSettings;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ settings, currentPath, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Workshops', path: '/events/workshops' },
    { label: 'Technical', path: '/events/technical' },
    { label: 'Non-Technical', path: '/events/non-technical' },
    { label: 'Verify Ticket', path: '/ticket' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-stone-200">
      {/* Top Banner (Dark Bar) */}
      <div className="bg-stone-950 text-white text-xs py-2 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-semibold text-stone-100">
              <Calendar className="w-4 h-4 text-[#B22222]" />
              08 Oct 2026
            </span>
            <span className="bg-[#B22222] text-white px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide">
              VELOCITY & IEEE
            </span>
            <span className="hidden lg:inline text-stone-500">•</span>
            <span className="hidden lg:inline text-stone-400 font-medium">Mahendra Engineering College (Autonomous)</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Hamburger on Top Bar for Mobile */}
            <button
              id="top-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="p-1 rounded text-white hover:text-stone-300 md:hidden flex items-center justify-center cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="hidden md:flex items-center gap-3 text-xs text-stone-300">
              <span className="flex items-center gap-1 text-stone-400">
                <MapPin className="w-3.5 h-3.5 text-[#B22222]" />
                Namakkal, TN
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Bar (White Bar) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-white">
        <div className="flex items-center justify-between h-18 py-2">
          {/* Logo & Symposium Title & National Symposium Badge */}
          <button
            id="nav-logo-button"
            onClick={() => handleNav('/')}
            className="flex items-center gap-3 text-left focus:outline-none rounded-lg p-0.5 group cursor-pointer"
          >
            {/* College Seal in rounded square card */}
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white border border-stone-200 shadow-xs flex items-center justify-center p-1 shrink-0 overflow-hidden group-hover:border-stone-300 transition-colors">
              <img
                src="/emblem.png"
                alt="Mahendra Engineering College"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* EVITRON 2K26 Text */}
            <div className="flex flex-col text-left">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 leading-none">
                EVITRON
              </span>
              <span className="text-xl sm:text-2xl font-black tracking-tight text-[#B22222] leading-tight">
                2K26
              </span>
            </div>

            {/* National Symposium Badge */}
            <div className="border border-stone-200 bg-stone-50 text-[9px] sm:text-[10px] font-bold text-stone-600 px-2 py-1 rounded-md text-center leading-tight uppercase ml-0.5 sm:ml-1">
              <div>NATIONAL</div>
              <div>SYMPOSIUM</div>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const isActive = currentPath === link.path;
              return (
                <button
                  key={link.path}
                  id={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => handleNav(link.path)}
                  className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${
                    isActive
                      ? 'text-[#B22222] bg-red-50'
                      : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}

            <div className="pl-2">
              <button
                id="nav-register-desktop-btn"
                onClick={() => handleNav('/register')}
                className="px-5 py-2 text-sm font-bold text-white bg-[#B22222] hover:bg-[#961c1c] active:bg-[#7e1717] rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                Register
              </button>
            </div>
          </nav>

          {/* Mobile Right: Register Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              id="mobile-register-header-btn"
              onClick={() => handleNav('/register')}
              className="px-4 py-2 text-sm font-bold text-white bg-[#B22222] hover:bg-[#961c1c] rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Register
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 pt-3 pb-6 space-y-2 shadow-lg animate-in slide-in-from-top-2">
          {navLinks.map((link) => (
            <button
              key={link.path}
              id={`mobile-nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => handleNav(link.path)}
              className="w-full text-left px-4 py-3 text-base font-semibold rounded-lg text-stone-800 hover:bg-stone-50 active:bg-stone-100 min-h-[44px] flex items-center"
            >
              {link.label}
            </button>
          ))}
          <div className="pt-2">
            <button
              id="mobile-nav-register-full"
              onClick={() => handleNav('/register')}
              className="w-full py-3.5 px-4 text-center font-bold text-white bg-[#B22222] hover:bg-[#961c1c] rounded-lg shadow-sm min-h-[44px] flex items-center justify-center gap-2"
            >
              <Ticket className="w-5 h-5" />
              Register for EVITRON 2K26
            </button>
          </div>
          <div className="pt-3 border-t border-stone-100 text-xs text-stone-500 text-center">
            ECE Dept, Mahendra Engineering College • Namakkal
          </div>
        </div>
      )}
    </header>
  );
};
