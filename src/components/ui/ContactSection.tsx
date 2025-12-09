import React from 'react';
import { MessageCircle, Mail, MapPin } from 'lucide-react';
interface ContactData {
  whatsapp?: string;
  email?: string;
  address?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
}
interface ContactSectionProps {
  contactData?: ContactData | null;
  className?: string;
  backgroundColor?: string;
  iconColor?: string;
  iconScale?: number;
}
export const ContactSection: React.FC<ContactSectionProps> = ({
  contactData,
  className = "",
  backgroundColor,
  iconColor = '#1f2937',
  iconScale = 1.0
}) => {
  // If no contact data, don't render anything
  if (!contactData || !contactData.whatsapp && !contactData.email && !contactData.address) {
    return null;
  }

  const hasCustomBg = !!backgroundColor;
  
  // Valores base (100% = default)
  const BASE_ICON_SIZE = 32;
  const BASE_CIRCLE_SIZE = 64;
  const BASE_TITLE_SIZE = 16;
  const BASE_TEXT_SIZE = 14;
  
  // Aplicar escala
  const scaledIconSize = BASE_ICON_SIZE * iconScale;
  const scaledCircleSize = BASE_CIRCLE_SIZE * iconScale;
  const scaledTitleSize = BASE_TITLE_SIZE * iconScale;
  const scaledTextSize = BASE_TEXT_SIZE * iconScale;
  const openWhatsApp = () => {
    if (contactData.whatsapp) {
      const cleanPhone = contactData.whatsapp.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  };
  const openEmail = () => {
    if (contactData.email) {
      window.open(`mailto:${contactData.email}`, '_blank');
    }
  };
  return <section 
      id="contact-section" 
      className={`${hasCustomBg ? '' : 'bg-gray-50'} py-12 border-t ${className}`}
      style={hasCustomBg ? { backgroundColor } : undefined}
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          
          {/* WhatsApp */}
          {contactData.whatsapp && <div className="text-center group">
              <div 
                className="bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 cursor-pointer hover:bg-green-200 transition-colors duration-300" 
                onClick={openWhatsApp}
                style={{
                  width: `${scaledCircleSize}px`,
                  height: `${scaledCircleSize}px`
                }}
              >
                <MessageCircle 
                  style={{
                    color: iconColor,
                    width: `${scaledIconSize}px`,
                    height: `${scaledIconSize}px`
                  }}
                />
              </div>
              <h3 
                className="font-semibold mb-2"
                style={{
                  color: iconColor,
                  fontSize: `${scaledTitleSize}px`
                }}
              >
                WhatsApp
              </h3>
              <p 
                className="hover:text-green-600 cursor-pointer transition-colors duration-300" 
                onClick={openWhatsApp}
                style={{
                  color: iconColor,
                  fontSize: `${scaledTextSize}px`
                }}
              >
                {contactData.whatsapp}
              </p>
            </div>}

          {/* Email */}
          {contactData.email && <div className="text-center group">
              <div 
                className="bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 cursor-pointer hover:bg-blue-200 transition-colors duration-300" 
                onClick={openEmail}
                style={{
                  width: `${scaledCircleSize}px`,
                  height: `${scaledCircleSize}px`
                }}
              >
                <Mail 
                  style={{
                    color: iconColor,
                    width: `${scaledIconSize}px`,
                    height: `${scaledIconSize}px`
                  }}
                />
              </div>
              <h3 
                className="font-semibold mb-2"
                style={{
                  color: iconColor,
                  fontSize: `${scaledTitleSize}px`
                }}
              >
                Email
              </h3>
              <p 
                className="hover:text-blue-600 cursor-pointer transition-colors duration-300" 
                onClick={openEmail}
                style={{
                  color: iconColor,
                  fontSize: `${scaledTextSize}px`
                }}
              >
                {contactData.email}
              </p>
            </div>}

          {/* Address */}
          {contactData.address && <div className="text-center group">
              <div 
                className="bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{
                  width: `${scaledCircleSize}px`,
                  height: `${scaledCircleSize}px`
                }}
              >
                <MapPin 
                  style={{
                    color: iconColor,
                    width: `${scaledIconSize}px`,
                    height: `${scaledIconSize}px`
                  }}
                />
              </div>
              <h3 
                className="font-semibold mb-2"
                style={{
                  color: iconColor,
                  fontSize: `${scaledTitleSize}px`
                }}
              >
                Dirección
              </h3>
              <p 
                className="leading-relaxed"
                style={{
                  color: iconColor,
                  fontSize: `${scaledTextSize}px`
                }}
              >
                {contactData.address}
              </p>
            </div>}

        </div>

        {/* Social Media Links */}
        {(contactData.facebook || contactData.instagram) && <div className="flex justify-center items-center space-x-6 mt-8 pt-8 border-t border-gray-200">
            {contactData.facebook && <a href={contactData.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-600 transition-colors duration-300">
                <span className="sr-only">Facebook</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>}
            
            {contactData.instagram && <a href={contactData.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-pink-600 transition-colors duration-300">
                <span className="sr-only">Instagram</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>}
            
            {contactData.twitter && <a href={contactData.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-400 transition-colors duration-300">
                
                
              </a>}
          </div>}
      </div>
    </section>;
};
export default ContactSection;