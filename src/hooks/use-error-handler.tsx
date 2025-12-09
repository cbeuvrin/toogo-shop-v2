import { useCallback } from 'react';
import { toast } from 'sonner';

interface ErrorInfo {
  errorCode?: string;
  component?: string;
  action?: string;
  details?: any;
}

export const useErrorHandler = () => {
  const handleError = useCallback((error: Error | any, info?: ErrorInfo) => {
    const errorId = info?.errorCode || 'UNKNOWN_ERROR';
    const timestamp = new Date().toISOString();
    
    // Log detailed error information
    console.group(`🚨 Error ${errorId} - ${timestamp}`);
    console.error('Error:', error);
    console.log('Component:', info?.component || 'Unknown');
    console.log('Action:', info?.action || 'Unknown');
    console.log('Details:', info?.details || 'None');
    console.log('Stack:', error?.stack || 'No stack trace');
    console.groupEnd();

    // Check for specific error patterns
    if (errorId === '0d764bd6208d24366cbc2d3834335d4c') {
      console.error('🔍 SPECIFIC ERROR DETECTED: 0d764bd6208d24366cbc2d3834335d4c');
      console.log('This error has been specifically tracked for debugging');
      
      // Show user-friendly error message
      toast.error('Se detectó un error específico. Los detalles han sido registrados para depuración.');
    }

    // Show generic error toast for other errors
    if (!errorId.includes('0d764bd6208d24366cbc2d3834335d4c')) {
      toast.error(`Error en ${info?.component || 'la aplicación'}: ${error.message || 'Error desconocido'}`);
    }

    // Return error details for further handling if needed
    return {
      errorId,
      timestamp,
      component: info?.component,
      action: info?.action,
      originalError: error
    };
  }, []);

  const logAction = useCallback((action: string, component: string, details?: any) => {
    console.log(`✅ Action: ${action} in ${component}`, details || '');
  }, []);

  const logWarning = useCallback((message: string, component: string, details?: any) => {
    console.warn(`⚠️ Warning in ${component}: ${message}`, details || '');
  }, []);

  return {
    handleError,
    logAction,
    logWarning
  };
};