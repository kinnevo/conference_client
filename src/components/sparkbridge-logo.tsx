'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface SparkBridgeLogoProps {
  className?: string;
  /** Logo height in pixels; width scales to preserve aspect ratio */
  logoHeight?: number;
  /** Whether to show the text "SparkBridge" next to the logo */
  showText?: boolean;
  /** Text size: 'sm' | 'md' | 'lg' */
  textSize?: 'sm' | 'md' | 'lg';
}

export function SparkBridgeLogo({
  className,
  logoHeight = 36,
  showText = true,
  textSize = 'md',
}: SparkBridgeLogoProps) {
  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-5xl',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Image
        src="/logo.png"
        alt="SparkBridge"
        width={logoHeight}
        height={logoHeight}
        className="flex-shrink-0 object-contain"
        priority
      />
      {showText && (
        <span className={cn('font-bold text-gray-900', textSizes[textSize])}>
          SparkBridge
        </span>
      )}
    </div>
  );
}
