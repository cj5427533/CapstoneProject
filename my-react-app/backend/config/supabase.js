/**
 * Supabase 클라이언트 설정
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://tqdvolgachfszomwhlfe.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== Supabase 연결 확인 ===');
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? '설정됨' : '미설정');
console.log('====================');

module.exports = supabase;

