import { createClient } from '@supabase/supabase-js'
import { config } from '../config'

// Service role client — bypasses RLS, server-side only
export const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey)
