import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    price_mxn?: number;
    sale_price_mxn?: number;
    originalPrice?: number;
    image?: string;
    images?: string[];
    description?: string;
  };
  showReviews?: boolean;
  isBestSeller?: boolean;
  onProductClick?: (product: any) => void;
  onToggleFavorite?: (productId: string) => void;
  favorites?: string[];
  hoverColor?: string;
  cardBgColor?: string;
}
import { useOptimizedImage } from '@/hooks/useOptimizedImage';

export const ProductCard = ({
  product,
  showReviews = false,
  isBestSeller = false,
  onProductClick,
  onToggleFavorite,
  favorites = [],
  hoverColor,
  cardBgColor = '#ffffff',
  priority = false // New prop to control lazy loading
}: ProductCardProps & { priority?: boolean }) => {
  const [isHovered, setIsHovered] = useState(false);
  const handleCardClick = () => {
    if (onProductClick) {
      onProductClick(product);
    }
  };
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(product.id);
    }
  };
  const regularPrice = product.price_mxn || product.price;
  const offerPrice = product.sale_price_mxn || 0;
  const hasOffer = offerPrice > 0 && offerPrice < regularPrice;
  const isVariableProduct = (product as any).product_type === 'variable';

  // Calculate if hover color is dark for text color adjustment
  const isColorDark = (hexColor: string): boolean => {
    const rgb = parseInt(hexColor.slice(1), 16);
    const r = rgb >> 16 & 0xff;
    const g = rgb >> 8 & 0xff;
    const b = rgb >> 0 & 0xff;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luma < 128;
  };
  const hoverBg = hoverColor || '#000000';
  const textColor = isHovered && hoverColor ? isColorDark(hoverBg) ? '#ffffff' : '#000000' : undefined;

  // Optimize Image
  const rawImageUrl = product.images && product.images.length > 0 ? product.images[0] : product.image;
  const imageUrl = useOptimizedImage(rawImageUrl, { width: 400 });

  return <Card style={{
    backgroundColor: isHovered ? hoverBg : cardBgColor
  }} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onClick={handleCardClick} className="group overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white rounded-[30px] cursor-pointer mx-[5px]">
    <div className="relative aspect-square overflow-hidden bg-gray-50 rounded-[30px] my-[15px] mx-[15px]">
      <div className="w-[94%] h-[94%] mx-auto mt-[3%] aspect-square overflow-hidden rounded-[30px]">
        <img
          src={imageUrl}
          alt={product.name}
          loading={priority ? "eager" : "lazy"}
          width={400}
          height={400}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={e => {
            const target = e.target as HTMLImageElement;
            target.src = "/placeholder.svg";
          }}
        />
      </div>
      {hasOffer && <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-[30px]">
        -{Math.round((regularPrice - offerPrice) / regularPrice * 100)}% OFF
      </Badge>}
      {!hasOffer && isBestSeller && <Badge className="absolute top-2 left-2 bg-gray-900 text-white text-xs px-2 py-1 rounded-[30px]">
        Más vendido
      </Badge>}
      <Button variant="ghost" size="icon" className="absolute top-2 right-2 bg-white/80 hover:bg-white shadow-sm group-hover:bg-gray-800 group-hover:text-white transition-colors duration-300" onClick={handleFavoriteClick}>
        <Heart className={`h-4 w-4 transition-colors duration-300 ${favorites.includes(product.id) ? 'fill-red-500 text-red-500 group-hover:fill-red-400 group-hover:text-red-400' : 'text-gray-600 group-hover:text-white'}`} />
      </Button>
    </div>

    <CardContent className="p-[12px] space-y-1.5">
      <h3 className="font-medium transition-colors duration-300 text-[13px] md:text-[15px] leading-tight line-clamp-2" style={{
        color: textColor || (isHovered ? '#ffffff' : '#111827')
      }}>
        {product.name}
      </h3>

      {product.description && <p className="text-[10px] md:text-[13px] transition-colors duration-300 line-clamp-1 leading-relaxed" style={{
        color: textColor || (isHovered ? '#d1d5db' : '#4b5563')
      }}>
        {product.description}
      </p>}

      <div className="flex items-center justify-between">
        <div className="flex flex-col space-y-1">
          {hasOffer ? <>
            <div className="flex items-center space-x-2">
              <span className="font-semibold transition-colors duration-300" style={{
                color: textColor || (isHovered ? '#ffffff' : '#111827')
              }}>
                {isVariableProduct && 'Desde: '}${offerPrice} MXN
              </span>
            </div>
            <span className="text-xs transition-colors duration-300 line-through" style={{
              color: textColor || (isHovered ? '#d1d5db' : '#6b7280')
            }}>
              ${regularPrice} MXN
            </span>
          </> : <span className="font-semibold transition-colors duration-300" style={{
            color: textColor || (isHovered ? '#ffffff' : '#111827')
          }}>
            {isVariableProduct && 'Desde: '}${regularPrice} MXN
          </span>}
        </div>
      </div>
    </CardContent>
  </Card>;
};