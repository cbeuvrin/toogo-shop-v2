// Environment constants
export const DEMO_STORE_ID = import.meta.env.VITE_DEMO_STORE_ID || '2d62ded6-0745-4ced-abdb-30b7b82e5686';

// Supabase configuration
export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://herqxhfmsstbteahhxpr.supabase.co',
  anonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlcnF4aGZtc3N0YnRlYWhoeHByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NjY0MjQsImV4cCI6MjA3MjU0MjQyNH0.3JMO6wjI7PhuWdIwWTzoWbJQcvJIWNCQMUSBsKx6klw'
};

// Google Analytics 4 - Centralized tracking for all tenants
export const GA4_MEASUREMENT_ID = 'G-XVVVECQHV9';
export const GA4_PROPERTY_ID = '507500067';

// Facebook Pixel - Platform-wide tracking
export const FACEBOOK_PIXEL_ID = '1036124668611769';