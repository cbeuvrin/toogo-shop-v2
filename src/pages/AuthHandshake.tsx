import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AuthHandshake = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

  useEffect(() => {
    const handleSessionHandshake = async () => {
      try {
        // Extract tokens from hash
        const hash = location.hash.substring(1); // Remove #
        const params = new URLSearchParams(hash);
        
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const redirectPath = params.get('redirect') || '/dashboard';

        if (!accessToken || !refreshToken) {
          console.error('Missing tokens in hash:', { accessToken: !!accessToken, refreshToken: !!refreshToken });
          setStatus('error');
          return;
        }

        console.log('Setting session with tokens...');
        
        // Set the session on this domain's localStorage
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (error) {
          console.error('Session setup failed:', error);
          setStatus('error');
          return;
        }

        console.log('Session established successfully:', data.user?.email);
        setStatus('success');

        // Clean the hash and redirect
        window.history.replaceState({}, '', window.location.pathname);
        
        // Small delay to ensure session is fully established
        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, 500);

      } catch (error) {
        console.error('Handshake failed:', error);
        setStatus('error');
      }
    };

    handleSessionHandshake();
  }, [location.hash, navigate]);

  // Handle error case - redirect to auth
  useEffect(() => {
    if (status === 'error') {
      toast({
        variant: 'destructive',
        title: 'Error de autenticación',
        description: 'No se pudo establecer la sesión. Redirigiendo a login...'
      });
      
      setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 2000);
    }
  }, [status, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#8246C0]" />
        </div>
        
        {status === 'processing' && (
          <>
            <h2 className="text-xl font-semibold text-gray-900">
              Configurando tu sesión...
            </h2>
            <p className="text-gray-600">
              Solo tomará un momento
            </p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <h2 className="text-xl font-semibold text-green-600">
              ¡Sesión establecida!
            </h2>
            <p className="text-gray-600">
              Redirigiendo a tu dashboard...
            </p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <h2 className="text-xl font-semibold text-red-600">
              Error de autenticación
            </h2>
            <p className="text-gray-600">
              Redirigiendo a login...
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthHandshake;