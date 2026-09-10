import React from 'react';
import { Cpu, Wrench, Sparkles, ArrowRight, Users, CheckCircle2 } from 'lucide-react';
import { EventItem } from '../types';

interface CategorySectionProps {
  events: EventItem[];
  onNavigate: (path: string) => void;
}

export const CategorySection: React.FC<CategorySectionProps> = ({ events, onNavigate }) => {
  const workshopEvents = events.filter((e) => e.category === 'workshops');
  const technicalEvents = events.filter((e) => e.category === 'technical');
  const nonTechnicalEvents = events.filter((e) => e.category === 'non-technical');

  return (
    <div className="py-12 bg-stone-100/60 border-y border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-[#B22222] block mb-1">
            Symposium Tracks
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Event Categories
          </h2>
          <p className="text-sm text-stone-600 mt-2">
            Participate in intensive hands-on workshops or compete in technical and non-technical arena events.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* 1. WORKSHOPS CARD */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 sm:p-7 shadow-xs flex flex-col justify-between hover:border-stone-300 transition-all">
            <div>
              <div className="w-12 h-12 rounded-lg bg-red-50 text-[#B22222] flex items-center justify-center mb-4">
                <Wrench className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xl font-extrabold text-stone-900 tracking-tight">WORKSHOPS</h3>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-stone-100 text-stone-700 rounded">
                  Individual (1 Person)
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium mb-4">
                Comprehensive full-day hands-on practical lab sessions with industry tools.
              </p>

              <div className="space-y-2.5 mb-6">
                {workshopEvents.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => onNavigate(`/events/workshops/${w.slug}`)}
                    className="p-2.5 rounded-lg border border-stone-100 hover:border-stone-300 hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-stone-800 text-sm">{w.title}</div>
                    <div className="text-xs text-stone-500">{w.tagline}</div>
                  </div>
                ))}
              </div>

              <div className="bg-stone-50 rounded-lg p-3 text-xs text-stone-600 mb-6 border border-stone-100">
                <span className="font-semibold text-stone-800">Fee:</span> ₹350 per person • Certificate, Food & Kit included.
                <div className="text-[11px] text-amber-700 mt-1 font-medium">
                  Note: Participant can register for ONE workshop only.
                </div>
              </div>
            </div>

            <button
              id="btn-view-workshops"
              onClick={() => onNavigate('/events/workshops')}
              className="w-full py-3 px-4 bg-[#B22222] hover:bg-[#961c1c] active:bg-[#7e1717] text-white font-bold text-sm rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>VIEW WORKSHOPS</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* 2. TECHNICAL EVENTS CARD */}
          <div className="bg-white border-2 border-stone-300 rounded-xl p-6 sm:p-7 shadow-xs flex flex-col justify-between relative hover:border-[#B22222]/50 transition-all">
            <div className="absolute -top-3 right-6 bg-[#B22222] text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider">
              Popular Track
            </div>

            <div>
              <div className="w-12 h-12 rounded-lg bg-stone-100 text-stone-800 flex items-center justify-center mb-4">
                <Cpu className="w-6 h-6 text-[#B22222]" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xl font-extrabold text-stone-900 tracking-tight">TECHNICAL EVENTS</h3>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-stone-100 text-stone-700 rounded">
                  Team of Exactly 3
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium mb-4">
                Research presentation, working project display & autonomous robotics racing.
              </p>

              <div className="space-y-2.5 mb-6">
                {technicalEvents.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onNavigate(`/events/technical/${t.slug}`)}
                    className="p-2.5 rounded-lg border border-stone-100 hover:border-stone-300 hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-stone-800 text-sm">{t.title}</div>
                    <div className="text-xs text-stone-500">{t.tagline}</div>
                  </div>
                ))}
              </div>

              <div className="bg-stone-50 rounded-lg p-3 text-xs text-stone-600 mb-6 border border-stone-100">
                <span className="font-semibold text-stone-800">Fee:</span> ₹1050 per 3-person team (₹350/person).
                <div className="text-[11px] text-emerald-700 mt-1 font-medium">
                  Perk: Also qualifies team to enter Non-Technical events!
                </div>
              </div>
            </div>

            <button
              id="btn-view-technical"
              onClick={() => onNavigate('/events/technical')}
              className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 active:bg-black text-white font-bold text-sm rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>VIEW TECHNICAL EVENTS</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* 3. NON-TECHNICAL EVENTS CARD */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 sm:p-7 shadow-xs flex flex-col justify-between hover:border-stone-300 transition-all">
            <div>
              <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-amber-700" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xl font-extrabold text-stone-900 tracking-tight">NON-TECHNICAL</h3>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-stone-100 text-stone-700 rounded">
                  4 Exciting Events
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium mb-4">
                Aptitude quest, prompt crafting, tech memes, and hardware mystery solving.
              </p>

              <div className="space-y-2 mb-6">
                {nonTechnicalEvents.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => onNavigate(`/events/non-technical/${n.slug}`)}
                    className="p-2 rounded-lg border border-stone-100 hover:border-stone-300 hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-stone-800 text-xs">{n.title}</div>
                    <div className="text-[11px] text-stone-500">{n.tagline}</div>
                  </div>
                ))}
              </div>

              <div className="bg-stone-50 rounded-lg p-3 text-xs text-stone-600 mb-6 border border-stone-100">
                <span className="font-semibold text-stone-800">Eligibility:</span> Requires at least 1 Technical event registration.
                <div className="text-[11px] text-stone-500 mt-1">
                  Cash prizes & awards for standout teams.
                </div>
              </div>
            </div>

            <button
              id="btn-view-non-technical"
              onClick={() => onNavigate('/events/non-technical')}
              className="w-full py-3 px-4 bg-white hover:bg-stone-100 active:bg-stone-200 text-stone-900 border border-stone-300 font-bold text-sm rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>VIEW NON-TECHNICAL EVENTS</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
