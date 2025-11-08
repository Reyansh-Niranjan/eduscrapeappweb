import { useEffect, useState } from "react";
import { getOptimizedImageUrl } from "../utils/image";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  sizes?: string;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = "",
  loading = "lazy",
  fetchPriority = "auto",
  sizes = "100vw",
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(() => getOptimizedImageUrl(src, width, 75));

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
    setCurrentSrc(getOptimizedImageUrl(src, width, 75));
  }, [src, width]);

  if (!src) {
    return null;
  }

  if (hasError) {
    const fallbackClassName = `${className} flex items-center justify-center bg-gradient-to-br from-purple-600/20 to-teal-600/20 text-teal-200 text-xs`.trim();
    return (
      <div
        className={fallbackClassName}
        style={{ minHeight: height }}
      >
        image unavailable
      </div>
    );
  }

  const computedClassName = `${className} transition-opacity duration-500 ${isLoaded ? "opacity-100" : "opacity-0"}`.trim();

  return (
    <img
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      sizes={sizes}
      className={computedClassName}
      style={{ objectFit: "cover", backgroundColor: "rgba(15, 52, 96, 0.2)" }}
      onLoad={() => setIsLoaded(true)}
      onError={() => {
        if (currentSrc !== src) {
          setCurrentSrc(src);
          setIsLoaded(false);
        } else {
          setHasError(true);
        }
      }}
    />
  );
}
