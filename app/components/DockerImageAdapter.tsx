// app/components/DockerImageAdapter.tsx
import React, { useState, useEffect } from "react";
import { Bike } from "lucide-react";

interface DockerImageAdapterProps {
  src: string | null;
  alt: string;
  className?: string;
  fallbackText?: string;
}

/**
 * Special image component designed to work reliably in Docker environments
 * 
 * This component completely bypasses Next.js Image optimization, which can be problematic
 * in Docker containers, especially with mounted volumes.
 */
const DockerImageAdapter: React.FC<DockerImageAdapterProps> = ({
  src,
  alt,
  className = "object-cover w-full h-full",
  fallbackText = "No image available",
}) => {
  const [error, setError] = useState(false);
  const [imagePath, setImagePath] = useState<string | null>(src);
  
  // For Docker, ensure image paths are properly formed
  useEffect(() => {
    if (src) {
      // Handle cases where the URL might be relative or need the base URL
      if (src.startsWith('/uploads/')) {
        // If NEXT_PUBLIC_BASE_URL is defined, use it for absolute URLs in Docker
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
        if (baseUrl && !src.startsWith(baseUrl)) {
          setImagePath(`${baseUrl}${src}`);
        } else {
          setImagePath(src);
        }
      } else {
        setImagePath(src);
      }
    } else {
      setImagePath(null);
    }
  }, [src]);

  // If no source or error occurred, show fallback
  if (!imagePath || error) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-100 text-gray-400">
        <Bike size={48} className="mb-2" />
        <p className="text-sm">{fallbackText}</p>;
      </div>
    );
  }

  // Use standard img tag for all images - safer in Docker
  return (
    <img
      src={imagePath}
      alt={alt}
      className={className}
      onError={() => {
        console.error(`Image failed to load: ${imagePath}`);
        setError(true);
      }}
    />
  );
};

export default DockerImageAdapter;