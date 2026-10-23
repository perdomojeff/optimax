// StrataFlow · Páginas Blancas · envío de notificaciones Web Push
// Desplegar con "Verify JWT" desactivado (el POST se autentica con el secreto compartido del disparador SQL).
// GET  -> devuelve la clave pública VAPID (se genera sola la primera vez y se guarda en pb_config).
// POST -> lo llama el disparador pb_notificar() en cada mensaje nuevo; envía el push a los dispositivos del destinatario.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function config(): Promise<Record<string, string>> {
  const read = async () => {
    const { data } = await sb.from('pb_config').select('key,value').in('key', ['vapid_public', 'vapid_private', 'webhook_secret']);
    return Object.fromEntries((data || []).map((r: { key: string; value: string }) => [r.key, r.value]));
  };
  let m = await read();
  if (!m.vapid_public || !m.vapid_private) {
    const k = webpush.generateVAPIDKeys();
    // ignoreDuplicates: si dos solicitudes llegan a la vez gana la primera y ambas releen la misma clave
    await sb.from('pb_config').upsert([{ key: 'vapid_public', value: k.publicKey }, { key: 'vapid_private', value: k.privateKey }], { onConflict: 'key', ignoreDuplicates: true });
    m = await read();
  }
  return m;
}

function enDnd(s: { dnd: boolean; dnd_from: string; dnd_to: string; tz_offset: number }): boolean {
  if (!s.dnd) return false;
  const now = new Date(), utc = now.getUTCHours() * 60 + now.getUTCMinutes();
  const local = (((utc - (s.tz_offset || 0)) % 1440) + 1440) % 1440;
  const [fh, fm] = s.dnd_from.split(':').map(Number), [th, tm] = s.dnd_to.split(':').map(Number);
  const f = fh * 60 + fm, t = th * 60 + tm;
  return f <= t ? local >= f && local < t : local >= f || local < t;
}

async function enviarAnuncio(id: string, cfg: Record<string, string>) {
  const { data: a } = await sb.from('pb_anuncios').select('de,titulo,cuerpo').eq('id', id).maybeSingle();
  if (!a) return { enviados: 0 };
  const { data: dest } = await sb.from('pb_anuncio_destinos').select('user_id').eq('anuncio_id', id);
  const { data: remit } = await sb.from('pb_fichas').select('nombres,apellidos').eq('user_id', a.de).maybeSingle();
  const quien = remit ? `${remit.nombres} ${remit.apellidos}`.trim() : 'Anuncio';
  const { data: subs } = await sb.from('pb_push').select('*').in('user_id', (dest || []).map((x: { user_id: string }) => x.user_id));
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || 'mailto:soporte@strataflow.app', cfg.vapid_public, cfg.vapid_private);
  let enviados = 0;
  await Promise.allSettled((subs || []).map(async (s: any) => {
    if (enDnd(s)) return;
    const payload = JSON.stringify({ title: `📢 ${a.titulo} · ${quien}`, body: s.preview ? String(a.cuerpo).slice(0, 120) : 'Tienes un anuncio nuevo', tag: 'pb-a-' + id, peer: '', grupo: '', anuncio: id });
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400, urgency: 'high' });
      enviados++;
    } catch (e: any) {
      if (e && (e.statusCode === 404 || e.statusCode === 410)) await sb.from('pb_push').delete().eq('id', s.id);
      else console.error('push anuncio', e && e.statusCode, e && e.body);
    }
  }));
  return { enviados };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const cfg = await config();
    if (req.method === 'GET') return json({ key: cfg.vapid_public });
    if (req.method !== 'POST') return json({ error: 'método no permitido' }, 405);
    if (!cfg.webhook_secret || req.headers.get('x-pb-secret') !== cfg.webhook_secret) return json({ error: 'no autorizado' }, 401);

    const m = await req.json() as { de: string; para: string | null; grupo_id: string | null; cuerpo: string; adjunto: boolean; anuncio_id?: string };
    if (m.anuncio_id) return json(await enviarAnuncio(m.anuncio_id, cfg));
    let destinos: string[] = [], titulo = 'StrataFlow', etiqueta = '';
    const { data: remit } = await sb.from('pb_fichas').select('nombres,apellidos').eq('user_id', m.de).maybeSingle();
    const quien = remit ? `${remit.nombres} ${remit.apellidos}`.trim() : 'Nuevo mensaje';
    if (m.grupo_id) {
      const { data: g } = await sb.from('pb_grupos').select('nombre').eq('id', m.grupo_id).maybeSingle();
      const { data: mi } = await sb.from('pb_grupo_miembros').select('user_id').eq('grupo_id', m.grupo_id);
      destinos = (mi || []).map((x: { user_id: string }) => x.user_id).filter((u: string) => u !== m.de);
      titulo = `${g ? g.nombre : 'Grupo'} · ${quien}`; etiqueta = 'pb-g-' + m.grupo_id;
    } else if (m.para) { destinos = [m.para]; titulo = quien; etiqueta = 'pb-' + m.de; }
    if (!destinos.length) return json({ enviados: 0 });

    const { data: subs } = await sb.from('pb_push').select('*').in('user_id', destinos);
    webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || 'mailto:soporte@strataflow.app', cfg.vapid_public, cfg.vapid_private);
    const clave = m.grupo_id || m.de;
    const texto = m.cuerpo ? m.cuerpo : (m.adjunto ? 'Te envió un archivo' : 'Mensaje nuevo');
    let enviados = 0;
    await Promise.allSettled((subs || []).map(async (s: any) => {
      if ((s.muted || []).includes(clave) || enDnd(s)) return;
      const payload = JSON.stringify({ title: titulo, body: s.preview ? texto.slice(0, 120) : 'Tienes un mensaje nuevo', tag: etiqueta, peer: m.grupo_id ? '' : m.de, grupo: m.grupo_id || '' });
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600, urgency: 'high' });
        enviados++;
      } catch (e: any) {
        if (e && (e.statusCode === 404 || e.statusCode === 410)) await sb.from('pb_push').delete().eq('id', s.id);   // suscripción vencida o revocada
        else console.error('push', e && e.statusCode, e && e.body);
      }
    }));
    return json({ enviados });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
