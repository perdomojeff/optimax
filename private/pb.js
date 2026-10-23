/* StrataFlow · Páginas Blancas (directorio corporativo + chat interno)
   Módulo único, compartido por la app completa y por la vista de aliados SAI.
   Requiere: window.React, window.ReactDOM, window.__sb (cliente Supabase), window.OPT_USER, window.OPT_ROLE.
   API: PB.Tab (pestaña), PB.useUnread(onNew) (insignia y avisos), PB.version. */
(function () {
  if (window.PB) return;
  var React = window.React, h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useMemo = React.useMemo, useRef = React.useRef, useCallback = React.useCallback;
  var MAX_FILE = 25 * 1024 * 1024;
  var PAGE = 24;
  var ESTADOS = { disponible: 'En línea', ocupado: 'Ocupado', ausente: 'Ausente', desconectado: 'Desconectado' };
  var ESTADO_COLOR = { disponible: '#3dbb8d', ocupado: '#e5594f', ausente: '#e9b949', desconectado: '#6b7c85' };
  var CAMPOS_PRIV = [['correo', 'Correo corporativo'], ['telefono', 'Teléfono fijo y extensión'], ['celular', 'Celular'], ['whatsapp', 'WhatsApp'], ['fecha_ingreso', 'Fecha de ingreso'], ['biografia', 'Biografía']];
  var MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  /* ---------- utilidades ---------- */
  function sb() { return window.__sb; }
  function meId() { return (window.OPT_USER || {}).id || ''; }
  function isAdm() { return window.OPT_ROLE === 'admin' || window.OPT_ROLE === 'gerente'; }
  function full(f) { return ((f.nombres || '') + ' ' + (f.apellidos || '')).trim(); }
  function initials(f) { return ((f.nombres || '?').charAt(0) + (f.apellidos || '').charAt(0)).toUpperCase(); }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function stamp() { var d = new Date(); return MESES[d.getMonth()] + '-' + p2(d.getDate()) + '-' + d.getFullYear(); }
  function fmtDate(s) { if (!s) return ''; var a = String(s).slice(0, 10).split('-'); return a[2] + '/' + a[1] + '/' + a[0]; }
  function fmtTime(iso) {
    var d = new Date(iso), n = new Date(), hm = p2(d.getHours()) + ':' + p2(d.getMinutes());
    if (d.toDateString() === n.toDateString()) return hm;
    var y = new Date(n); y.setDate(n.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Ayer ' + hm;
    return p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + (d.getFullYear() !== n.getFullYear() ? '/' + d.getFullYear() : '') + ' ' + hm;
  }
  function fmtSize(n) { return n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1048576).toFixed(1).replace('.', ',') + ' MB'; }
  function normPhone(s) { s = String(s || '').trim(); if (!s) return ''; var plus = s.charAt(0) === '+'; var d = s.replace(/\D/g, ''); return (plus ? '+' : '') + d; }
  function phoneOk(s) { if (!s) return true; var d = s.replace(/\D/g, ''); return d.length >= 7 && d.length <= 15; }
  function emailOk(s) { return !s || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s); }
  function listOf(s) { return String(s || '').split(/[;,]/).map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 20); }
  function download(name, data, type) {
    var b = new Blob([data], { type: type || 'text/plain' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function uuid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'x' + Date.now() + Math.random().toString(16).slice(2); }
  function safeName(n) { return String(n || 'archivo').replace(/[^\w.\-() ]+/g, '_').slice(0, 80); }
  function errMsg(e) { return (e && (e.message || e.error_description)) || 'Error inesperado'; }

  /* vCard 3.0 */
  function vEsc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
  function vcard(f) {
    var L = ['BEGIN:VCARD', 'VERSION:3.0', 'N:' + vEsc(f.apellidos) + ';' + vEsc(f.nombres) + ';;;', 'FN:' + vEsc(full(f))];
    if (f.cargo) L.push('TITLE:' + vEsc(f.cargo));
    if (f.departamento) L.push('ORG:StrataFlow;' + vEsc(f.departamento));
    if (f.correo) L.push('EMAIL;TYPE=WORK:' + vEsc(f.correo));
    if (f.telefono) L.push('TEL;TYPE=WORK,VOICE:' + vEsc(f.telefono + (f.extension ? ' ext. ' + f.extension : '')));
    if (f.celular) L.push('TEL;TYPE=CELL:' + vEsc(f.celular));
    if (f.sede) L.push('ADR;TYPE=WORK:;;' + vEsc(f.sede) + ';;;;');
    L.push('END:VCARD'); return L.join('\r\n');
  }
  function contactText(f) {
    return [full(f), f.cargo, f.departamento, f.sede, f.correo, f.telefono && (f.telefono + (f.extension ? ' ext. ' + f.extension : '')), f.celular].filter(Boolean).join('\n');
  }

  /* CSV */
  function csvCell(v) { v = v == null ? '' : String(v); return /[",;\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function parseCSV(text) {
    text = text.replace(/^\uFEFF/, '');
    var first = text.split(/\r?\n/)[0] || '', sep = (first.split(';').length > first.split(',').length) ? ';' : ',';
    var rows = [], row = [], cell = '', q = false, i, c;
    for (i = 0; i < text.length; i++) {
      c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === sep) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); });
  }
  var CSV_COLS = ['nombres', 'apellidos', 'cargo', 'departamento', 'sede', 'correo', 'telefono', 'extension', 'celular', 'whatsapp', 'fecha_ingreso', 'idiomas', 'habilidades', 'biografia'];

  /* configuración local (por dispositivo) */
  function cfgGet() { try { return Object.assign({ preview: true, dnd: false, from: '22:00', to: '07:00', muted: {} }, JSON.parse(localStorage.getItem('pb_cfg') || '{}')); } catch (e) { return { preview: true, dnd: false, from: '22:00', to: '07:00', muted: {} }; } }
  function cfgSet(c) { try { localStorage.setItem('pb_cfg', JSON.stringify(c)); } catch (e) { } }
  function inDnd(c) {
    if (!c.dnd) return false;
    var n = new Date(), m = n.getHours() * 60 + n.getMinutes(), a = c.from.split(':'), b = c.to.split(':'), f = +a[0] * 60 + +a[1], t = +b[0] * 60 + +b[1];
    return f <= t ? (m >= f && m < t) : (m >= f || m < t);
  }

  /* ---------- núcleo compartido: directorio, mensajes, presencia ---------- */
  var core = {
    started: false, dir: [], msgs: [], online: {}, unread: 0, loaded: false, error: '', ls: [], newCb: [],
    emit: function () { core.ls.slice().forEach(function (f) { f(); }); },
    byUser: function (uid) { for (var i = 0; i < core.dir.length; i++) if (core.dir[i].user_id === uid) return core.dir[i]; return null; },
    recount: function () { var me = meId(); core.unread = core.msgs.filter(function (m) { return m.para === me && !m.leido_en; }).length; },
    loadDir: async function () {
      var r = await sb().from('pb_directorio').select('*').order('apellidos', { ascending: true }).limit(2000);
      if (r.error) { core.error = errMsg(r.error); } else { core.dir = r.data || []; core.error = ''; }
      core.loaded = true; core.emit();
    },
    loadMsgs: async function () {
      var r = await sb().from('pb_mensajes').select('*').order('creado', { ascending: false }).limit(1500);
      if (!r.error) { core.msgs = (r.data || []).reverse(); core.recount(); core.markDelivered(); core.emit(); }
    },
    merge: function (m) {
      var i, found = false;
      for (i = 0; i < core.msgs.length; i++) if (core.msgs[i].id === m.id) { core.msgs[i] = m; found = true; break; }
      if (!found) core.msgs.push(m);
      core.recount(); core.emit();
    },
    markDelivered: function () {
      var me = meId(), ids = core.msgs.filter(function (m) { return m.para === me && !m.entregado_en; }).map(function (m) { return m.id; });
      if (ids.length) sb().from('pb_mensajes').update({ entregado_en: new Date().toISOString() }).in('id', ids).then(function () { });
    },
    markRead: function (peer) {
      var me = meId(), now = new Date().toISOString();
      var ids = core.msgs.filter(function (m) { return m.para === me && m.de === peer && !m.leido_en; }).map(function (m) { return m.id; });
      if (!ids.length) return;
      core.msgs.forEach(function (m) { if (ids.indexOf(m.id) >= 0) { m.leido_en = now; m.entregado_en = m.entregado_en || now; } });
      core.recount(); core.emit();
      sb().from('pb_mensajes').update({ leido_en: now, entregado_en: now }).in('id', ids).then(function () { });
    },
    notify: function (m) {
      var cfg = cfgGet(), f = core.byUser(m.de), nombre = f ? full(f) : 'Nuevo mensaje';
      if (cfg.muted[m.de]) return;
      var cuerpo = m.adjunto && !m.cuerpo ? 'Te envió un archivo' : m.cuerpo;
      core.newCb.forEach(function (cb) { try { cb(nombre + ': ' + (cfg.preview ? String(cuerpo).slice(0, 60) : 'mensaje nuevo')); } catch (e) { } });
      if (inDnd(cfg) || !document.hidden) return;
      if (window.Notification && Notification.permission === 'granted') {
        var opts = { body: cfg.preview ? String(cuerpo).slice(0, 120) : 'Tienes un mensaje nuevo', tag: 'pb-' + m.de, icon: '/apple-touch-icon.png', data: { peer: m.de } };
        try {
          if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(function (reg) { reg.showNotification(nombre, opts); }, function () { new Notification(nombre, opts); });
          else new Notification(nombre, opts);
        } catch (e) { }
      }
    },
    badge: function () {
      var n = core.unread;
      try { if (navigator.setAppBadge) { if (n > 0) navigator.setAppBadge(n); else navigator.clearAppBadge(); } } catch (e) { }
      var t = document.title.replace(/^\(\d+\)\s*/, ''); document.title = (n > 0 ? '(' + n + ') ' : '') + t;
    },
    start: function () {
      if (core.started || !sb() || !meId()) return; core.started = true;
      core.loadDir(); core.loadMsgs();
      core.ls.push(core.badge);
      var me = meId();
      core.ch = sb().channel('pb-msgs-' + me)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pb_mensajes' }, function (p) {
          var m = p.new; if (!m || (m.de !== me && m.para !== me)) return;
          core.merge(m);
          if (m.para === me) { core.markDelivered(); core.notify(m); }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pb_mensajes' }, function (p) { if (p.new && (p.new.de === me || p.new.para === me)) core.merge(p.new); })
        .subscribe();
      core.pres = sb().channel('pb-presence', { config: { presence: { key: me } } });
      core.pres.on('presence', { event: 'sync' }, function () {
        var st = core.pres.presenceState(), o = {}; Object.keys(st).forEach(function (k) { o[k] = true; }); core.online = o; core.emit();
      }).subscribe(function (s) { if (s === 'SUBSCRIBED') core.pres.track({ at: Date.now() }); });
      /* respaldo ante canales que se caigan: recarga periódica ligera */
      core.timer = setInterval(function () { if (!document.hidden) core.loadMsgs(); }, 60000);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) core.loadMsgs(); });
    },
    estado: function (f) {
      if (!f.user_id || !core.online[f.user_id]) return 'desconectado';
      return f.estado || 'disponible';
    }
  };
  function useCore() {
    var s = useState(0), set = s[1];
    useEffect(function () { core.start(); var f = function () { set(function (x) { return x + 1; }); }; core.ls.push(f); return function () { core.ls = core.ls.filter(function (x) { return x !== f; }); }; }, []);
    return core;
  }
  function useUnread(onNew) {
    var c = useCore();
    useEffect(function () { if (!onNew) return; core.newCb.push(onNew); return function () { core.newCb = core.newCb.filter(function (x) { return x !== onNew; }); }; }, [onNew]);
    return c.unread;
  }

  window.PB = { version: '1.0', core: core, useUnread: useUnread, _u: { full: full, initials: initials, norm: norm, fmtDate: fmtDate, fmtTime: fmtTime, fmtSize: fmtSize, normPhone: normPhone, phoneOk: phoneOk, emailOk: emailOk, listOf: listOf, download: download, uuid: uuid, safeName: safeName, errMsg: errMsg, vcard: vcard, contactText: contactText, csvCell: csvCell, parseCSV: parseCSV, stamp: stamp, cfgGet: cfgGet, cfgSet: cfgSet, isAdm: isAdm, meId: meId, sb: sb, MAX_FILE: MAX_FILE, PAGE: PAGE, ESTADOS: ESTADOS, ESTADO_COLOR: ESTADO_COLOR, CAMPOS_PRIV: CAMPOS_PRIV, CSV_COLS: CSV_COLS, useCore: useCore, h: h } };
})();
