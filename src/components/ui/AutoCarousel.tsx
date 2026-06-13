import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "./ProductCard";

interface AutoCarouselProps {
  title: string;
  products: any[];
  showReviews?: boolean;
  isBestSellers?: boolean;
  delay?: number;
  onProductClick?: (product: any) => void;
  onViewMore?: () => void;
  onToggleFavorite?: (productId: string) => void;
  favorites?: string[];
  hoverColor?: string;
  cardBgColor?: string;
  /** Optional style overrides for the section title and the "Ver más" link. */
  titleStyle?: React.CSSProperties;
  viewMoreText?: string;
  viewMoreStyle?: React.CSSProperties;
  /** Global card typography (font family + size) + editor click-to-edit. */
  cardTextStyle?: React.CSSProperties;
  isEditorMode?: boolean;
  onEditCardText?: () => void;
}

export const AutoCarousel = ({
  title,
  products,
  showReviews = false,
  isBestSellers = false,
  delay = 0,
  onProductClick,
  onViewMore,
  onToggleFavorite,
  favorites = [],
  hoverColor,
  cardBgColor,
  titleStyle,
  viewMoreText,
  viewMoreStyle,
  cardTextStyle,
  isEditorMode,
  onEditCardText
}: AutoCarouselProps) => {
  const autoplayPlugin = Autoplay({
    delay: 4000,
    stopOnInteraction: true,
    stopOnMouseEnter: true
  });

  if (!products || products.length === 0) return null;

  return (
    <div className="space-y-4">
      {!isBestSellers && (
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-gray-900" style={titleStyle}>{title}</h2>
            <div
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 cursor-pointer transition-colors"
              style={viewMoreStyle}
              onClick={(e) => {
                e.stopPropagation();
                if (onViewMore) onViewMore();
              }}
            >
              <span className="text-sm font-medium">{viewMoreText || "Ver más"}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
          <div className="w-full h-px bg-black"></div>
        </div>
      )}

      <Carousel
        plugins={[autoplayPlugin]}
        className="w-full"
        opts={{
          align: "start",
          loop: true,
          skipSnaps: false,
          dragFree: true
        }}
      >
        <CarouselContent className="-ml-5 md:-ml-6">
          {products.map((product) => (
            <CarouselItem key={product.id} className="pl-5 md:pl-6 basis-[170px] md:basis-[260px] lg:basis-[260px]">
              <ProductCard
                product={product}
                showReviews={showReviews}
                isBestSeller={isBestSellers}
                onProductClick={onProductClick}
                onToggleFavorite={onToggleFavorite}
                favorites={favorites}
                hoverColor={hoverColor}
                cardBgColor={cardBgColor}
                cardTextStyle={cardTextStyle}
                isEditorMode={isEditorMode}
                onEditText={onEditCardText}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
};