// app/components/ImageWithFallback.tsx
import React, { useState } from "react";
import Image, { ImageProps } from "next/image";
import { Bike } from "lucide-react";

interface ImageWithFallbackProps extends Omit<ImageProps, "src" | "alt"> {
  src: string | null;
  alt: string;
  fallbackText?: string;
}

/**
 * Image component with error handling and fallback
 * This handles the Next.js image optimization errors gracefully
 */
const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  fallbackText = "No image available",
  ...props
}) => {
  const [error, setError] = useState(false);

  // If no source or error occurred, show fallback
  if (!src || error) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-100 text-gray-400">
        <Bike size={48} className="mb-2" />
        <p className="text-sm">{fallbackText}</p>
      </div>
    );
  }

  // For uploaded images, bypass Next.js Image optimization
  if (src.startsWith('/uploads/')) {
    return (
      <div className="relative h-full w-full">
        <img
          src={src}
          alt={alt}
          className="object-cover h-full w-full"
          onError={() => setError(true)}
        />
      </div>
    );
  }

  // For other images, use Next.js Image component
  return (
    <Image
      src={src}
      alt={alt}
      onError={() => setError(true)}
      {...props}
    />
  );
};

export default ImageWithFallback;