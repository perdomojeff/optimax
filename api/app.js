const fs = require('fs'), path = require('path');
const URL_ = 'https://gwczlpofvxihdsvzggcg.supabase.co';
const KEY = 'sb_publishable_XOPuvRPfmwc3dstJGjTbOg_L2yKFCxb';
module.exports = async (req, res) => {
  const tok = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!tok) return res.status(401).send('no auth');
  const u = await fetch(URL_ + '/auth/v1/user', { headers: { apikey: KEY, Authorization: 'Bearer ' + tok } });
  if (!u.ok) return res.status(401).send('bad token');
  const user = await u.json();
  const p = await fetch(URL_ + '/rest/v1/profiles?select=activo&user_id=eq.' + user.id, { headers: { apikey: KEY, Authorization: 'Bearer ' + tok } });
  const rows = p.ok ? await p.json() : [];
  if (!rows.length || !rows[0].activo) return res.status(403).send('pendiente de aprobacion');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).send(fs.readFileSync(path.join(process.cwd(), 'private', 'optimax.html'), 'utf8'));
};
