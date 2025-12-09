import { useState } from 'react';
import AnimatedMascot from '@/components/ui/AnimatedMascot';
import { SpeechBubble } from '@/components/ui/SpeechBubble';
import { SpeechBubbleChat } from '@/components/ui/SpeechBubbleChat';

export const ChatBotContainer = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleMascotClick = () => {
    setIsChatOpen(true);
  };

  const handleChatClose = () => {
    setIsChatOpen(false);
  };

  const handleOpenChatFromWelcome = () => {
    setIsChatOpen(true);
  };

  return (
    <>
      <SpeechBubble onOpenChat={handleOpenChatFromWelcome} />
      <AnimatedMascot 
        onClose={handleMascotClick}
      />
      <SpeechBubbleChat 
        isOpen={isChatOpen}
        onClose={handleChatClose}
      />
    </>
  );
};