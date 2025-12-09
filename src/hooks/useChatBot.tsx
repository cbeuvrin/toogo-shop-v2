import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export const useChatBot = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load chat history from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem('toogo-chat-history');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(parsed);
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    } else {
      // Welcome message for new users
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        content: '¡Hola! Soy Toogi 👋 Tu asistente personal en Toogo. Estoy aquí para ayudarte a crear tu tienda perfecta. ¿Empezamos?',
        isUser: false,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('toogo-chat-history', JSON.stringify(messages));
    }
  }, [messages]);

  const addMessage = useCallback((content: string, isUser: boolean) => {
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      content,
      isUser,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const getCurrentContext = useCallback(() => {
    const path = window.location.pathname;
    let page = 'página principal';
    
    if (path.includes('/dashboard')) page = 'dashboard';
    else if (path.includes('/tienda')) page = 'tienda';
    else if (path.includes('/catalogo')) page = 'catálogo';
    else if (path.includes('/admin')) page = 'administración';
    
    return { page, path };
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setIsLoading(true);
    
    // Add user message
    addMessage(content, true);
    
    // Show typing indicator
    setIsTyping(true);

    try {
      const context = getCurrentContext();
      
      const { data, error } = await supabase.functions.invoke('chat-assistant', {
        body: { 
          message: content,
          context
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Error al conectar con el asistente');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Add assistant response
      const assistantMessage = data?.message || 'Lo siento, no pude procesar tu mensaje.';
      addMessage(assistantMessage, false);

    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('Lo siento, hubo un error. ¿Podrías intentarlo de nuevo?', false);
      
      toast({
        title: 'Error',
        description: 'No pude procesar tu mensaje. Por favor intenta de nuevo.',
        variant: 'destructive'
      });
    } finally {
      setIsTyping(false);
      setIsLoading(false);
    }
  }, [addMessage, getCurrentContext, isLoading, toast]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    localStorage.removeItem('toogo-chat-history');
    
    // Add welcome message again
    const welcomeMessage: ChatMessage = {
      id: 'welcome-new',
      content: '¡Hola! Soy Toogi 👋 ¿En qué puedo ayudarte?',
      isUser: false,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    messages,
    isOpen,
    isTyping,
    isLoading,
    sendMessage,
    clearHistory,
    toggleChat,
    openChat: () => setIsOpen(true),
    closeChat: () => setIsOpen(false)
  };
};