import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Award,
  CheckCircle2,
  FileText,
  HelpCircle,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Ticket,
} from 'lucide-react';
import { EventItem } from '../types';

interface EventDetailPageProps {
  event: EventItem;
  onNavigate: (path: string) => void;
}

export const EventDetailPage: React.FC<EventDetailPageProps> = ({ event, onNavigate }) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  const categoryPath = `/events/${event.category}`;

  return (
    <div className="py-8 sm:py-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[80vh]">
      {/* Back breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-stone-500 mb-6">
        <button
          onClick={() => onNavigate('/')}
          className="hover:text-stone-900 font-medium cursor-pointer"
        >
          Home
        </button>
        <span>/</span>
        <button
          onClick={() => onNavigate(categoryPath)}
          className="hover:text-stone-900 font-medium capitalize cursor-pointer"
        >
          {event.category}
        </button>
        <span>/</span>
        <span className="text-stone-800 font-bold">{event.title}</span>
      </div>

      {/* Main Header Card */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8 shadow-xs mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <span className="text-xs font-bold uppercase tracking-widest text-[#B22222] bg-red-50 px-2.5 py-1 rounded">
            {event.category.toUpperCase()}
          </span>
          <span className="text-xs font-bold px-3 py-1 bg-stone-100 text-stone-800 rounded-full border border-stone-200">
            {event.teamSizeLabel}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight mb-2">
          {event.title}
        </h1>
        <p className="text-base font-semibold text-[#B22222] mb-4">
          {event.tagline}
        </p>

        <p className="text-sm text-stone-700 leading-relaxed mb-6 max-w-3xl">
          {event.description || '[EVENT DESCRIPTION WILL BE UPDATED]'}
        </p>

        {/* Key metadata grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-stone-50 border border-stone-200 rounded-lg text-xs">
          <div>
            <span className="text-stone-500 block mb-1 flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-[#B22222]" /> Date
            </span>
            <span className="font-bold text-stone-900">{event.date}</span>
          </div>

          <div>
            <span className="text-stone-500 block mb-1 flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-[#B22222]" /> Time
            </span>
            <span className="font-bold text-stone-900">{event.time}</span>
          </div>

          <div>
            <span className="text-stone-500 block mb-1 flex items-center gap-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#B22222]" /> Venue
            </span>
            <span className="font-bold text-stone-900 truncate block">{event.venue}</span>
          </div>

          <div>
            <span className="text-stone-500 block mb-1 flex items-center gap-1 font-medium">
              <Users className="w-3.5 h-3.5 text-[#B22222]" /> Registration Fee
            </span>
            <span className="font-bold text-stone-900">
              {event.category === 'workshops'
                ? '₹350 / person'
                : event.category === 'technical'
                ? '₹1050 / team of 3'
                : 'Included with Tech Event'}
            </span>
          </div>
        </div>

        {/* Action button */}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            id="event-detail-register-btn"
            onClick={() => onNavigate('/register')}
            className="px-6 py-3 bg-[#B22222] hover:bg-[#961c1c] active:bg-[#7e1717] text-white font-bold text-sm rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Ticket className="w-4 h-4" />
            Register for {event.title}
          </button>

          <button
            onClick={() => onNavigate(categoryPath)}
            className="px-4 py-3 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 font-semibold text-sm rounded-lg cursor-pointer transition-colors"
          >
            Back to {event.category}
          </button>
        </div>
      </div>

      {/* Structured Sections */}
      <div className="space-y-6 text-stone-800">
        {/* Section: Eligibility & Team Size */}
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
          <h2 className="text-base font-bold text-stone-900 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#B22222]" />
            Eligibility & Team Size
          </h2>
          <div className="space-y-2 text-xs leading-relaxed text-stone-700">
            <p>
              <span className="font-semibold text-stone-900">Eligibility:</span> {event.eligibility}
            </p>
            <p>
              <span className="font-semibold text-stone-900">Team Formation:</span> {event.teamSizeLabel}
            </p>
            {event.category === 'technical' && (
              <p className="text-amber-800 bg-amber-50 p-2.5 rounded border border-amber-200 mt-2 font-medium">
                Mandatory rule: Technical events strictly require exactly 3 participants per team (Team Leader + 2 Members). Individual or 2-person registrations are not accepted.
              </p>
            )}
            {event.category === 'workshops' && (
              <p className="text-stone-600 bg-stone-50 p-2.5 rounded border border-stone-200 mt-2">
                Workshop registration is individual (1 participant). Workshop attendees run full-day lab programs and cannot take part in other technical or non-technical events.
              </p>
            )}
            {event.category === 'non-technical' && (
              <p className="text-amber-800 bg-amber-50 p-2.5 rounded border border-amber-200 mt-2 font-medium">
                Non-technical events can only be registered if your team also registers for at least one Technical Event.
              </p>
            )}
          </div>
        </div>

        {/* Section: Rules */}
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
          <h2 className="text-base font-bold text-stone-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#B22222]" />
            Rules & Regulations
          </h2>
          <ul className="space-y-2 text-xs text-stone-700">
            {event.rules && event.rules.length > 0 ? (
              event.rules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B22222] mt-1.5 shrink-0" />
                  <span>{rule}</span>
                </li>
              ))
            ) : (
              <li className="text-stone-400 italic">[EVENT RULES WILL BE UPDATED]</li>
            )}
          </ul>
        </div>

        {/* Section: Event Procedure */}
        {event.procedure && event.procedure.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
            <h2 className="text-base font-bold text-stone-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#B22222]" />
              Event Procedure & Rounds
            </h2>
            <ol className="space-y-2.5 text-xs text-stone-700 list-decimal pl-4">
              {event.procedure.map((proc, idx) => (
                <li key={idx} className="leading-relaxed">
                  {proc}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Section: What participants will get (Perks) */}
        {event.perks && event.perks.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
            <h2 className="text-base font-bold text-stone-900 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#B22222]" />
              What Participants Will Receive
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-stone-700">
              {event.perks.map((perk, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-stone-50 rounded border border-stone-100">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: Expected Outcomes & Certificates */}
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
          <h2 className="text-base font-bold text-stone-900 mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-[#B22222]" />
            Expected Outcomes & Certification
          </h2>
          <div className="space-y-3 text-xs text-stone-700">
            {event.outcomes && event.outcomes.length > 0 && (
              <div>
                <span className="font-semibold text-stone-900 block mb-1">Learning / Competition Outcomes:</span>
                <ul className="list-disc pl-4 space-y-1">
                  {event.outcomes.map((out, idx) => (
                    <li key={idx}>{out}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <span className="font-semibold text-stone-900 block mb-1">Certificates:</span>
              <p>{event.certificates}</p>
            </div>
          </div>
        </div>

        {/* Section: Important Instructions */}
        {event.importantInstructions && event.importantInstructions.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
            <h2 className="text-base font-bold text-stone-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#B22222]" />
              Important Instructions
            </h2>
            <ul className="space-y-2 text-xs text-stone-700">
              {event.importantInstructions.map((ins, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-600 mt-1.5 shrink-0" />
                  <span>{ins}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Section: FAQs */}
        {event.faqs && event.faqs.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
            <h2 className="text-base font-bold text-stone-900 mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#B22222]" />
              Frequently Asked Questions
            </h2>
            <div className="space-y-2">
              {event.faqs.map((faq, idx) => (
                <div key={idx} className="border border-stone-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full text-left p-3 text-xs font-bold text-stone-900 bg-stone-50 hover:bg-stone-100 flex items-center justify-between cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {openFaqIndex === idx ? (
                      <ChevronUp className="w-4 h-4 text-stone-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-stone-500" />
                    )}
                  </button>
                  {openFaqIndex === idx && (
                    <div className="p-3 text-xs text-stone-600 bg-white border-t border-stone-200 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: Coordinator Details */}
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-6 shadow-xs">
          <h2 className="text-base font-bold text-stone-900 mb-2">
            Event Coordinator Contact
          </h2>
          <p className="text-xs text-stone-500 mb-4">
            For specific doubts regarding rules, abstract submission or event timings:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-white p-3 rounded-lg border border-stone-200">
              <span className="text-stone-400 block mb-0.5 font-medium">Coordinator:</span>
              <span className="font-bold text-stone-900 block">
                {event.coordinatorName || '[COORDINATOR NAME]'}
              </span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-stone-200">
              <span className="text-stone-400 block mb-0.5 font-medium">Phone / WhatsApp:</span>
              <span className="font-bold text-stone-900 block">
                {event.coordinatorPhone || '[COORDINATOR PHONE]'}
              </span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-stone-200">
              <span className="text-stone-400 block mb-0.5 font-medium">General Email:</span>
              <a
                href={`mailto:${event.coordinatorEmail}`}
                className="font-bold text-[#B22222] hover:underline block"
              >
                {event.coordinatorEmail || 'evitron26@gmail.com'}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Register CTA */}
        <div className="text-center pt-4">
          <button
            onClick={() => onNavigate('/register')}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#B22222] hover:bg-[#961c1c] active:bg-[#7e1717] text-white font-bold text-sm rounded-lg shadow-sm cursor-pointer transition-colors"
          >
            Register for EVITRON 2K26 Now
          </button>
        </div>
      </div>
    </div>
  );
};
