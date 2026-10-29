/**
 * Vercel serverless function that replaces WordPress' admin-ajax.php for the
 * Elementor Pro contact form. The captured form markup and Elementor's own
 * frontend JS are untouched: the JS posts multipart form data here and expects
 * the same JSON shape Elementor Pro's Ajax_Handler returns, so success / error
 * messages render exactly as they did on WordPress.
 *
 * Delivery providers (configure one via environment variables):
 *   RESEND_API_KEY + CONTACT_TO (+ CONTACT_FROM)   https://resend.com
 *   WEB3FORMS_ACCESS_KEY                            https://web3forms.com
 */

// Messages configured in the Elementor form (see form settings in WordPress).
const MESSAGES = {
  success: 'The form was sent successfully.',
  error: 'An error occured.',
  invalid: "There's something wrong. The form is invalid.",
  required: 'This field is required.',
  server: 'Your message could not be sent. Please email risa.fabevents@gmail.com or contact Risa on WhatsApp.',
};

const DEFAULT_TO = 'risa.fabevents@gmail.com';
const DEFAULT_FROM = 'FAB Events Israel by Risa <email@fabeventsisrael.com>';
const SUBJECT = 'Contact Us';

type Fields = Record<string, string>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

const ok = (data: Record<string, unknown> = {}) => json({ success: true, data: { message: MESSAGES.success, data } });
const fail = (message: string, errors: Record<string, string> = {}, status = 200) =>
  json({ success: false, data: { message, errors, data: {} } }, status);

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function parseFields(request: Request): Promise<{ fields: Fields; action: string; referrer: string }> {
  const fields: Fields = {};
  let action = '';
  let referrer = '';
  const form = await request.formData();
  for (const [key, value] of form.entries()) {
    if (typeof value !== 'string') continue;
    const m = key.match(/^form_fields\[(.+)\]$/);
    if (m) fields[m[1]] = value.trim();
    else if (key === 'action') action = value;
    else if (key === 'referrer' || key === 'referer') referrer = value;
  }
  return { fields, action, referrer };
}

async function sendWithResend(fields: Fields, referrer: string): Promise<void> {
  const to = DEFAULT_TO;
  const from = process.env.CONTACT_FROM || DEFAULT_FROM;
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${v}`);
  if (referrer) lines.push('', `Sent from: ${referrer}`);
  const html = Object.entries(fields)
    .map(([k, v]) => `<p><strong>${escapeHtml(k)}:</strong><br>${escapeHtml(v).replace(/\n/g, '<br>')}</p>`)
    .join('') + (referrer ? `<p><small>Sent from: ${escapeHtml(referrer)}</small></p>` : '');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: to.split(',').map((s) => s.trim()),
      reply_to: fields.email && isEmail(fields.email) ? fields.email : undefined,
      subject: SUBJECT,
      text: lines.join('\n'),
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

async function sendWithWeb3Forms(fields: Fields, referrer: string): Promise<void> {
  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      access_key: process.env.WEB3FORMS_ACCESS_KEY,
      subject: SUBJECT,
      from_name: 'FAB Events Israel by Risa',
      ...fields,
      ...(referrer ? { sent_from: referrer } : {}),
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
  if (!res.ok || body.success === false) throw new Error(`Web3Forms ${res.status}: ${body.message || 'failed'}`);
}

async function POST(request: Request): Promise<Response> {
  let parsed;
  try {
    parsed = await parseFields(request);
  } catch {
    return fail(MESSAGES.invalid, {}, 400);
  }
  const { fields, action, referrer } = parsed;
  if (action && action !== 'elementor_pro_forms_send_form') return fail(MESSAGES.invalid, {}, 400);

  // Validation mirrors the form: email is the only required field.
  const errors: Record<string, string> = {};
  if (!fields.email) errors.email = MESSAGES.required;
  else if (!isEmail(fields.email)) errors.email = 'The field is required.';
  if (Object.keys(errors).length) return fail(MESSAGES.invalid, errors);

  try {
    if (process.env.RESEND_API_KEY) await sendWithResend(fields, referrer);
    else if (process.env.WEB3FORMS_ACCESS_KEY) await sendWithWeb3Forms(fields, referrer);
    else {
      console.error('contact: no delivery provider configured (RESEND_API_KEY or WEB3FORMS_ACCESS_KEY)');
      return fail(MESSAGES.server, {}, 500);
    }
  } catch (e) {
    console.error('contact: delivery failed', e);
    return fail(MESSAGES.error, {}, 502);
  }
  return ok();
}

async function GET(): Promise<Response> {
  return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
}


export const config = { runtime: 'edge' };
export default async function handler(request: Request): Promise<Response> {
  return request.method === 'POST' ? POST(request) : GET();
}
