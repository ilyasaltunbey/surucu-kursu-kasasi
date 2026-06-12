import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zypyqaveczupnqbxrucj.supabase.co'
const supabaseKey = 'sb_publishable_M9VEuqoVIte8X0BjOPpnmA_XUkMtcBK'

export const supabase = createClient(supabaseUrl, supabaseKey)
