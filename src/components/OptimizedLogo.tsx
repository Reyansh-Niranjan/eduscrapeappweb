import { useState, useEffect } from 'react';

interface OptimizedLogoProps {
  src: string;
  alt: string;
  className?: string;
  fallbackText?: string;
  width?: number;
  height?: number;
}

export default function OptimizedLogo({ 
  src, 
  alt, 
  className = "w-full h-full object-cover",
  fallbackText = "CC",
  width = 128,
  height = 128
}: OptimizedLogoProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, _setImageSrc] = useState(src);

  useEffect(() => {
    // Preload the image
    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.onerror = () => setHasError(true);
    img.src = src;
  }, [src]);

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-purple-600 to-teal-600 text-white font-bold text-2xl ${className}`}>
        {fallbackText}
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`${className} optimized-logo`}
      width={width}
      height={height}
      loading="eager"
      fetchPriority="high"
      decoding="async"
      style={{
        opacity: isLoaded ? 1 : 0.7,
        transition: 'opacity 0.3s ease-in-out',
        background: 'linear-gradient(135deg, #8B5CF6 0%, #14B8A6 100%)'
      }}
      onLoad={() => setIsLoaded(true)}
      onError={() => setHasError(true)}
    />
  );
}
