import React from 'react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { getInitials, isImageUrl } from '../../utils/media';
import { brandColors } from '../../utils/colors';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  variant?: 'circle' | 'square';
  showInitials?: boolean;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
  '2xl': 'w-20 h-20 text-xl font-bold',
};

export function Avatar({
  src,
  name = '?',
  size = 'md',
  className = '',
  variant = 'circle',
  showInitials = true,
}: AvatarProps) {
  const initials = getInitials(name);
  const isUrl = isImageUrl(src);
  
  // If src is a string but not a URL, it might be providing initials directly
  const displayInitials = (src && src.length <= 2) ? src.toUpperCase() : initials;

  const fallback = showInitials ? (
    <div
      className={`flex items-center justify-center text-white w-full h-full ${variant === 'circle' ? 'rounded-full' : 'rounded-lg'}`}
      style={{ backgroundColor: brandColors.electricBlue }}
    >
      {displayInitials}
    </div>
  ) : null;

  return (
    <div className={`relative flex-shrink-0 ${sizeClasses[size]} ${className}`}>
      <ImageWithFallback
        src={isUrl ? src : undefined}
        alt={name}
        className={`w-full h-full object-cover ${variant === 'circle' ? 'rounded-full' : 'rounded-lg'}`}
        fallback={fallback}
      />
    </div>
  );
}
