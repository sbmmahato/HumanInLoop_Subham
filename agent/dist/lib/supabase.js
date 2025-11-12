import { createClient } from '@supabase/supabase-js';
export function createServerClient() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl) {
        throw new Error('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required');
    }
    if (!supabaseServiceKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
    }
    return createClient(supabaseUrl, supabaseServiceKey);
}
//# sourceMappingURL=supabase.js.map