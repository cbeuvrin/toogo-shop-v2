import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
  showOutOfStock?: boolean;
}
export const ProductImageGallery = ({
  images,
  productName,
  showOutOfStock
}: ProductImageGalleryProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  if (!images || images.length === 0) {
    return <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
        <span className="text-gray-400">Sin imagen</span>
      </div>;
  }
  const handleThumbnailClick = (index: number) => {
    setCurrentImageIndex(index);
  };
  const handlePrevious = () => {
    setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
  };
  const handleNext = () => {
    setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
  };
  return <div className="space-y-4">
      {/* Main Image */}
      <div className="relative w-full max-w-[210px] sm:max-w-[350px] lg:max-w-[450px] mx-auto aspect-square bg-gray-100 rounded-lg overflow-hidden">
        <img src={images[currentImageIndex]} alt={`${productName} - imagen ${currentImageIndex + 1}`} className="w-full h-full object-cover" />
        
        {/* Out of Stock Badge - top left corner */}
        {showOutOfStock && (
          <div className="absolute top-2 left-2 z-10">
            <Badge variant="destructive" className="text-xs px-2 py-0.5">
              Agotado
            </Badge>
          </div>
        )}
        
        {/* Navigation arrows - only show if more than 1 image */}
        {images.length > 1 && <>
            
            
          </>}

        {/* Image counter */}
        {images.length > 1 && <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
            {currentImageIndex + 1} / {images.length}
          </div>}
      </div>

      {/* Thumbnails - only show if more than 1 image */}
      {images.length > 1 && <div className="grid grid-cols-4 gap-2">
          {images.map((image, index) => <button key={index} onClick={() => handleThumbnailClick(index)} className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${index === currentImageIndex ? 'border-blue-500 opacity-100' : 'border-gray-200 opacity-70 hover:opacity-100'}`}>
              <img src={image} alt={`${productName} miniatura ${index + 1}`} className="w-full h-full object-cover" />
              {index === currentImageIndex && <div className="absolute inset-0 bg-blue-500/20" />}
            </button>)}
        </div>}
    </div>;
};