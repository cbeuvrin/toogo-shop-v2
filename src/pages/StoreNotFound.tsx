import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';

interface StoreNotFoundProps {
  domain?: string;
  error?: string;
}

export const StoreNotFound = ({ domain, error }: StoreNotFoundProps) => {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Tienda no encontrada
          </h1>
          <p className="text-gray-600">
            {domain 
              ? `No se encontró una tienda para el dominio "${domain}"`
              : 'No se pudo encontrar la tienda solicitada'
            }
          </p>
          {error && (
            <p className="text-sm text-red-600 mt-2">
              Error: {error}
            </p>
          )}
        </div>
        
        <div className="space-y-3">
          <Button 
            onClick={handleGoHome}
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Ir al inicio
          </Button>
          
          <p className="text-sm text-gray-500">
            ¿Eres el propietario de esta tienda?{' '}
            <a 
              href="/auth" 
              className="text-blue-600 hover:underline"
            >
              Inicia sesión aquí
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};