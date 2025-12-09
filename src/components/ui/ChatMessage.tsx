import { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export const ChatMessage = memo(({ content, isUser, timestamp }: ChatMessageProps) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={cn(
      "flex gap-3 p-4 transition-all duration-200",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <Avatar className={cn(
        "w-8 h-8 flex-shrink-0 transition-all duration-200",
        isUser ? "bg-primary" : "bg-muted"
      )}>
        {isUser ? (
          <AvatarFallback className="text-xs font-medium text-primary-foreground">
            <User size={14} />
          </AvatarFallback>
        ) : (
          <>
            <AvatarImage 
              src="/assets/mascot-toogo.png" 
              alt="Toogi" 
              className="object-contain"
            />
            <AvatarFallback className="text-xs font-medium text-muted-foreground">
              T
            </AvatarFallback>
          </>
        )}
      </Avatar>
      
      <div className={cn(
        "flex flex-col max-w-[80%] space-y-1",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "rounded-2xl px-4 py-2 text-sm leading-relaxed transition-all duration-200",
          isUser 
            ? "bg-primary text-primary-foreground rounded-br-sm" 
            : "bg-muted text-muted-foreground rounded-bl-sm"
        )}>
          <div className="whitespace-pre-wrap break-words">
            {content}
          </div>
        </div>
        
        <span className={cn(
          "text-xs opacity-60 px-2",
          isUser ? "text-right" : "text-left"
        )}>
          {formatTime(timestamp)}
        </span>
      </div>
    </div>
  );
});