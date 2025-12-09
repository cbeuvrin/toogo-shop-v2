-- Enable required extensions for CRON jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create CRON job to check DNS status every 5 minutes
SELECT cron.schedule(
  'check-dns-status-every-5min',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://herqxhfmsstbteahhxpr.supabase.co/functions/v1/check-dns-status',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlcnF4aGZtc3N0YnRlYWhoeHByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NjY0MjQsImV4cCI6MjA3MjU0MjQyNH0.3JMO6wjI7PhuWdIwWTzoWbJQcvJIWNCQMUSBsKx6klw"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);