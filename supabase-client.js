// Ambient OS — Supabase client init, shared by index.html and login.html.
// Load the supabase-js CDN script before this file.
// SUPABASE_ANON_KEY is a publishable/anon key: safe to ship in client code by
// design, access is scoped entirely by Row Level Security on the server side.
const SUPABASE_URL = 'https://yattmjpjeukchbtwwcao.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7AlvY1jBY3tbT4zWoiaL9g_hmBQUV6j';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
