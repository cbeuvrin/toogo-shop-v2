import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, Trash2 } from 'lucide-react';
import { useChatBot } from '@/hooks/useChatBot';
import { ChatMessage } from '@/components/ui/ChatMessage';
import { cn } from '@/lib/utils';
interface SpeechBubbleChatProps {
  isOpen: boolean;
  onClose: () => void;
}
export const SpeechBubbleChat = ({
  isOpen,
  onClose
}: SpeechBubbleChatProps) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    messages,
    isTyping,
    isLoading,
    sendMessage,
    clearHistory
  } = useChatBot();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages, isTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    const message = inputValue.trim();
    setInputValue('');
    await sendMessage(message);
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  if (!isOpen) return null;
  return <>
      {/* Backdrop for mobile */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" onClick={onClose} />
      
      {/* Speech bubble chat */}
      <div className={cn("fixed z-50 animate-scale-in",
    // Mobile: almost full screen
    "bottom-4 left-4 right-4 top-4 md:bottom-auto md:left-auto md:right-auto md:top-auto",
    // Desktop: positioned relative to mascot
    "md:bottom-24 md:right-24 md:w-80 md:h-[400px]")}>
        <div className="relative h-full">
          {/* Main bubble */}
          <div className="bg-background/95 backdrop-blur border border-border rounded-[30px] shadow-2xl h-full flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <img src="/assets/mascot-toogo.png" alt="Toogi" className="w-5 h-5 object-contain" />
                  </div>
                  <h3 className="font-semibold text-foreground">Asistente Toogi</h3>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={clearHistory} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" title="Limpiar historial">
                    <Trash2 size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 text-muted-foreground">
                    <X size={16} />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full px-2">
                <div className="space-y-2 py-2">
                  {messages.map(message => <ChatMessage key={message.id} content={message.content} isUser={message.isUser} timestamp={message.timestamp} />)}
                  
                  {isTyping && <div className="flex gap-3 p-4">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <img src="/assets/mascot-toogo.png" alt="Toogi" className="w-4 h-4 object-contain" />
                      </div>
                      <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" />
                        </div>
                      </div>
                    </div>}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>

            {/* Input */}
            <div className="flex-shrink-0 p-4 border-t border-border">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyPress={handleKeyPress} placeholder="Escribe tu mensaje..." disabled={isLoading} className="flex-1 bg-background border-input" />
                <Button type="submit" size="sm" disabled={!inputValue.trim() || isLoading} className={cn("px-3 transition-all duration-200", inputValue.trim() && !isLoading ? "bg-primary hover:bg-primary/90" : "bg-muted")}>
                  <Send size={16} className={cn(isLoading && "animate-pulse")} />
                </Button>
              </form>
              
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Presiona Enter para enviar
              </p>
            </div>
          </div>

          {/* Speech bubble tail */}
          <div className={cn("absolute w-0 h-0",
        // Mobile: bottom tail
        "bottom-[-8px] left-1/2 transform -translate-x-1/2 md:bottom-auto md:left-auto md:transform-none", "border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-border md:border-t-transparent md:border-l-transparent md:border-r-[8px] md:border-b-[8px] md:border-r-border md:border-b-border",
        // Desktop: right tail
        "md:right-[-8px] md:bottom-16")} />
          
          {/* Tail background (to cover border) */}
          <div className={cn("absolute w-0 h-0",
        // Mobile: bottom tail
        "bottom-[-6px] left-1/2 transform -translate-x-1/2 md:bottom-auto md:left-auto md:transform-none", "border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-background md:border-t-transparent md:border-l-transparent md:border-r-[6px] md:border-b-[6px] md:border-r-background md:border-b-background",
        // Desktop: right tail
        "md:right-[-6px] md:bottom-16")} />
        </div>
      </div>
    </>;
};