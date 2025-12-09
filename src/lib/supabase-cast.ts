// Temporary workaround for Supabase TypeScript issues
// This allows us to bypass strict typing when the generated types are causing problems
import { supabase as originalSupabase } from '@/integrations/supabase/client';

export const supabaseCast = originalSupabase as any;