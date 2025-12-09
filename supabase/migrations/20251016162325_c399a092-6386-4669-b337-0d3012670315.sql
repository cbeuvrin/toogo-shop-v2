-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule manage-subscriptions to run daily at 00:00 UTC
SELECT cron.schedule(
  'manage-subscriptions-daily',
  '0 0 * * *', -- Every day at midnight UTC
  $$
  SELECT
    net.http_post(
      url:='https://herqxhfmsstbteahhxpr.supabase.co/functions/v1/manage-subscriptions',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlcnF4aGZtc3N0YnRlYWhoeHByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NjY0MjQsImV4cCI6MjA3MjU0MjQyNH0.3JMO6wjI7PhuWdIwWTzoWbJQcvJIWNCQMUSBsKx6klw"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
