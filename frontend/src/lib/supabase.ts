import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lxnszqadgzttslodwivs.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4bnN6cWFkZ3p0dHNsb2R3aXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzYyMTQsImV4cCI6MjA5Njg1MjIxNH0.44S94B4voUPRjQl_CYj6stvC1ESnHXyCfy1ktyjPEwU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
