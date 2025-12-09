import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import toogoLogo from '@/assets/toogo-logo.png';
import toogoMascot from '@/assets/toogo-mascot.png';

interface EmailPreviewVendorProps {
  template: {
    subject: string;
    greeting: string;
    mainMessage: string;
    orderDetails: string;
    footerMessage: string;
  };
}

export const EmailPreviewVendor = ({ template }: EmailPreviewVendorProps) => {
  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Preview: Email a Vendedor</CardTitle>
          <Badge variant="outline" className="text-xs">Con logo Toogo</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-background border rounded-lg p-4 space-y-3 text-sm">
          {/* Header with Toogo Logo */}
          <div className="border-b pb-3 mb-3">
            <div className="flex items-center justify-center h-16 bg-gradient-to-r from-blue-50 to-blue-100 rounded mb-2">
              <img 
                src={toogoLogo} 
                alt="Toogo Logo" 
                className="h-10 object-contain"
              />
            </div>
            <h3 className="font-semibold text-center text-foreground">
              {template.subject}
            </h3>
          </div>

          {/* Email Content */}
          <div className="space-y-2">
            <p className="text-foreground">
              {template.greeting}
            </p>
            
            <div className="bg-muted/50 p-3 rounded">
              <p className="font-medium text-primary mb-1">
                {template.mainMessage}
              </p>
              <div className="text-xs text-muted-foreground">
                {template.orderDetails}
              </div>
            </div>
            
            <p className="text-muted-foreground text-xs pt-2">
              {template.footerMessage}
            </p>
            
            {/* Mascot Footer */}
            <a 
              href="https://toogo.store" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center pt-3 border-t mt-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img 
                src={toogoMascot} 
                alt="Toogo Mascot" 
                className="h-8 w-8 object-contain opacity-80"
              />
              <span className="text-xs text-muted-foreground ml-2">Powered by Toogo</span>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};