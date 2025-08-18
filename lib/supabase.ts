import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://dvfjwokzlkezmdqwnphy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2Zmp3b2t6bGtlem1kcXducGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwOTExODEsImV4cCI6MjA3MDY2NzE4MX0.yU-R5IyijTRMV6CGtppWNcvqvI6BCO_shzS4EfnXI_E";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
