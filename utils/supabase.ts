import { createClient } from '@supabase/supabase-js';

// 拿出我們剛剛存在 .env.local 裡面的金鑰與網址
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 建立並輸出連線客戶端
export const supabase = createClient(supabaseUrl, supabaseKey);