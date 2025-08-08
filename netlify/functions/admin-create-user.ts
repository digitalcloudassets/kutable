import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_SECRET = process.env.ADMIN_API_SECRET!;
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'team@kutable.com';
const FROM_NAME = process.env.FROM_NAME || 'Kutable';
const SITE_URL = process.env.SITE_URL || 'https://kutable.com';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const json = (statusCode: number, payload: any) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type,x-admin-secret',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
  },
  body: JSON.stringify(payload),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  if (event.headers['x-admin-secret'] !== ADMIN_SECRET) {
    return json(401, { error: 'Unauthorized' });
  }

  let body: any = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const { email, password, metadata = {} } = body;
  if (!email || !password) return json(400, { error: 'email and password required' });

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) return json(400, { error: error.message });

    // fire-and-forget welcome email (optional)
    if (RESEND_API_KEY) {
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: email,
          subject: 'Welcome to Kutable',
          html: `<p>Welcome! Your account is ready. <a href="${SITE_URL}">Open Kutable</a></p>`,
        }),
      }).catch(() => {});
    }

    return json(200, { ok: true, user: data.user });
  } catch (e: any) {
    return json(500, { error: e?.message || 'Internal error' });
  }
};