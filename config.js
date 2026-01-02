// this is config.js
const SUPABASE_URL = "https://vupslmfufhcyqhqnscka.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cHNsbWZ1ZmhjeXFocW5zY2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMTk4MDEsImV4cCI6MjA4Mjg5NTgwMX0.bcysv3u6GpA8_h7b4BD0U93blfXdDFg_1f4GRZTD91c";

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});


