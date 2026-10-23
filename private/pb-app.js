/* StrataFlow · Páginas Blancas · pestaña principal (directorio, organigrama, chat, administración). Se carga después de pb-ui.js */
(function () {
  if (!window.PB || window.PB.Tab) return;
  var U = window.PB._u, core = window.PB.core, UI = window.PB._ui, h = U.h, React = window.React;
  var useState = React.useState, useEffect = React.useEffect, useMemo = React.useMemo, useRef = React.useRef;
  var Ico = UI.Ico, Avatar = UI.Avatar, Modal = UI.Modal, Field = UI.Field, full = U.full, sb = U.sb;

  function useDebounced(v, ms) { var s = useState(v), d = s[0], set = s[1]; useEffect(function () { var t = setTimeout(function () { set(v); }, ms); return function () { clearTimeout(t); }; }, [v, ms]); return d; }
  function uniq(list, k) { var m = {}; list.forEach(function (x) { if (x[k]) m[x[k]] = 1; }); return Object.keys(m).sort(function (a, b) { return a.localeCompare(b, 'es'); }); }

  /* ---------- directorio ---------- */
  function Directory(p) {
    var s1 = useState(''), q = s1[0], setQ = s1[1], dq = useDebounced(q, 180);
    var s2 = useState({ dep: '', sede: '', cargo: '', est: '' }), fl = s2[0], setFl = s2[1];
    var s3 = useState('az'), ord = s3[0], setOrd = s3[1], s4 = useState('grid'), mode = s4[0], setMode = s4[1];
    var s5 = useState(''), letter = s5[0], setLetter = s5[1], s6 = useState(U.PAGE), shown = s6[0], setShown = s6[1], s7 = useState(false), inact = s7[0], setInact = s7[1];
    var adm = U.isAdm();
    var base = useMemo(function () { return core.dir.filter(function (f) { return f.activo || (adm && inact); }); }, [core.dir, inact, adm]);
    var list = useMemo(function () {
      var nq = U.norm(dq);
      var r = base.filter(function (f) {
        if (fl.dep && f.departamento !== fl.dep) return false; if (fl.sede && f.sede !== fl.sede) return false; if (fl.cargo && f.cargo !== fl.cargo) return false;
        if (fl.est && core.estado(f) !== fl.est) return false;
        if (letter && U.norm((f.apellidos || f.nombres).charAt(0)).toUpperCase() !== letter) return false;
        if (!nq) return true;
        return U.norm([full(f), f.cargo, f.departamento, f.sede, f.correo, f.telefono, f.celular, f.extension, (f.habilidades || []).join(' ')].join(' ')).indexOf(nq) >= 0;
      });
      r.sort(function (a, b) { var c = ((a.apellidos || '') + ' ' + a.nombres).localeCompare((b.apellidos || '') + ' ' + b.nombres, 'es', { sensitivity: 'base' }); return ord === 'az' ? c : -c; });
      return r;
    }, [base, dq, fl, ord, letter, core.online]);
    useEffect(function () { setShown(U.PAGE); }, [dq, fl, ord, letter, inact]);
    useEffect(function () { p.setVisible && p.setVisible(list); }, [list]);
    var letters = useMemo(function () { var m = {}; base.forEach(function (f) { m[U.norm((f.apellidos || f.nombres).charAt(0)).toUpperCase()] = 1; }); return m; }, [base]);
    var AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    function sel(k, label, opts, fmt) {
      return h('select', { className: 'pb-in', style: { width: 'auto', maxWidth: 190 }, 'aria-label': label, value: fl[k], onChange: function (e) { var n = Object.assign({}, fl); n[k] = e.target.value; setFl(n); } },
        h('option', { value: '' }, label + ': todos'), opts.map(function (o) { return h('option', { key: o, value: o }, fmt ? fmt(o) : o); }));
    }
    if (!core.loaded) return h('div', { className: 'pb-empty' }, 'Cargando directorio…');
    if (core.error) return h('div', { className: 'pb-empty', role: 'alert' }, 'No se pudo cargar el directorio: ' + core.error, h('div', null, h('button', { type: 'button', className: 'pb-b', style: { marginTop: 10 }, onClick: function () { core.loadDir(); } }, 'Reintentar')));
    var vis = list.slice(0, shown), hasFilter = q || letter || fl.dep || fl.sede || fl.cargo || fl.est;
    return h('div', null,
      h('div', { className: 'pb-bar' },
        h('div', { className: 'pb-grow', style: { position: 'relative' } }, h('input', { className: 'pb-in', type: 'search', value: q, placeholder: 'Buscar por nombre, cargo, departamento, sede, correo, teléfono o habilidad…', 'aria-label': 'Buscar en el directorio', onChange: function (e) { setQ(e.target.value); } })),
        h('div', { role: 'group', 'aria-label': 'Vista', style: { display: 'inline-flex', gap: 4 } },
          h('button', { type: 'button', className: 'pb-b' + (mode === 'grid' ? ' prim' : ''), 'aria-pressed': mode === 'grid', onClick: function () { setMode('grid'); }, title: 'Tarjetas' }, h(Ico, { n: 'grid', s: 14 })),
          h('button', { type: 'button', className: 'pb-b' + (mode === 'list' ? ' prim' : ''), 'aria-pressed': mode === 'list', onClick: function () { setMode('list'); }, title: 'Lista' }, h(Ico, { n: 'list', s: 14 }))),
        h('button', { type: 'button', className: 'pb-b', onClick: function () { setOrd(ord === 'az' ? 'za' : 'az'); } }, ord === 'az' ? 'A → Z' : 'Z → A')),
      h('div', { className: 'pb-bar' }, sel('dep', 'Departamento', uniq(base, 'departamento')), sel('sede', 'Sede', uniq(base, 'sede')), sel('cargo', 'Cargo', uniq(base, 'cargo')),
        sel('est', 'Disponibilidad', ['disponible', 'ocupado', 'ausente', 'desconectado'], function (o) { return U.ESTADOS[o]; }),
        adm ? h('label', { className: 'pb-sw' }, h('input', { type: 'checkbox', checked: inact, onChange: function (e) { setInact(e.target.checked); } }), 'Mostrar desactivadas') : null,
        hasFilter ? h('button', { type: 'button', className: 'pb-b', onClick: function () { setQ(''); setLetter(''); setFl({ dep: '', sede: '', cargo: '', est: '' }); } }, 'Limpiar filtros') : null),
      h('div', { className: 'pb-sub', style: { marginBottom: 8 }, 'aria-live': 'polite' }, list.length + (list.length === 1 ? ' trabajador' : ' trabajadores')),
      h('div', { className: 'pb-main' },
        h('nav', { className: 'pb-az', 'aria-label': 'Índice alfabético por apellido' }, AZ.map(function (l) { return h('button', { key: l, type: 'button', disabled: !letters[l], 'aria-pressed': letter === l, onClick: function () { setLetter(letter === l ? '' : l); } }, l); })),
        !list.length ? h('div', { className: 'pb-empty pb-panel', style: { flex: 1 } }, h('div', { style: { fontSize: 16, fontWeight: 600, marginBottom: 4 } }, 'Sin resultados'), 'No encontramos trabajadores con esos criterios. Prueba con otro término o limpia los filtros.')
          : mode === 'grid'
            ? h('div', { className: 'pb-grid' }, vis.map(function (f) {
              var est = core.estado(f);
              return h('button', { key: f.id, type: 'button', className: 'pb-card', onClick: function () { p.onOpen(f); }, 'aria-label': 'Abrir ficha de ' + full(f), style: f.activo ? null : { opacity: 0.55 } },
                h(Avatar, { f: f, size: 72, estado: est }), h('div', { className: 'pb-nm pb-ell' }, full(f)), h('div', { className: 'pb-sub pb-ell' }, f.cargo || '—'), h('div', { className: 'pb-sub pb-ell' }, [f.departamento, f.sede].filter(Boolean).join(' · ')),
                h('div', { className: 'pb-sub', style: { color: U.ESTADO_COLOR[est] } }, '● ' + U.ESTADOS[est] + (f.activo ? '' : ' · desactivada')));
            }))
            : h('div', { className: 'pb-list' }, vis.map(function (f) {
              var est = core.estado(f);
              return h('button', { key: f.id, type: 'button', className: 'pb-row', onClick: function () { p.onOpen(f); }, style: f.activo ? null : { opacity: 0.55 } },
                h(Avatar, { f: f, size: 38, estado: est }),
                h('div', { style: { minWidth: 0, flex: 1 } }, h('div', { className: 'pb-nm pb-ell' }, full(f)), h('div', { className: 'pb-sub pb-ell' }, [f.cargo, f.departamento].filter(Boolean).join(' · '))),
                h('div', { className: 'pb-sub pb-ell', style: { width: 150 } }, f.sede), h('div', { className: 'pb-sub pb-ell', style: { width: 190 } }, f.correo || f.telefono || ''),
                h('div', { className: 'pb-sub', style: { color: U.ESTADO_COLOR[est], width: 100 } }, '● ' + U.ESTADOS[est]));
            }))),
      list.length > shown ? h('div', { style: { textAlign: 'center', marginTop: 12 } }, h('button', { type: 'button', className: 'pb-b', onClick: function () { setShown(shown + U.PAGE * 2); } }, 'Ver más (' + (list.length - shown) + ' restantes)')) : null);
  }

  /* ---------- organigrama ---------- */
  function OrgChart(p) {
    var act = core.dir.filter(function (f) { return f.activo; }), ids = {}; act.forEach(function (f) { ids[f.id] = 1; });
    var kids = {}; act.forEach(function (f) { var k = f.jefe_id && ids[f.jefe_id] ? f.jefe_id : '_root'; (kids[k] = kids[k] || []).push(f); });
    function node(f, d) {
      var ch = d < 8 ? (kids[f.id] || []) : [];
      return h('li', { key: f.id }, h('button', { type: 'button', className: 'pb-b', onClick: function () { p.onOpen(f); } }, h(Avatar, { f: f, size: 26 }), h('span', null, full(f)), h('span', { className: 'pb-sub' }, f.cargo || '')), ch.length ? h('ul', null, ch.map(function (c) { return node(c, d + 1); })) : null);
    }
    var roots = kids._root || [];
    if (!roots.length) return h('div', { className: 'pb-empty pb-panel' }, 'Aún no hay jerarquía registrada. Asigna un jefe directo en las fichas.');
    return h('div', { className: 'pb-panel pb-org', style: { padding: 14 } }, h('ul', null, roots.map(function (r) { return node(r, 0); })));
  }

  /* ---------- importación / exportación ---------- */
  function ImportModal(p) {
    var s1 = useState(null), rows = s1[0], setRows = s1[1], s2 = useState(''), err = s2[0], setErr = s2[1], s3 = useState(false), busy = s3[0], setBusy = s3[1];
    function pick(e) {
      var f = e.target.files && e.target.files[0]; if (!f) return; setErr('');
      if (f.size > 3 * 1024 * 1024) return setErr('El archivo supera 3 MB.');
      var rd = new FileReader();
      rd.onload = function () {
        var t = U.parseCSV(String(rd.result)); if (t.length < 2) return setErr('El archivo no tiene filas de datos.');
        var head = t[0].map(function (x) { return U.norm(x).replace(/[^a-z_]/g, ''); }), idx = {}; head.forEach(function (x, i) { idx[x] = i; });
        if (idx.nombres === undefined) return setErr('Falta la columna "nombres". Descarga la plantilla para ver el formato.');
        var seen = {}; core.dir.forEach(function (d) { if (d.correo) seen[d.correo.toLowerCase()] = 1; });
        var out = t.slice(1, 1001).map(function (r, i) {
          var g = function (k) { return idx[k] === undefined ? '' : String(r[idx[k]] || '').trim(); }, e = [];
          var o = { nombres: g('nombres'), apellidos: g('apellidos'), cargo: g('cargo'), departamento: g('departamento'), sede: g('sede'), correo: g('correo'), telefono: U.normPhone(g('telefono')), extension: g('extension'), celular: U.normPhone(g('celular')), whatsapp: U.normPhone(g('whatsapp')), fecha_ingreso: g('fecha_ingreso') || null, idiomas: U.listOf(g('idiomas')), habilidades: U.listOf(g('habilidades')), biografia: g('biografia').slice(0, 1000) };
          if (!o.nombres) e.push('Falta nombres'); if (!U.emailOk(o.correo)) e.push('Correo no válido');
          ['telefono', 'celular', 'whatsapp'].forEach(function (k) { if (!U.phoneOk(o[k])) e.push('Teléfono no válido (' + k + ')'); });
          if (o.fecha_ingreso && !/^\d{4}-\d{2}-\d{2}$/.test(o.fecha_ingreso)) e.push('Fecha debe ser AAAA-MM-DD');
          if (o.correo) { var c = o.correo.toLowerCase(); if (seen[c]) e.push('Correo duplicado'); else seen[c] = 1; }
          return { n: i + 2, o: o, e: e };
        });
        setRows(out);
      };
      rd.readAsText(f, 'utf-8');
    }
    var ok = rows ? rows.filter(function (r) { return !r.e.length; }) : [];
    async function run() {
      setBusy(true); var fail = '';
      for (var i = 0; i < ok.length; i += 100) { var r = await sb().from('pb_fichas').insert(ok.slice(i, i + 100).map(function (x) { return x.o; })); if (r.error) { fail = U.errMsg(r.error); break; } }
      setBusy(false); if (fail) setErr(fail); else p.onDone('Se importaron ' + ok.length + ' fichas.');
    }
    return h(Modal, { title: 'Importar fichas desde CSV', onClose: p.onClose, wide: true },
      h('p', { className: 'pb-hint' }, 'Archivo CSV (UTF-8, separado por comas o punto y coma). Columnas: ' + U.CSV_COLS.join(', ') + '. Idiomas y habilidades se separan con punto y coma. Si usas Excel, guarda como "CSV UTF-8".'),
      h('button', { type: 'button', className: 'pb-b', onClick: function () { U.download('Plantilla_Paginas_Blancas_' + U.stamp() + '.csv', '﻿' + U.CSV_COLS.join(',') + '\r\nMaría,Pérez,Analista,Operaciones,Caracas,maria.perez@ejemplo.test,+582125550000,100,+584145550000,,2024-01-15,Español;Inglés,Excel;SQL,Texto breve\r\n', 'text/csv'); } }, h(Ico, { n: 'dl', s: 14 }), 'Descargar plantilla'),
      h('div', { style: { margin: '10px 0' } }, h('input', { type: 'file', accept: '.csv,text/csv', onChange: pick, 'aria-label': 'Seleccionar archivo CSV' })),
      err ? h('div', { className: 'pb-err', role: 'alert' }, err) : null,
      rows ? h('div', null,
        h('p', null, h('b', null, ok.length), ' filas válidas · ', h('b', { style: { color: rows.length - ok.length ? 'var(--pb-crit)' : 'inherit' } }, rows.length - ok.length), ' con errores'),
        h('div', { style: { maxHeight: 280, overflow: 'auto' } }, h('table', { className: 'pb-tbl' }, h('thead', null, h('tr', null, ['Fila', 'Nombre', 'Correo', 'Estado'].map(function (x) { return h('th', { key: x }, x); }))),
          h('tbody', null, rows.slice(0, 80).map(function (r) { return h('tr', { key: r.n }, h('td', null, r.n), h('td', null, r.o.nombres + ' ' + r.o.apellidos), h('td', null, r.o.correo), h('td', { style: { color: r.e.length ? 'var(--pb-crit)' : 'var(--pb-good)' } }, r.e.length ? r.e.join('; ') : 'Lista')); })))),
        h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 } }, h('button', { type: 'button', className: 'pb-b', onClick: p.onClose }, 'Cancelar'),
          rows.length - ok.length ? h('button', { type: 'button', className: 'pb-b', onClick: function () { U.download('Errores_importacion_' + U.stamp() + '.csv', '﻿fila,error\r\n' + rows.filter(function (r) { return r.e.length; }).map(function (r) { return r.n + ',' + U.csvCell(r.e.join('; ')); }).join('\r\n'), 'text/csv'); } }, 'Descargar reporte de errores') : null,
          h('button', { type: 'button', className: 'pb-b prim', disabled: !ok.length || busy, onClick: run }, busy ? 'Importando…' : 'Importar ' + ok.length + ' fichas'))) : null);
  }
  function exportCSV(list) {
    var lines = [U.CSV_COLS.join(',')].concat(list.map(function (f) { return U.CSV_COLS.map(function (k) { var v = f[k]; if (Array.isArray(v)) v = v.join(';'); return U.csvCell(v); }).join(','); }));
    U.download('Paginas_Blancas_' + U.stamp() + '.csv', '﻿' + lines.join('\r\n'), 'text/csv');
  }
  function AuditModal(p) {
    var s = useState(null), rows = s[0], set = s[1];
    useEffect(function () { sb().from('pb_auditoria').select('*').order('id', { ascending: false }).limit(100).then(function (r) { set(r.error ? [] : r.data); }); }, []);
    var byId = {}; core.dir.forEach(function (f) { byId[f.id] = f; });
    return h(Modal, { title: 'Historial de cambios en fichas', onClose: p.onClose, wide: true },
      !rows ? h('div', { className: 'pb-empty' }, 'Cargando…') : !rows.length ? h('div', { className: 'pb-empty' }, 'Sin cambios registrados.')
        : h('div', { style: { overflow: 'auto', maxHeight: 420 } }, h('table', { className: 'pb-tbl' }, h('thead', null, h('tr', null, ['Fecha', 'Ficha', 'Acción', 'Campos', 'Realizado por'].map(function (x) { return h('th', { key: x }, x); }))),
          h('tbody', null, rows.map(function (r) { var f = byId[r.ficha_id], u = core.byUser(r.usuario); return h('tr', { key: r.id }, h('td', null, U.fmtTime(r.creado)), h('td', null, f ? full(f) : '—'), h('td', null, r.accion), h('td', null, (r.campos || []).join(', ')), h('td', null, u ? full(u) : r.usuario ? 'Usuario' : 'Sistema')); })))));
  }

  /* ---------- ajustes de notificaciones ---------- */
  function Settings(p) {
    var s = useState(U.cfgGet()), c = s[0], setC = s[1], s2 = useState(window.Notification ? Notification.permission : 'unsupported'), perm = s2[0], setPerm = s2[1];
    function upd(k, v) { var n = Object.assign({}, c); n[k] = v; setC(n); U.cfgSet(n); }
    var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var standalone = window.matchMedia && matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    function ask() { Notification.requestPermission().then(function (r) { setPerm(r); }); }
    return h(Modal, { title: 'Notificaciones', onClose: p.onClose },
      h('p', { style: { marginTop: 0 } }, 'Recibes un aviso dentro de StrataFlow cada vez que llega un mensaje. También puedes activar avisos del navegador mientras la aplicación esté abierta en segundo plano.'),
      perm === 'unsupported' ? h('p', { className: 'pb-hint' }, 'Este navegador no admite notificaciones; seguirás viendo los avisos y la insignia dentro de la aplicación.')
        : perm === 'granted' ? h('p', { style: { color: 'var(--pb-good)' } }, '✓ Avisos del navegador activados en este dispositivo.')
          : perm === 'denied' ? h('p', { className: 'pb-err' }, 'Los avisos están bloqueados. Habilítalos en la configuración del sitio de tu navegador.')
            : h('button', { type: 'button', className: 'pb-b prim', onClick: ask }, h(Ico, { n: 'bell', s: 14 }), 'Activar notificaciones'),
      ios && !standalone ? h('p', { className: 'pb-hint' }, 'En iPhone/iPad (iOS 16.4 o superior): abre StrataFlow en Safari, toca Compartir → «Añadir a pantalla de inicio» y abre la app desde ese ícono antes de activar las notificaciones.') : null,
      h('label', { className: 'pb-sw', style: { margin: '10px 0' } }, h('input', { type: 'checkbox', checked: c.preview, onChange: function (e) { upd('preview', e.target.checked); } }), 'Mostrar vista previa del mensaje en los avisos'),
      h('label', { className: 'pb-sw', style: { margin: '10px 0' } }, h('input', { type: 'checkbox', checked: c.dnd, onChange: function (e) { upd('dnd', e.target.checked); } }), 'No molestar en este horario'),
      c.dnd ? h('div', { className: 'pb-g2' }, h(Field, { id: 'pbd1', label: 'Desde' }, h('input', { id: 'pbd1', type: 'time', className: 'pb-in', value: c.from, onChange: function (e) { upd('from', e.target.value); } })), h(Field, { id: 'pbd2', label: 'Hasta' }, h('input', { id: 'pbd2', type: 'time', className: 'pb-in', value: c.to, onChange: function (e) { upd('to', e.target.value); } }))) : null,
      Object.keys(c.muted).filter(function (k) { return c.muted[k]; }).length ? h('div', null, h('div', { className: 'pb-lbl', style: { marginTop: 10 } }, 'Chats silenciados'), Object.keys(c.muted).filter(function (k) { return c.muted[k]; }).map(function (k) { var f = core.byUser(k); return h('button', { key: k, type: 'button', className: 'pb-b', style: { margin: '0 6px 6px 0' }, onClick: function () { var m = Object.assign({}, c.muted); delete m[k]; upd('muted', m); } }, (f ? full(f) : 'Usuario') + ' ✕'); })) : null,
      h('p', { className: 'pb-hint' }, 'Estos ajustes se guardan en este dispositivo. Las notificaciones con la aplicación completamente cerrada requieren la configuración de Web Push descrita en la documentación del módulo.'));
  }

  /* ---------- chat ---------- */
  var OK_EXT = { pdf: 1, png: 1, jpg: 1, jpeg: 1, webp: 1, txt: 1, csv: 1, doc: 1, docx: 1, xls: 1, xlsx: 1, ppt: 1, pptx: 1 };
  var MIME_EXT = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', txt: 'text/plain', csv: 'text/csv', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
  var urlCache = {};
  function Attach(p) {
    var a = p.a, isImg = /^image\//.test(a.type || ''), s = useState(urlCache[a.path] || ''), url = s[0], setUrl = s[1];
    useEffect(function () {
      if (!isImg || url) return; var alive = true;
      sb().storage.from('pb-adjuntos').createSignedUrl(a.path, 3600).then(function (r) { if (alive && r.data) { urlCache[a.path] = r.data.signedUrl; setUrl(r.data.signedUrl); } });
      return function () { alive = false; };
    }, [a.path]);
    function open() { sb().storage.from('pb-adjuntos').createSignedUrl(a.path, 120, { download: a.name }).then(function (r) { if (r.data) window.open(r.data.signedUrl, '_blank', 'noopener'); }); }
    return h('div', null,
      isImg && url ? h('img', { className: 'pb-img', src: url, alt: 'Imagen adjunta: ' + a.name, loading: 'lazy', onClick: open }) : null,
      h('div', { className: 'pb-att' }, h(Ico, { n: 'clip', s: 14 }), h('span', { className: 'pb-ell', style: { flex: 1 } }, a.name), h('span', null, U.fmtSize(a.size || 0)),
        h('button', { type: 'button', className: 'pb-b', style: { padding: '2px 8px' }, onClick: open, 'aria-label': 'Descargar ' + a.name }, h(Ico, { n: 'dl', s: 13 }))));
  }
  function Ticks(p) {
    var m = p.m; if (m.de !== U.meId()) return null;
    var st = m.leido_en ? 'Leído' : m.entregado_en ? 'Entregado' : 'Enviado';
    return h('span', { title: st, 'aria-label': st, style: { color: m.leido_en ? '#1a5fb4' : 'inherit', marginLeft: 4 } }, m.entregado_en || m.leido_en ? '✓✓' : '✓');
  }
  function Thread(p) {
    var peer = p.peer, f = core.byUser(peer), me = U.meId();
    var s1 = useState(''), txt = s1[0], setTxt = s1[1], s2 = useState(false), busy = s2[0], setBusy = s2[1], s3 = useState(''), err = s3[0], setErr = s3[1], s4 = useState(false), typing = s4[0], setTyping = s4[1], s5 = useState(null), file = s5[0], setFile = s5[1];
    var end = useRef(null), chRef = useRef(null), lastT = useRef(0), fileIn = useRef(null);
    var msgs = core.msgs.filter(function (m) { return (m.de === me && m.para === peer) || (m.de === peer && m.para === me); });
    useEffect(function () { core.markRead(peer); }, [peer, msgs.length, document.hidden]);
    useEffect(function () { if (end.current) end.current.scrollTop = end.current.scrollHeight; }, [msgs.length, typing, peer]);
    useEffect(function () {
      var name = 'pb-t-' + [me, peer].sort().join('-'), tm = null;
      var ch = sb().channel(name).on('broadcast', { event: 'typing' }, function (e) { if (e.payload && e.payload.from === peer) { setTyping(true); clearTimeout(tm); tm = setTimeout(function () { setTyping(false); }, 3000); } }).subscribe();
      chRef.current = ch; setTyping(false);
      return function () { clearTimeout(tm); try { sb().removeChannel(ch); } catch (e) { } };
    }, [peer]);
    function onType(v) { setTxt(v); var n = Date.now(); if (chRef.current && n - lastT.current > 2500 && v) { lastT.current = n; try { chRef.current.send({ type: 'broadcast', event: 'typing', payload: { from: me } }); } catch (e) { } } }
    function pickFile(e) {
      var fl = e.target.files && e.target.files[0]; e.target.value = ''; if (!fl) return; setErr('');
      var ext = (fl.name.split('.').pop() || '').toLowerCase();
      if (!OK_EXT[ext]) return setErr('Tipo de archivo no permitido. Admitimos PDF, imágenes, Word, Excel, PowerPoint, TXT y CSV.');
      if (fl.size > U.MAX_FILE) return setErr('El archivo supera el límite de 25 MB (' + U.fmtSize(fl.size) + ').');
      if (!fl.size) return setErr('El archivo está vacío.');
      setFile(fl);
    }
    async function send() {
      var body = txt.trim(); if ((!body && !file) || busy) return; setBusy(true); setErr('');
      try {
        var adj = null;
        if (file) {
          var ext = (file.name.split('.').pop() || '').toLowerCase(), path = me + '/' + U.uuid() + '-' + U.safeName(file.name);
          var up = await sb().storage.from('pb-adjuntos').upload(path, file, { contentType: MIME_EXT[ext] || file.type || 'application/octet-stream', upsert: false });
          if (up.error) throw up.error;
          adj = { path: path, name: U.safeName(file.name), size: file.size, type: MIME_EXT[ext] || file.type };
        }
        var r = await sb().from('pb_mensajes').insert({ de: me, para: peer, cuerpo: body.slice(0, 4000), adjunto: adj }).select().single();
        if (r.error) throw r.error;
        core.merge(r.data); setTxt(''); setFile(null);
      } catch (e) { setErr('No se pudo enviar: ' + U.errMsg(e)); }
      setBusy(false);
    }
    var cfg = U.cfgGet(), muted = !!cfg.muted[peer], lastDay = '';
    return h('div', { className: 'pb-th' },
      h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--pb-line)' } },
        h('button', { type: 'button', className: 'pb-b pb-back', onClick: p.onBack, 'aria-label': 'Volver a conversaciones' }, h(Ico, { n: 'back', s: 14 })),
        f ? h(Avatar, { f: f, size: 36, estado: core.estado(f) }) : null,
        h('div', { style: { minWidth: 0, flex: 1 } }, h('div', { className: 'pb-nm pb-ell' }, f ? full(f) : 'Usuario'), h('div', { className: 'pb-sub' }, typing ? 'escribiendo…' : (f ? U.ESTADOS[core.estado(f)] : ''))),
        f ? h('button', { type: 'button', className: 'pb-b', onClick: function () { p.onOpen(f); } }, 'Ver ficha') : null,
        h('button', { type: 'button', className: 'pb-b', onClick: function () { var c = U.cfgGet(); c.muted[peer] = !c.muted[peer]; U.cfgSet(c); p.refresh(); }, title: 'Silenciar avisos de este chat' }, muted ? 'Silenciado' : 'Silenciar')),
      h('div', { className: 'pb-msgs', ref: end, role: 'log', 'aria-live': 'polite', 'aria-label': 'Mensajes' },
        !msgs.length ? h('div', { className: 'pb-empty' }, 'Aún no hay mensajes. Escribe el primero.') : null,
        msgs.map(function (m) {
          var d = new Date(m.creado).toDateString(), sep = d !== lastDay ? h('div', { key: 'd' + m.id, className: 'pb-day' }, new Date(m.creado).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })) : null; lastDay = d;
          return [sep, h('div', { key: m.id, className: 'pb-m ' + (m.de === me ? 'me' : 'ot') }, m.adjunto ? h(Attach, { a: m.adjunto }) : null, m.cuerpo ? h('div', null, m.cuerpo) : null, h('div', { className: 'pb-meta' }, U.fmtTime(m.creado), h(Ticks, { m: m })))];
        })),
      err ? h('div', { className: 'pb-err', role: 'alert', style: { padding: '0 12px' } }, err) : null,
      file ? h('div', { className: 'pb-att', style: { margin: '0 10px' } }, h(Ico, { n: 'clip', s: 14 }), h('span', { className: 'pb-ell', style: { flex: 1 } }, file.name), h('span', null, U.fmtSize(file.size)), h('button', { type: 'button', className: 'pb-b', style: { padding: '2px 8px' }, onClick: function () { setFile(null); }, 'aria-label': 'Quitar adjunto' }, h(Ico, { n: 'x', s: 12 }))) : null,
      h('div', { className: 'pb-comp' },
        h('input', { ref: fileIn, type: 'file', hidden: true, onChange: pickFile, accept: '.pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx' }),
        h('button', { type: 'button', className: 'pb-b', onClick: function () { fileIn.current && fileIn.current.click(); }, 'aria-label': 'Adjuntar archivo (hasta 25 MB)', title: 'Adjuntar (hasta 25 MB)' }, h(Ico, { n: 'clip', s: 15 })),
        h('textarea', { className: 'pb-in', rows: 1, value: txt, maxLength: 4000, placeholder: 'Escribe un mensaje…', 'aria-label': 'Mensaje', onChange: function (e) { onType(e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } } }),
        h('button', { type: 'button', className: 'pb-b prim', disabled: busy || (!txt.trim() && !file), onClick: send }, h(Ico, { n: 'send', s: 14 }), busy ? 'Enviando…' : 'Enviar')));
  }
  function Chat(p) {
    var me = U.meId(), s = useState(''), q = s[0], setQ = s[1], s2 = useState(0), tick = s2[0], setTick = s2[1];
    var convs = (function () {
      var m = {}; core.msgs.forEach(function (x) { var o = x.de === me ? x.para : x.de; var c = m[o] || (m[o] = { peer: o, last: x, unread: 0 }); c.last = x; if (x.para === me && !x.leido_en) c.unread++; });
      var arr = Object.keys(m).map(function (k) { return m[k]; }); arr.sort(function (a, b) { return a.last.creado < b.last.creado ? 1 : -1; });
      if (p.peer && !m[p.peer]) arr.unshift({ peer: p.peer, last: null, unread: 0 });
      return arr;
    })();
    var nq = U.norm(q), list = convs.filter(function (c) { var f = core.byUser(c.peer); return !nq || (f && U.norm(full(f)).indexOf(nq) >= 0); });
    var newOpts = core.dir.filter(function (f) { return f.user_id && f.user_id !== me && f.activo; });
    return h('div', { className: 'pb-panel pb-chat' + (p.peer ? ' th' : '') },
      h('div', { className: 'pb-inbox' },
        h('div', { style: { padding: 10, display: 'flex', flexDirection: 'column', gap: 6 } },
          h('input', { className: 'pb-in', type: 'search', placeholder: 'Buscar conversación…', 'aria-label': 'Buscar conversación', value: q, onChange: function (e) { setQ(e.target.value); } }),
          h('select', { className: 'pb-in', 'aria-label': 'Nueva conversación', value: '', onChange: function (e) { if (e.target.value) p.setPeer(e.target.value); } }, h('option', { value: '' }, '+ Nueva conversación…'), newOpts.map(function (f) { return h('option', { key: f.user_id, value: f.user_id }, full(f)); }))),
        !list.length ? h('div', { className: 'pb-empty' }, convs.length ? 'Sin coincidencias.' : 'No tienes conversaciones. Abre una ficha y pulsa «Chatear», o usa «Nueva conversación».') : null,
        list.map(function (c) {
          var f = core.byUser(c.peer); if (!f) return null;
          return h('button', { key: c.peer, type: 'button', className: 'pb-conv', 'aria-current': p.peer === c.peer, onClick: function () { p.setPeer(c.peer); } },
            h(Avatar, { f: f, size: 40, estado: core.estado(f) }),
            h('div', { style: { minWidth: 0, flex: 1 } }, h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 6 } }, h('span', { className: 'pb-nm pb-ell' }, full(f)), c.last ? h('span', { className: 'pb-sub', style: { fontSize: 11, flex: 'none' } }, U.fmtTime(c.last.creado)) : null),
              h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 6 } }, h('span', { className: 'pb-sub pb-ell' }, c.last ? (c.last.de === me ? 'Tú: ' : '') + (c.last.cuerpo || '📎 ' + (c.last.adjunto && c.last.adjunto.name)) : 'Conversación nueva'), c.unread ? h('span', { className: 'pb-cnt', 'aria-label': c.unread + ' sin leer' }, c.unread) : null)));
        })),
      p.peer ? h(Thread, { key: p.peer, peer: p.peer, onBack: function () { p.setPeer(''); }, onOpen: p.onOpen, refresh: function () { setTick(tick + 1); } }) : h('div', { className: 'pb-empty pb-th', style: { justifyContent: 'center' } }, h(Ico, { n: 'chat', s: 36 }), h('div', { style: { marginTop: 8 } }, 'Selecciona una conversación')));
  }

  /* ---------- pestaña ---------- */
  function Tab(p) {
    var c = window.PB.core; var cc = U.useCore();
    var q0 = new URLSearchParams(location.search).get('chat') || '';
    var s1 = useState(q0 ? 'chat' : 'dir'), tab = s1[0], setTab = s1[1], s2 = useState(null), open = s2[0], setOpen = s2[1], s3 = useState(null), form = s3[0], setForm = s3[1], s4 = useState(q0), peer = s4[0], setPeer = s4[1];
    useEffect(function () { var f = function (e) { if (e.data && e.data.type === 'pb-open' && e.data.peer) { setPeer(e.data.peer); setTab('chat'); } }; if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', f); return function () { if (navigator.serviceWorker) navigator.serviceWorker.removeEventListener('message', f); }; }, []);
    var s5 = useState(''), toast = s5[0], setToast = s5[1], s6 = useState(''), modal = s6[0], setModal = s6[1], s7 = useState([]), visible = s7[0], setVisible = s7[1];
    var adm = U.isAdm(), me = U.meId();
    useEffect(function () { if (!toast) return; var t = setTimeout(function () { setToast(''); }, 4000); return function () { clearTimeout(t); }; }, [toast]);
    var openFresh = open ? (c.dir.filter(function (x) { return x.id === open.id; })[0] || open) : null;
    async function toggle(f) { var r = await sb().from('pb_fichas').update({ activo: !f.activo }).eq('id', f.id); if (r.error) setToast(U.errMsg(r.error)); else { setToast(f.activo ? 'Ficha desactivada.' : 'Ficha reactivada.'); setOpen(null); c.loadDir(); } }
    function goChat(f) { setOpen(null); setPeer(f.user_id); setTab('chat'); }
    var tabs = [['dir', 'Directorio'], ['org', 'Organigrama'], ['chat', 'Mensajes', c.unread]].concat(adm ? [['adm', 'Administración']] : []);
    var mine = c.dir.filter(function (f) { return f.user_id === me; })[0];
    return h('div', { className: 'pb' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap', marginBottom: 6 } },
        h('div', null, h('div', { style: { fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--pb-muted)' } }, 'Directorio corporativo'), h('h2', { className: 'disp', style: { margin: 0, fontSize: 26, fontWeight: 700 } }, 'Páginas Blancas')),
        h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
          mine ? h('button', { type: 'button', className: 'pb-b', onClick: function () { setForm(mine); } }, h(Ico, { n: 'edit', s: 14 }), 'Mi ficha') : null,
          h('button', { type: 'button', className: 'pb-b', onClick: function () { setModal('cfg'); } }, h(Ico, { n: 'bell', s: 14 }), 'Notificaciones'))),
      h('p', { className: 'pb-hint', style: { marginTop: 0 } }, 'Información de uso interno: no la compartas fuera de la organización.'),
      h('div', { className: 'pb-tabs', role: 'tablist' }, tabs.map(function (t) { return h('button', { key: t[0], type: 'button', role: 'tab', className: 'pb-tab', 'aria-selected': tab === t[0], onClick: function () { setTab(t[0]); } }, t[1], t[2] ? h('span', { className: 'pb-cnt' }, t[2]) : null); })),
      tab === 'dir' ? h(Directory, { onOpen: setOpen, setVisible: setVisible })
        : tab === 'org' ? h(OrgChart, { onOpen: setOpen })
          : tab === 'chat' ? h(Chat, { peer: peer, setPeer: setPeer, onOpen: setOpen })
            : h('div', { className: 'pb-panel', style: { padding: 16 } },
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                h('button', { type: 'button', className: 'pb-b prim', onClick: function () { setForm('nueva'); } }, h(Ico, { n: 'plus', s: 14 }), 'Nueva ficha'),
                h('button', { type: 'button', className: 'pb-b', onClick: function () { setModal('imp'); } }, h(Ico, { n: 'up', s: 14 }), 'Importar CSV'),
                h('button', { type: 'button', className: 'pb-b', onClick: function () { exportCSV(c.dir); } }, h(Ico, { n: 'dl', s: 14 }), 'Exportar todo (CSV)'),
                h('button', { type: 'button', className: 'pb-b', onClick: function () { exportCSV(visible); } }, 'Exportar resultados actuales'),
                h('button', { type: 'button', className: 'pb-b', onClick: function () { setModal('aud'); } }, h(Ico, { n: 'log', s: 14 }), 'Historial de cambios')),
              h('p', { className: 'pb-hint' }, 'Las fichas no se eliminan: se desactivan y dejan de aparecer para los demás. Cada trabajador edita su propia ficha; administración puede editar todas. El CSV se puede abrir en Excel.'),
              h('p', { className: 'pb-hint' }, c.dir.length + ' fichas · ' + c.dir.filter(function (f) { return f.demo; }).length + ' de ejemplo (sin cuenta; desactívalas cuando ya no las necesites).')),
      openFresh ? h(UI.FichaView, { f: openFresh, onClose: function () { setOpen(null); }, onChat: goChat, onEdit: function (f) { setOpen(null); setForm(f); }, onToggle: toggle, onOpen: setOpen, toast: setToast }) : null,
      form ? h(UI.FichaForm, { ficha: form === 'nueva' ? null : form, onClose: function () { setForm(null); }, onSaved: function (m) { setForm(null); setToast(m); c.loadDir(); } }) : null,
      modal === 'imp' ? h(ImportModal, { onClose: function () { setModal(''); }, onDone: function (m) { setModal(''); setToast(m); c.loadDir(); } }) : null,
      modal === 'aud' ? h(AuditModal, { onClose: function () { setModal(''); } }) : null,
      modal === 'cfg' ? h(Settings, { onClose: function () { setModal(''); } }) : null,
      h(UI.Toast, { msg: toast }));
  }
  window.PB.Tab = Tab;
})();
