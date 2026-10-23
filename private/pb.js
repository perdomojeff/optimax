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
    started: false, dir: [], msgs: [], online: {}, unread: 0, loaded: false, error: '', ls: [], newCb: [], groups: [], members: {}, lect: {}, joined: {},
    emit: function () { core.ls.slice().forEach(function (f) { f(); }); },
    byUser: function (uid) { for (var i = 0; i < core.dir.length; i++) if (core.dir[i].user_id === uid) return core.dir[i]; return null; },
    ts: function (x) { return x ? Date.parse(x) || 0 : 0; },
    lastRead: function (gid) { return Math.max(core.ts(core.lect[gid]), core.ts(core.joined[gid])); },
    groupUnread: function (gid) { var me = meId(), lr = core.lastRead(gid); return core.msgs.filter(function (m) { return m.grupo_id === gid && m.de !== me && core.ts(m.creado) > lr; }).length; },
    recount: function () {
      var me = meId(), n = core.msgs.filter(function (m) { return m.para === me && !m.leido_en; }).length;
      core.groups.forEach(function (g) { n += core.groupUnread(g.id); });
      core.unread = n;
    },
    isMember: function (gid) { return core.groups.some(function (g) { return g.id === gid; }); },
    groupById: function (gid) { for (var i = 0; i < core.groups.length; i++) if (core.groups[i].id === gid) return core.groups[i]; return null; },
    loadGroups: async function () {
      var me = meId(), a = await Promise.all([sb().from('pb_grupos').select('*'), sb().from('pb_grupo_miembros').select('*'), sb().from('pb_grupo_lecturas').select('*')]);
      if (a[0].error || a[1].error) return;
      var mem = {}, joined = {}, lect = {};
      (a[1].data || []).forEach(function (x) { (mem[x.grupo_id] = mem[x.grupo_id] || []).push(x.user_id); if (x.user_id === me) joined[x.grupo_id] = x.agregado; });
      (a[2].data || []).forEach(function (x) { lect[x.grupo_id] = x.leido_hasta; });
      core.members = mem; core.joined = joined; core.lect = Object.assign({}, lect, core.lect && Object.keys(core.lect).reduce(function (o, k) { if (core.ts(core.lect[k]) > core.ts(lect[k])) o[k] = core.lect[k]; return o; }, {}));
      core.groups = (a[0].data || []).filter(function (g) { return joined[g.id]; });
      core.recount(); core.emit();
    },
    markReadGroup: function (gid) {
      if (!core.groupUnread(gid)) return;
      var now = new Date().toISOString(); core.lect[gid] = now; core.recount(); core.emit();
      sb().from('pb_grupo_lecturas').upsert({ grupo_id: gid, user_id: meId(), leido_hasta: now }, { onConflict: 'grupo_id,user_id' }).then(function () { });
    },
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
      var cfg = cfgGet(), f = core.byUser(m.de), nombre = f ? full(f) : 'Nuevo mensaje', g = m.grupo_id ? core.groupById(m.grupo_id) : null;
      if (g) nombre = g.nombre + ' · ' + nombre;
      if (cfg.muted[m.grupo_id || m.de]) return;
      var cuerpo = m.adjunto && !m.cuerpo ? 'Te envió un archivo' : m.cuerpo;
      core.newCb.forEach(function (cb) { try { cb(nombre + ': ' + (cfg.preview ? String(cuerpo).slice(0, 60) : 'mensaje nuevo')); } catch (e) { } });
      if (inDnd(cfg) || !document.hidden) return;
      if (window.Notification && Notification.permission === 'granted') {
        var opts = { body: cfg.preview ? String(cuerpo).slice(0, 120) : 'Tienes un mensaje nuevo', tag: m.grupo_id ? 'pb-g-' + m.grupo_id : 'pb-' + m.de, icon: '/icon-192.png', data: { peer: m.grupo_id ? '' : m.de, grupo: m.grupo_id || '' } };
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
      core.loadDir(); core.loadGroups().then(function () { return core.loadMsgs(); }); core.pushEnsure();
      core.ls.push(core.badge);
      var me = meId();
      core.ch = sb().channel('pb-msgs-' + me)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pb_mensajes' }, function (p) {
          var m = p.new; if (!m) return;
          var go = function () {
            core.merge(m);
            if (m.para === me) { core.markDelivered(); core.notify(m); } else if (m.grupo_id && m.de !== me) core.notify(m);
          };
          if (m.grupo_id && !core.isMember(m.grupo_id)) core.loadGroups().then(go); else if (m.grupo_id || m.de === me || m.para === me) go();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pb_grupo_miembros' }, function () { core.loadGroups().then(function () { return core.loadMsgs(); }); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pb_mensajes' }, function (p) { if (p.new && (p.new.de === me || p.new.para === me)) core.merge(p.new); })
        .subscribe();
      core.pres = sb().channel('pb-presence', { config: { presence: { key: me } } });
      core.pres.on('presence', { event: 'sync' }, function () {
        var st = core.pres.presenceState(), o = {}; Object.keys(st).forEach(function (k) { o[k] = true; }); core.online = o; core.emit();
      }).subscribe(function (s) { if (s === 'SUBSCRIBED') core.pres.track({ at: Date.now() }); });
      /* respaldo ante canales que se caigan: recarga periódica ligera */
      core.timer = setInterval(function () { if (!document.hidden) core.loadGroups().then(function () { return core.loadMsgs(); }); }, 60000);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) { core.loadGroups().then(function () { return core.loadMsgs(); }); core.pushEnsure(); } });
    },
    /* ----- Web Push (notificaciones con la aplicación cerrada) ----- */
    pushSupported: function () { return !!(navigator.serviceWorker && window.PushManager && window.Notification); },
    pushStatus: async function () {
      if (!core.pushSupported()) return 'unsupported';
      if (Notification.permission === 'denied') return 'denied';
      if (Notification.permission !== 'granted') return 'default';
      try { var reg = await navigator.serviceWorker.getRegistration(); var sub = reg && await reg.pushManager.getSubscription(); return sub ? 'on' : 'off'; } catch (e) { return 'off'; }
    },
    pushKey: async function () {
      var s = sb(), r = await fetch(s.supabaseUrl + '/functions/v1/pb-push', { headers: { apikey: s.supabaseKey } });
      if (!r.ok) throw new Error('El servicio de notificaciones aún no está disponible (' + r.status + ').');
      var j = await r.json(); if (!j.key) throw new Error('El servicio de notificaciones no devolvió la clave.'); return j.key;
    },
    pushSave: async function (sub) {
      var j = sub.toJSON(), c = cfgGet(), muted = Object.keys(c.muted).filter(function (k) { return c.muted[k]; });
      var r = await sb().rpc('pb_push_registrar', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_ua: navigator.userAgent, p_preview: c.preview, p_muted: muted, p_dnd: c.dnd, p_dnd_from: c.from, p_dnd_to: c.to, p_tz: new Date().getTimezoneOffset() });
      if (r.error) throw r.error;
    },
    pushSubscribe: async function () {
      var reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'));
      await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.getSubscription();
      if (!sub) {
        var key = await core.pushKey(), raw = atob((key + '==='.slice((key.length + 3) % 4)).replace(/-/g, '+').replace(/_/g, '/')), arr = new Uint8Array(raw.length);
        for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: arr });
      }
      await core.pushSave(sub); return sub;
    },
    pushEnable: async function () {
      var perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error('Permiso de notificaciones no concedido.');
      await core.pushSubscribe();
    },
    pushDisable: async function () {
      var reg = await navigator.serviceWorker.getRegistration(), sub = reg && await reg.pushManager.getSubscription();
      if (sub) { await sb().from('pb_push').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
    },
    pushEnsure: function () {   /* renueva la suscripción y los ajustes del dispositivo si ya hay permiso */
      if (!core.pushSupported() || Notification.permission !== 'granted') return;
      core.pushSubscribe().catch(function () { });
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

  window.PB = { version: '1.0', core: core, useUnread: useUnread, _u: { full: full, initials: initials, norm: norm, fmtDate: fmtDate, fmtTime: fmtTime, fmtSize: fmtSize, normPhone: normPhone, phoneOk: phoneOk, emailOk: emailOk, listOf: listOf, download: download, uuid: uuid, safeName: safeName, errMsg: errMsg, vcard: vcard, contactText: contactText, csvCell: csvCell, parseCSV: parseCSV, stamp: stamp, cfgGet: cfgGet, cfgSet: cfgSet, isAdm: isAdm, meId: meId, sb: sb, MAX_FILE: MAX_FILE, PAGE: PAGE, ESTADOS: ESTADOS, ESTADO_COLOR: ESTADO_COLOR, CAMPOS_PRIV: CAMPOS_PRIV, CSV_COLS: CSV_COLS, useCore: useCore, h: h, p2: p2 } };
})();
