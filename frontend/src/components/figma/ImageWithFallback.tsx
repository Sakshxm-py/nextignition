import React, { useState, useEffect } from 'react';
import { isImageUrl } from '../../utils/media';

const ERROR_IMG_SVG =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
}

export function ImageWithFallback({ src, alt, className, style, fallback, ...props }: ImageWithFallbackProps) {
  const [error, setError] = useState(false);
  const [isValidSrc, setIsValidSrc] = useState(false);

  useEffect(() => {
    setError(false);
    setIsValidSrc(!!src && isImageUrl(src));
  }, [src]);

  const handleError = () => {
    setError(true);
  };

  if (!isValidSrc || error) {
    return fallback ? (
      <div className={className} style={style}>
        {fallback}
      </div>
    ) : (
      <div
        className={`inline-block bg-gray-100 text-center align-middle flex items-center justify-center ${className ?? ''}`}
        style={style}
      >
        <img src={ERROR_IMG_SVG} alt="Error" className="opacity-20 w-1/2 h-1/2" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={handleError}
      referrerPolicy="no-referrer"
      {...props}
    />
  );
}
