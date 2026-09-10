import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  /**
   * Flag indicating that the application data/setup is ready.
   * When true, the loading screen begins its smooth exit transition.
   */
  isAppReady: boolean;
  /**
   * Optional callback triggered when the loader has fully faded out and unmounted.
   */
  onFinished?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isAppReady, onFinished }) => {
  const [shouldExit, setShouldExit] = useState(false);
  const [isRendered, setIsRendered] = useState(true);

  useEffect(() => {
    // Lock scrolling on mount
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Minimum display time (600ms) to ensure a cohesive, non-flickering circuit animation
    const minTimer = setTimeout(() => {
      if (isAppReady) {
        setShouldExit(true);
      }
    }, 600);

    // Hard fallback safety timer (maximum 1600ms) to guarantee the loader never blocks the app
    const fallbackTimer = setTimeout(() => {
      setShouldExit(true);
    }, 1600);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(fallbackTimer);
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Trigger exit when isAppReady becomes true after minimum display time
  useEffect(() => {
    if (isAppReady) {
      const exitTimer = setTimeout(() => {
        setShouldExit(true);
      }, 550);
      return () => clearTimeout(exitTimer);
    }
  }, [isAppReady]);

  // Once shouldExit is true, wait for the 600ms CSS fade-out transition, then unmount
  useEffect(() => {
    if (shouldExit) {
      const unmountTimer = setTimeout(() => {
        setIsRendered(false);
        document.body.style.overflow = '';
        if (onFinished) onFinished();
      }, 650);
      return () => clearTimeout(unmountTimer);
    }
  }, [shouldExit, onFinished]);

  if (!isRendered) {
    return null;
  }

  return (
    <div
      id="evitron-initial-loader"
      role="status"
      aria-live="polite"
      aria-label="Loading EVITRON 2K26"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#FAFAF9] select-none transition-all duration-600 ease-out ${
        shouldExit
          ? 'opacity-0 pointer-events-none scale-[0.985]'
          : 'opacity-100 pointer-events-auto scale-100'
      }`}
    >
      <div className="w-full max-w-sm px-6 flex flex-col items-center text-center">
        {/* Circuit Board & Central Emblem */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 mb-5 flex items-center justify-center">
          {/* Subtle PCB Background Grid Dots */}
          <svg
            className="absolute inset-0 w-full h-full text-stone-300/60"
            viewBox="0 0 128 128"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Corner alignment markers */}
            <circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.4" />
            <circle cx="116" cy="12" r="1.5" fill="currentColor" opacity="0.4" />
            <circle cx="12" cy="116" r="1.5" fill="currentColor" opacity="0.4" />
            <circle cx="116" cy="116" r="1.5" fill="currentColor" opacity="0.4" />

            {/* Circuit Base Traces */}
            <g stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" opacity="0.35">
              {/* Top Left Trace */}
              <path d="M 16 36 L 36 36 L 44 44" />
              <circle cx="16" cy="36" r="2.2" fill="#FAFAF9" stroke="currentColor" strokeWidth="1.2" />

              {/* Top Right Trace */}
              <path d="M 112 36 L 92 36 L 84 44" />
              <circle cx="112" cy="36" r="2.2" fill="#FAFAF9" stroke="currentColor" strokeWidth="1.2" />

              {/* Bottom Left Trace */}
              <path d="M 16 92 L 36 92 L 44 84" />
              <circle cx="16" cy="92" r="2.2" fill="#FAFAF9" stroke="currentColor" strokeWidth="1.2" />

              {/* Bottom Right Trace */}
              <path d="M 112 92 L 92 92 L 84 84" />
              <circle cx="112" cy="92" r="2.2" fill="#FAFAF9" stroke="currentColor" strokeWidth="1.2" />

              {/* Outer Microchip Perimeter Box */}
              <rect x="36" y="36" width="56" height="56" rx="8" />
            </g>

            {/* IC Pins (Top, Bottom, Left, Right) */}
            <g stroke="currentColor" strokeWidth="1" opacity="0.4">
              <line x1="48" y1="31" x2="48" y2="36" />
              <line x1="64" y1="31" x2="64" y2="36" />
              <line x1="80" y1="31" x2="80" y2="36" />

              <line x1="48" y1="92" x2="48" y2="97" />
              <line x1="64" y1="92" x2="64" y2="97" />
              <line x1="80" y1="92" x2="80" y2="97" />

              <line x1="31" y1="48" x2="36" y2="48" />
              <line x1="31" y1="64" x2="36" y2="64" />
              <line x1="31" y1="80" x2="36" y2="80" />

              <line x1="92" y1="48" x2="97" y2="48" />
              <line x1="92" y1="64" x2="97" y2="64" />
              <line x1="92" y1="80" x2="97" y2="80" />
            </g>

            {/* Active Circuit Pulse Signal (Animated Traveling Red Electronics Beam) */}
            <path
              d="M 16 36 L 36 36 L 44 44 L 84 44 L 92 36 L 112 36 M 112 92 L 92 92 L 84 84 L 44 84 L 36 92 L 16 92"
              fill="none"
              stroke="#B22222"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="circuit-signal-pulse"
            />

            {/* Traveling Signal on Outer Perimeter */}
            <rect
              x="36"
              y="36"
              width="56"
              height="56"
              rx="8"
              fill="none"
              stroke="#B22222"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="circuit-border-pulse"
            />

            {/* Node Solder Points / Micro Via Indicators */}
            <circle cx="44" cy="44" r="2.5" fill="#B22222" className="circuit-node-blink" />
            <circle cx="84" cy="44" r="2.5" fill="#B22222" className="circuit-node-blink-delay" />
            <circle cx="84" cy="84" r="2.5" fill="#B22222" className="circuit-node-blink" />
            <circle cx="44" cy="84" r="2.5" fill="#B22222" className="circuit-node-blink-delay" />
          </svg>

          {/* Central Reactor Core Emblem */}
          <div className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white border border-stone-200 shadow-sm flex items-center justify-center p-1">
            <img
              src="/emblem.png"
              alt="EVITRON Reactor Core Emblem"
              className="w-full h-full object-contain rounded-lg"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Symposium Official Logo */}
        <div className="flex items-center justify-center my-1">
          <img
            src="/logo.png"
            alt="EVITRON 2K26"
            className="h-9 sm:h-11 w-auto object-contain drop-shadow-sm"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Institution Context */}
        <p className="text-[11px] font-medium text-stone-500 tracking-wide mt-1">
          Mahendra Engineering College (Autonomous)
        </p>

        {/* Required Tagline */}
        <div className="flex items-center justify-center gap-1.5 mt-3 text-[11px] sm:text-xs font-bold tracking-[0.2em] text-stone-700 uppercase">
          <span>CREATE</span>
          <span className="text-[#B22222] font-black">•</span>
          <span>INNOVATE</span>
          <span className="text-[#B22222] font-black">•</span>
          <span>ELEVATE</span>
        </div>

        {/* Minimal Animated Loading Progress Line */}
        <div className="w-44 sm:w-52 h-[2.5px] bg-stone-200/80 rounded-full overflow-hidden mt-5 relative">
          <div className="evitron-progress-bar h-full bg-[#B22222] rounded-full" />
        </div>

        {/* Required Status Text */}
        <p className="text-[11px] font-mono tracking-wider text-stone-400 mt-2.5">
          Initializing EVITRON 2K26...
        </p>
      </div>

      {/* Embedded Component CSS for Pure Hardware-Accelerated Animation */}
      <style>{`
        /* Circuit Signal Traveling Pulse */
        .circuit-signal-pulse {
          stroke-dasharray: 24 140;
          stroke-dashoffset: 0;
          animation: circuitSignalTravel 1.6s linear infinite;
        }

        @keyframes circuitSignalTravel {
          0% {
            stroke-dashoffset: 164;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        /* Circuit Perimeter Box Pulse */
        .circuit-border-pulse {
          stroke-dasharray: 32 170;
          stroke-dashoffset: 0;
          animation: circuitBorderTravel 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        @keyframes circuitBorderTravel {
          0% {
            stroke-dashoffset: 202;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        /* Circuit Nodes Pulsing */
        .circuit-node-blink {
          animation: nodePulse 1.6s ease-in-out infinite;
        }
        .circuit-node-blink-delay {
          animation: nodePulse 1.6s ease-in-out infinite 0.8s;
        }

        @keyframes nodePulse {
          0%, 100% {
            opacity: 0.3;
            transform-origin: center;
          }
          50% {
            opacity: 1;
          }
        }

        /* Minimal Technical Progress Line */
        .evitron-progress-bar {
          width: 35%;
          animation: progressIndeterminate 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        @keyframes progressIndeterminate {
          0% {
            transform: translateX(-100%) scaleX(0.4);
          }
          50% {
            transform: translateX(120%) scaleX(1);
          }
          100% {
            transform: translateX(350%) scaleX(0.5);
          }
        }

        /* Respect Reduced Motion Preferences */
        @media (prefers-reduced-motion: reduce) {
          .circuit-signal-pulse,
          .circuit-border-pulse,
          .circuit-node-blink,
          .circuit-node-blink-delay,
          .evitron-progress-bar {
            animation: none !important;
          }
          .evitron-progress-bar {
            width: 100% !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
};
