import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface AnimatedMascotProps {
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const AnimatedMascot = ({ 
  showCloseButton = false, 
  onClose, 
  className = "",
  size = 'md'
}: AnimatedMascotProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const animationCycle = () => {
      // Animate for 2 seconds
      setIsAnimating(true);
      
      setTimeout(() => {
        // Stop for 5 seconds
        setIsAnimating(false);
        
        setTimeout(() => {
          // Animate for 1 second
          setIsAnimating(true);
          
          setTimeout(() => {
            setIsAnimating(false);
            // Restart cycle after brief pause
            setTimeout(animationCycle, 1000);
          }, 1000);
        }, 5000);
      }, 2000);
    };

    animationCycle();
  }, []);

  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 500);
    onClose && onClose(); // Trigger the chat opening
  };

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-14 h-14 md:w-16 md:h-16',
    lg: 'w-18 h-18 md:w-20 md:h-20'
  };

  const containerClasses = `
    fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 cursor-pointer
    ${sizeClasses[size]}
    ${className}
  `;

  const imageClasses = `
    w-full h-full object-contain transition-all duration-300 will-change-transform
    ${!isClicked && !isHovered && isAnimating ? 'animate-breathe' : ''}
    ${!isClicked && !isHovered && isAnimating ? 'animate-float' : ''}
    ${isHovered && !isClicked ? 'animate-bounce-gentle scale-110' : ''}
    ${isClicked ? 'animate-wiggle' : ''}
  `;

  return (
    <div className={containerClasses}>
      {/* Close button */}
      {showCloseButton && onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs z-10 transition-colors"
          aria-label="Cerrar mascota"
        >
          <X size={12} />
        </button>
      )}
      
      {/* Mascot container with shadow */}
      <div 
        className="relative w-full h-full rounded-full bg-white shadow-lg hover:shadow-xl transition-all duration-300 p-1"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
      >
        <img
          src="/assets/mascot-toogo.png"
          alt="Mascota Toogo"
          className={imageClasses}
          style={{ filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))' }}
        />
      </div>
    </div>
  );
};

export default AnimatedMascot;