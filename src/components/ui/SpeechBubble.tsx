import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpeechBubbleProps {
  onOpenChat: () => void;
}

export const SpeechBubble = ({ onOpenChat }: SpeechBubbleProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has seen the welcome message before
    const hasSeenWelcome = localStorage.getItem('toogo-welcome-shown');
    
    if (!hasSeenWelcome) {
      // Show bubble after a brief delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('toogo-welcome-shown', 'true');
  };

  const handleStartChat = () => {
    handleClose();
    setTimeout(() => {
      onOpenChat();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
        onClick={handleClose}
      />
      
      {/* Speech bubble */}
      <div className={cn(
        "fixed z-50 animate-scale-in",
        // Mobile: centered
        "bottom-20 left-4 right-4 md:left-auto md:right-auto",
        // Desktop: positioned relative to mascot
        "md:bottom-24 md:right-24"
      )}>
        <div className="relative">
          {/* Main bubble */}
          <div className="bg-background border border-border rounded-[30px] p-6 shadow-2xl max-w-sm">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute right-3 top-3 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </button>

            {/* Content */}
            <div className="space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <img 
                    src="/assets/mascot-toogo.png" 
                    alt="Toogi" 
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">¡Hola! Soy Toogi 👋</h3>
                  <p className="text-sm text-muted-foreground">Tu asistente en Toogo</p>
                </div>
              </div>

              {/* Message */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                Estoy aquí para ayudarte a crear tu tienda en minutos.
              </p>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleStartChat}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-10 rounded-lg font-medium flex items-center gap-2 transition-all duration-200"
                >
                  <MessageCircle size={16} />
                  Empezar a chatear
                </Button>
                
                <Button 
                  variant="ghost" 
                  onClick={handleClose}
                  className="w-full h-8 text-muted-foreground hover:text-foreground transition-colors text-sm"
                >
                  Más tarde
                </Button>
              </div>
            </div>
          </div>

          {/* Speech bubble tail */}
          <div className={cn(
            "absolute w-0 h-0",
            // Mobile: bottom tail
            "bottom-[-8px] left-1/2 transform -translate-x-1/2 md:bottom-auto md:left-auto md:transform-none",
            "border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-border md:border-t-transparent md:border-l-transparent md:border-r-[8px] md:border-b-[8px] md:border-r-border md:border-b-border",
            // Desktop: right tail
            "md:right-[-8px] md:top-1/2 md:-translate-y-1/2"
          )} />
          
          {/* Tail background (to cover border) */}
          <div className={cn(
            "absolute w-0 h-0",
            // Mobile: bottom tail
            "bottom-[-6px] left-1/2 transform -translate-x-1/2 md:bottom-auto md:left-auto md:transform-none",
            "border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-background md:border-t-transparent md:border-l-transparent md:border-r-[6px] md:border-b-[6px] md:border-r-background md:border-b-background",
            // Desktop: right tail
            "md:right-[-6px] md:top-1/2 md:-translate-y-1/2"
          )} />
        </div>
      </div>
    </>
  );
};