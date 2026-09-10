import React from 'react';
import { ArrowLeft, Clock, MapPin, Users, Award, CheckCircle, ArrowRight, ShieldAlert, Sparkles, BookOpen } from 'lucide-react';
import { EventCategory, EventItem } from '../types';

interface CategoryPageProps {
  category: EventCategory;
  events: EventItem[];
  onNavigate: (path: string) => void;
}

export const CategoryPage: React.FC<CategoryPageProps> = ({ category, events, onNavigate }) => {
  const filteredEvents = events.filter((e) => e.category === category);

  const categoryMeta = {
    workshops: {
      title: 'Workshops',
      subtitle: 'Intensive Full-Day Practical Training with Industry Software & Hardware',
      badge: 'Individual Registration (₹350 / Person)',
      ruleNotice: 'Participants can register for ONE workshop only. Workshop participants cannot take part in technical or non-technical events due to parallel schedules.',
      alertType: 'info',
    },
    technical: {
      title: 'Technical Events',
      subtitle: 'Present Your Research, Working Hardware Prototypes & Autonomous Line Followers',
      badge: 'Team Size: Exactly 3 Members (₹1050 / Team)',
      ruleNotice: 'Every technical event requires a team of exactly 3 participants. Registering for a technical event also qualifies your team to participate in Non-Technical events!',
      alertType: 'success',
    },
    'non-technical': {
      title: 'Non-Technical Events',
      subtitle: 'Sharpen Your Logical Aptitude, AI Prompt Crafting, Tech Memes & Hardware Deduction',
      badge: 'Team of 3 (Included with Technical Registration)',
      ruleNotice: 'Important Rule: Non-technical events can only be registered if your team has selected at least one Technical Event (TECHPAPER, EVOLVEX, or TRACKTRON).',
      alertType: 'warning',
    },
  }[category];

  return (
    <div className="py-8 sm:py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[75vh]">
      {/* Back button */}
      <button
        onClick={() => onNavigate('/')}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 mb-6 px-3 py-1.5 bg-stone-100 rounded-md border border-stone-200 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </button>

      {/* Header */}
      <div className="mb-8 border-b border-stone-200 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#B22222]">
            EVITRON 2K26 • {category.toUpperCase()} TRACK
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 bg-stone-100 text-stone-800 rounded border border-stone-200">
            {categoryMeta.badge}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
          {categoryMeta.title}
        </h1>
        <p className="text-sm text-stone-600 mt-2 max-w-3xl">
          {categoryMeta.subtitle}
        </p>

        {/* Rule banner */}
        <div className="mt-4 p-3.5 bg-stone-50 border border-stone-200 rounded-lg flex items-start gap-2.5 text-xs text-stone-700">
          <ShieldAlert className="w-4 h-4 text-[#B22222] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-stone-900">Participation Regulation: </span>
            {categoryMeta.ruleNotice}
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((evt) => (
          <div
            key={evt.id}
            className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs flex flex-col justify-between hover:border-stone-400 transition-all"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  {evt.category.toUpperCase()}
                </span>
                <span className="text-[11px] font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                  {evt.teamSizeLabel}
                </span>
              </div>

              <h2 className="text-xl font-extrabold text-stone-900 mb-1">
                {evt.title}
              </h2>
              <p className="text-xs font-semibold text-[#B22222] mb-3">
                {evt.tagline}
              </p>
              <p className="text-xs text-stone-600 line-clamp-3 mb-4 leading-relaxed">
                {evt.description}
              </p>

              <div className="space-y-1.5 text-xs text-stone-600 border-t border-stone-100 pt-3 mb-5">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>{evt.time} • 08/10/2026</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span className="truncate">{evt.venue}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>{evt.eligibility}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-stone-100">
              <button
                onClick={() => onNavigate(`/events/${category}/${evt.slug}`)}
                className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <span>View Details & Rules</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onNavigate('/register')}
                className="w-full py-2 px-4 bg-white hover:bg-red-50 text-[#B22222] border border-[#B22222]/30 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                Register for this Track
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
