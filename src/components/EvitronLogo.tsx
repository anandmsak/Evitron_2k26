import React from 'react';

interface EvitronLogoProps {
  /**
   * Layout display mode:
   * - 'full': The full EVITRON 2K26 metallic wordmark with the reactor core
   * - 'mark': Just the circular cybernetic reactor core emblem
   * - 'combined': The emblem + typography
   */
  variant?: 'full' | 'mark' | 'combined';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  showTagline?: boolean;
}

export const EvitronLogo: React.FC<EvitronLogoProps> = ({
  variant = 'full',
  className = '',
  size = 'md',
  showTagline = false,
}) => {
  // Height sizing presets
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10 sm:h-12',
    lg: 'h-14 sm:h-16',
    xl: 'h-20 sm:h-24',
    hero: 'h-24 sm:h-32 md:h-40',
  };

  if (variant === 'mark') {
    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>
        <img
          src="/emblem.png"
          alt="EVITRON 2K26 Core Mark"
          className={`${sizeClasses[size]} w-auto aspect-square object-contain drop-shadow-sm`}
          referrerPolicy="no-referrer"
          loading="eager"
        />
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col items-center justify-center select-none ${className}`}>
      <img
        src="/logo.png"
        alt="EVITRON 2K26 - National Level Technical Symposium"
        className={`${sizeClasses[size]} w-auto object-contain drop-shadow-md`}
        referrerPolicy="no-referrer"
        loading="eager"
      />
      {showTagline && (
        <div className="flex items-center justify-center gap-1.5 mt-2 text-[11px] sm:text-xs font-bold tracking-[0.25em] text-stone-600 uppercase">
          <span>CREATE</span>
          <span className="text-[#B22222] font-black">•</span>
          <span>INNOVATE</span>
          <span className="text-[#B22222] font-black">•</span>
          <span>ELEVATE</span>
        </div>
      )}
    </div>
  );
};
