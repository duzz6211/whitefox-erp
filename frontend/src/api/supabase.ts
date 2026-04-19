import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qofmqakkomdxlayzkosa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvZm1xYWtrb21keGxheXprb3NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NDMzNzcsImV4cCI6MjA5MjExOTM3N30.JYxRZY-Lj_cxPQyy_OOMCCR1UTIBS1MSgplJZ8oNJzc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
