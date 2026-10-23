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
    var s2 = useState({ ger: '', dep: '', sede: '', cargo: '', est: '' }), fl = s2[0], setFl = s2[1];
    var s3 = useState('az'), ord = s3[0], setOrd = s3[1], s4 = useState('grid'), mode = s4[0], setMode = s4[1];
    var s5 = useState(''), letter = s5[0], setLetter = s5[1], s6 = useState(U.PAGE), shown = s6[0], setShown = s6[1], s7 = useState(false), inact = s7[0], setInact = s7[1];
    var adm = U.isAdm();
    var base = useMemo(function () { return core.dir.filter(function (f) { return f.activo || (adm && inact); }); }, [core.dir, inact, adm]);
    var list = useMemo(function () {
      var nq = U.norm(dq);
      var r = base.filter(function (f) {
        if (fl.ger && f.gerencia !== fl.ger) return false; if (fl.dep && f.departamento !== fl.dep) return false; if (fl.sede && f.sede !== fl.sede) return false; if (fl.cargo && f.cargo !== fl.cargo) return false;
        if (fl.est && core.estado(f) !== fl.est) return false;
        if (letter && U.norm((f.apellidos || f.nombres).charAt(0)).toUpperCase() !== letter) return false;
        if (!nq) return true;
        return U.norm([full(f), f.cargo, f.gerencia, f.departamento, f.sede, f.correo, f.telefono, f.celular, f.extension, (f.habilidades || []).join(' ')].join(' ')).indexOf(nq) >= 0;
      });
      r.sort(function (a, b) { var c = ((a.apellidos || '') + ' ' + a.nombres).localeCompare((b.apellidos || '') + ' ' + b.nombres, 'es', { sensitivity: 'base' }); return ord === 'az' ? c : -c; });
      return r;
    }, [base, dq, fl, ord, letter, core.online]);
    useEffect(function () { setShown(U.PAGE); }, [dq, fl, ord, letter, inact]);
    useEffect(function () { p.setVisible && p.setVisible(list); }, [list]);
    var letters = useMemo(function () { var m = {}; base.forEach(function (f) { m[U.norm((f.apellidos || f.nombres).charAt(0)).toUpperCase()] = 1; }); return m; }, [base]);
    var AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    function sel(k, label, opts, fmt) {
      return h('select', { className: 'pb-in', style: { width: 'auto', maxWidth: 190 }, 'aria-label': label, value: fl[k], onChange: function (e) { var n = Object.assign({}, fl); n[k] = e.target.value; if (k === 'ger') n.dep = ''; setFl(n); } },
        h('option', { value: '' }, label + ': todos'), opts.map(function (o) { return h('option', { key: o, value: o }, fmt ? fmt(o) : o); }));
    }
    if (!core.loaded) return h('div', { className: 'pb-empty' }, 'Cargando directorio…');
    if (core.error) return h('div', { className: 'pb-empty', role: 'alert' }, 'No se pudo cargar el directorio: ' + core.error, h('div', null, h('button', { type: 'button', className: 'pb-b', style: { marginTop: 10 }, onClick: function () { core.loadDir(); } }, 'Reintentar')));
    var vis = list.slice(0, shown), hasFilter = q || letter || fl.ger || fl.dep || fl.sede || fl.cargo || fl.est;
    return h('div', null,
      h('div', { className: 'pb-bar' },
        h('div', { className: 'pb-grow', style: { position: 'relative' } }, h('input', { className: 'pb-in', type: 'search', value: q, placeholder: 'Buscar por nombre, cargo, gerencia, departamento, sede, correo, teléfono o habilidad…', 'aria-label': 'Buscar en el directorio', onChange: function (e) { setQ(e.target.value); } })),
        h('div', { role: 'group', 'aria-label': 'Vista', style: { display: 'inline-flex', gap: 4 } },
          h('button', { type: 'button', className: 'pb-b' + (mode === 'grid' ? ' prim' : ''), 'aria-pressed': mode === 'grid', onClick: function () { setMode('grid'); }, title: 'Tarjetas' }, h(Ico, { n: 'grid', s: 14 })),
          h('button', { type: 'button', className: 'pb-b' + (mode === 'list' ? ' prim' : ''), 'aria-pressed': mode === 'list', onClick: function () { setMode('list'); }, title: 'Lista' }, h(Ico, { n: 'list', s: 14 }))),
        h('button', { type: 'button', className: 'pb-b', onClick: function () { setOrd(ord === 'az' ? 'za' : 'az'); } }, ord === 'az' ? 'A → Z' : 'Z → A')),
      h('div', { className: 'pb-bar' }, sel('ger', 'Gerencia', core.gerencias().length ? core.gerencias() : uniq(base, 'gerencia')), sel('dep', 'Departamento', fl.ger ? core.deptos(fl.ger) : uniq(base, 'departamento')), sel('sede', 'Sede', uniq(base, 'sede')), sel('cargo', 'Cargo', uniq(base, 'cargo')),
        sel('est', 'Disponibilidad', ['disponible', 'ocupado', 'ausente', 'desconectado'], function (o) { return U.ESTADOS[o]; }),
        adm ? h('label', { className: 'pb-sw' }, h('input', { type: 'checkbox', checked: inact, onChange: function (e) { setInact(e.target.checked); } }), 'Mostrar desactivadas') : null,
        hasFilter ? h('button', { type: 'button', className: 'pb-b', onClick: function () { setQ(''); setLetter(''); setFl({ ger: '', dep: '', sede: '', cargo: '', est: '' }); } }, 'Limpiar filtros') : null),
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

  /* ---------- organigrama (árbol horizontal) ---------- */
  function OrgChart(p) {
    var act = core.dir.filter(function (f) { return f.activo; }), ids = {}; act.forEach(function (f) { ids[f.id] = 1; });
    var kids = {}; act.forEach(function (f) { var k = f.jefe_id && ids[f.jefe_id] ? f.jefe_id : '_root'; (kids[k] = kids[k] || []).push(f); });
    function card(f) {
      return h('button', { key: f.id, type: 'button', className: 'pb-ocard', onClick: function () { p.onOpen(f); }, 'aria-label': 'Abrir ficha de ' + full(f) },
        h(Avatar, { f: f, size: 40, estado: core.estado(f) }), h('span', { className: 'pb-nm pb-ell', style: { fontSize: 13 } }, full(f)), h('span', { className: 'pb-sub pb-ell', style: { fontSize: 11.5 } }, f.cargo || ''));
    }
    function node(f, d) { var ch = d < 8 ? (kids[f.id] || []) : []; return h('li', { key: f.id }, card(f), ch.length ? h('ul', null, ch.map(function (c) { return node(c, d + 1); })) : null); }
    var roots = kids._root || [], trees = roots.filter(function (r) { return (kids[r.id] || []).length; }), solos = roots.filter(function (r) { return !(kids[r.id] || []).length; });
    if (!act.length) return h('div', { className: 'pb-empty pb-panel' }, 'Aún no hay trabajadores registrados.');
    return h('div', { className: 'pb-panel', style: { padding: 14 } },
      trees.length ? h('div', { className: 'pb-treewrap' }, h('div', { className: 'pb-tree' }, h('ul', null, trees.map(function (r) { return node(r, 0); })))) : h('p', { className: 'pb-hint' }, 'Aún no hay jerarquía registrada. Asigna un jefe directo en las fichas para formar el organigrama.'),
      solos.length ? h('div', { style: { marginTop: trees.length ? 16 : 0 } }, h('div', { className: 'pb-lbl' }, 'Sin supervisor ni supervisados asignados (' + solos.length + ')'), h('div', { className: 'pb-solos' }, solos.map(card))) : null);
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
          var o = { nombres: g('nombres'), apellidos: g('apellidos'), cargo: g('cargo'), gerencia: g('gerencia'), departamento: g('departamento'), sede: g('sede'), correo: g('correo'), telefono: U.normPhone(g('telefono')), extension: g('extension'), celular: U.normPhone(g('celular')), whatsapp: U.normPhone(g('whatsapp')), fecha_ingreso: g('fecha_ingreso') || null, idiomas: U.listOf(g('idiomas')), habilidades: U.listOf(g('habilidades')), biografia: g('biografia').slice(0, 1000) };
          if (o.gerencia && core.gerencias().indexOf(o.gerencia) < 0) e.push('Gerencia no válida (usa exactamente un nombre de la lista)');
          else if (o.departamento && core.deptos(o.gerencia).indexOf(o.departamento) < 0) e.push('Departamento no válido para esa gerencia');
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
      h('p', { className: 'pb-hint' }, 'Archivo CSV (UTF-8, separado por comas o punto y coma). Columnas: ' + U.CSV_COLS.join(', ') + '. Gerencia y departamento deben coincidir exactamente con la lista oficial (' + core.gerencias().join(' | ') + '). Idiomas y habilidades se separan con punto y coma. Si usas Excel, guarda como "CSV UTF-8".'),
      h('button', { type: 'button', className: 'pb-b', onClick: function () { U.download('Plantilla_Paginas_Blancas_' + U.stamp() + '.csv', '﻿' + U.CSV_COLS.join(',') + '\r\nMaría,Pérez,Analista,Operations Director,Operations Team,Caracas,maria.perez@ejemplo.test,+582125550000,100,+584145550000,,2024-01-15,Español;Inglés,Excel;SQL,Texto breve\r\n', 'text/csv'); } }, h(Ico, { n: 'dl', s: 14 }), 'Descargar plantilla'),
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
    var s = useState(U.cfgGet()), c = s[0], setC = s[1], s2 = useState('...'), pst = s2[0], setPst = s2[1], s3 = useState(''), perr = s3[0], setPerr = s3[1], s4 = useState(false), busy = s4[0], setBusy = s4[1];
    function refresh() { core.pushStatus().then(setPst); }
    useEffect(refresh, []);
    function upd(k, v) { var n = Object.assign({}, c); n[k] = v; setC(n); U.cfgSet(n); if (pst === 'on') core.pushEnsure(); }
    var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var standalone = window.matchMedia && matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    function enable() { setBusy(true); setPerr(''); core.pushEnable().then(refresh, function (e) { setPerr(U.errMsg(e)); refresh(); }).then(function () { setBusy(false); }); }
    function disable() { setBusy(true); setPerr(''); core.pushDisable().then(refresh, function (e) { setPerr(U.errMsg(e)); }).then(function () { setBusy(false); }); }
    return h(Modal, { title: 'Notificaciones', onClose: p.onClose },
      h('p', { style: { marginTop: 0 } }, 'Recibes un aviso dentro de StrataFlow cada vez que llega un mensaje. Activa las notificaciones del dispositivo para recibirlas también con la aplicación cerrada o el teléfono bloqueado.'),
      pst === '...' ? h('p', { className: 'pb-hint' }, 'Comprobando…')
        : pst === 'unsupported' ? h('p', { className: 'pb-hint' }, 'Este navegador no admite notificaciones del dispositivo; seguirás viendo los avisos y la insignia dentro de la aplicación.' + (ios && !standalone ? ' En iPhone/iPad primero instala la aplicación (abajo).' : ''))
          : pst === 'denied' ? h('p', { className: 'pb-err' }, 'Las notificaciones están bloqueadas para este sitio. Habilítalas en la configuración del sitio del navegador y vuelve aquí.')
            : pst === 'on' ? h('div', null, h('p', { style: { color: 'var(--pb-good)', margin: '0 0 8px' } }, '✓ Notificaciones activas en este dispositivo, incluso con la aplicación cerrada.'), h('button', { type: 'button', className: 'pb-b', disabled: busy, onClick: disable }, 'Desactivar en este dispositivo'))
              : h('button', { type: 'button', className: 'pb-b prim', disabled: busy, onClick: enable }, h(Ico, { n: 'bell', s: 14 }), busy ? 'Activando…' : 'Activar notificaciones en este dispositivo'),
      perr ? h('div', { className: 'pb-err', role: 'alert' }, perr) : null,
      ios && !standalone ? h('p', { className: 'pb-hint' }, 'iPhone/iPad (iOS 16.4 o superior): abre StrataFlow en Safari, toca Compartir → «Añadir a pantalla de inicio» y abre la app desde ese ícono antes de activar las notificaciones.') : null,
      /Android/i.test(navigator.userAgent) ? h('p', { className: 'pb-hint' }, 'Android: si los avisos tardan o no llegan, instala la aplicación («Instalar aplicación» en el menú del navegador) y excluye el navegador del ahorro de batería en la configuración del teléfono.') : null,
      h('label', { className: 'pb-sw', style: { margin: '14px 0 10px' } }, h('input', { type: 'checkbox', checked: c.preview, onChange: function (e) { upd('preview', e.target.checked); } }), 'Mostrar vista previa del mensaje en los avisos'),
      h('label', { className: 'pb-sw', style: { margin: '10px 0' } }, h('input', { type: 'checkbox', checked: c.dnd, onChange: function (e) { upd('dnd', e.target.checked); } }), 'No molestar en este horario'),
      c.dnd ? h('div', { className: 'pb-g2' }, h(Field, { id: 'pbd1', label: 'Desde' }, h('input', { id: 'pbd1', type: 'time', className: 'pb-in', value: c.from, onChange: function (e) { upd('from', e.target.value); } })), h(Field, { id: 'pbd2', label: 'Hasta' }, h('input', { id: 'pbd2', type: 'time', className: 'pb-in', value: c.to, onChange: function (e) { upd('to', e.target.value); } }))) : null,
      Object.keys(c.muted).filter(function (k) { return c.muted[k]; }).length ? h('div', null, h('div', { className: 'pb-lbl', style: { marginTop: 10 } }, 'Chats silenciados'), Object.keys(c.muted).filter(function (k) { return c.muted[k]; }).map(function (k) { var f = core.byUser(k), g = core.groupById(k); return h('button', { key: k, type: 'button', className: 'pb-b', style: { margin: '0 6px 6px 0' }, onClick: function () { var m = Object.assign({}, c.muted); delete m[k]; upd('muted', m); } }, (f ? full(f) : g ? g.nombre : 'Chat') + ' ✕'); })) : null,
      h('p', { className: 'pb-hint' }, 'Estos ajustes se guardan en este dispositivo. Ningún navegador garantiza entrega instantánea: el sistema operativo puede retrasar avisos para ahorrar batería.'));
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
  function GAvatar(p) { var g = p.g, sz = p.size || 40; return h('span', { className: 'pb-av pb-gav', style: { width: sz, height: sz, fontSize: Math.round(sz * 0.4) }, 'aria-hidden': true }, (g.nombre || 'G').trim().slice(0, 2).toUpperCase()); }
  function typingText(map) {
    var now = Date.now(), ids = Object.keys(map).filter(function (k) { return map[k] > now; });
    if (!ids.length) return '';
    var nm = ids.map(function (k) { var f = core.byUser(k); return f ? (ids.length === 1 ? full(f) : f.nombres) : 'Alguien'; });
    if (nm.length === 1) return nm[0] + ' está escribiendo…';
    if (nm.length === 2) return nm[0] + ' y ' + nm[1] + ' están escribiendo…';
    if (nm.length === 3) return nm[0] + ', ' + nm[1] + ' y ' + nm[2] + ' están escribiendo…';
    return 'Varias personas están escribiendo…';
  }
  function useTypingMap(map) {   /* reevalúa cada segundo mientras alguien escribe para que el aviso expire solo */
    var s = useState(0), set = s[1];
    useEffect(function () { var any = Object.keys(map).some(function (k) { return map[k] > Date.now(); }); if (!any) return; var t = setTimeout(function () { set(function (x) { return x + 1; }); }, 1000); return function () { clearTimeout(t); }; });
  }

  /* ---------- miembros de un grupo ---------- */
  function Members(p) {
    var g = p.g, me = U.meId(), s1 = useState(''), err = s1[0], setErr = s1[1], s2 = useState(''), add = s2[0], setAdd = s2[1], s3 = useState(g.nombre), name = s3[0], setName = s3[1];
    var mem = (core.members[g.id] || []), canAdm = g.creado_por === me || U.isAdm();
    var cand = core.dir.filter(function (f) { return f.user_id && f.activo && mem.indexOf(f.user_id) < 0; });
    async function doAdd() { if (!add) return; setErr(''); var r = await sb().from('pb_grupo_miembros').insert({ grupo_id: g.id, user_id: add }); if (r.error) setErr(U.errMsg(r.error)); else { setAdd(''); core.loadGroups(); } }
    async function doDel(uid) { setErr(''); var r = await sb().from('pb_grupo_miembros').delete().eq('grupo_id', g.id).eq('user_id', uid); if (r.error) setErr(U.errMsg(r.error)); else { if (uid === me) p.onLeft(); core.loadGroups(); } }
    async function rename() { var n = name.trim(); if (!n || n === g.nombre) return; var r = await sb().from('pb_grupos').update({ nombre: n.slice(0, 60) }).eq('id', g.id); if (r.error) setErr(U.errMsg(r.error)); else core.loadGroups(); }
    return h(Modal, { title: 'Grupo: ' + g.nombre, onClose: p.onClose },
      canAdm ? h('div', { style: { display: 'flex', gap: 8, marginBottom: 12 } }, h('input', { className: 'pb-in', value: name, maxLength: 60, 'aria-label': 'Nombre del grupo', onChange: function (e) { setName(e.target.value); } }), h('button', { type: 'button', className: 'pb-b', onClick: rename }, 'Renombrar')) : null,
      h('div', { className: 'pb-lbl' }, mem.length + ' miembros'),
      h('div', { style: { maxHeight: 260, overflow: 'auto', marginBottom: 10 } }, mem.map(function (uid) {
        var f = core.byUser(uid);
        return h('div', { key: uid, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--pb-line)' } },
          f ? h(Avatar, { f: f, size: 32, estado: core.estado(f) }) : null, h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { className: 'pb-nm pb-ell' }, f ? full(f) : 'Usuario', uid === g.creado_por ? h('span', { className: 'pb-chip', style: { marginLeft: 6 } }, 'Creador') : null, uid === me ? h('span', { className: 'pb-chip', style: { marginLeft: 6 } }, 'Tú') : null)),
          (canAdm && uid !== g.creado_por && uid !== me) ? h('button', { type: 'button', className: 'pb-b', style: { padding: '2px 8px' }, onClick: function () { doDel(uid); }, 'aria-label': 'Quitar del grupo' }, 'Quitar') : null);
      })),
      canAdm ? h('div', { style: { display: 'flex', gap: 8 } }, h('select', { className: 'pb-in', 'aria-label': 'Agregar miembro', value: add, onChange: function (e) { setAdd(e.target.value); } }, h('option', { value: '' }, '+ Agregar miembro…'), cand.map(function (f) { return h('option', { key: f.user_id, value: f.user_id }, full(f)); })), h('button', { type: 'button', className: 'pb-b prim', disabled: !add, onClick: doAdd }, 'Agregar')) : null,
      err ? h('div', { className: 'pb-err', role: 'alert' }, err) : null,
      h('div', { style: { marginTop: 14 } }, h('button', { type: 'button', className: 'pb-b crit', onClick: function () { doDel(me); } }, 'Salir del grupo')));
  }
  function NewGroup(p) {
    var me = U.meId(), s1 = useState(''), name = s1[0], setName = s1[1], s2 = useState({}), sel = s2[0], setSel = s2[1], s3 = useState(''), q = s3[0], setQ = s3[1], s4 = useState(''), err = s4[0], setErr = s4[1], s5 = useState(false), busy = s5[0], setBusy = s5[1];
    var cand = core.dir.filter(function (f) { return f.user_id && f.user_id !== me && f.activo && (!q || U.norm(full(f) + ' ' + f.cargo + ' ' + f.departamento).indexOf(U.norm(q)) >= 0); });
    var chosen = Object.keys(sel).filter(function (k) { return sel[k]; });
    async function create() {
      var n = name.trim(); if (!n) return setErr('Escribe un nombre para el grupo.'); if (!chosen.length) return setErr('Elige al menos un miembro.');
      setBusy(true); setErr('');
      var r = await sb().from('pb_grupos').insert({ nombre: n.slice(0, 60), creado_por: me }).select().single();
      if (r.error) { setBusy(false); return setErr(U.errMsg(r.error)); }
      var m = await sb().from('pb_grupo_miembros').insert(chosen.map(function (u) { return { grupo_id: r.data.id, user_id: u }; }));
      await core.loadGroups(); setBusy(false);
      if (m.error) setErr('El grupo se creó, pero no se pudieron agregar todos: ' + U.errMsg(m.error)); p.onCreated(r.data.id);
    }
    return h(Modal, { title: 'Nuevo grupo', onClose: p.onClose },
      h(Field, { id: 'pbg-n', label: 'Nombre del grupo', req: true }, h('input', { id: 'pbg-n', className: 'pb-in', maxLength: 60, value: name, onChange: function (e) { setName(e.target.value); }, placeholder: 'Ej.: Equipo de producción' })),
      h('div', { style: { marginTop: 10 } }, h(Field, { id: 'pbg-q', label: 'Miembros (' + chosen.length + ' elegidos)' }, h('input', { id: 'pbg-q', type: 'search', className: 'pb-in', placeholder: 'Buscar por nombre, cargo o departamento…', value: q, onChange: function (e) { setQ(e.target.value); } }))),
      h('div', { style: { maxHeight: 260, overflow: 'auto', margin: '8px 0', border: '1px solid var(--pb-line)', borderRadius: 8 } },
        !cand.length ? h('div', { className: 'pb-empty', style: { padding: 16 } }, 'Sin trabajadores con cuenta que coincidan.') : cand.map(function (f) {
          return h('label', { key: f.user_id, className: 'pb-sw', style: { padding: '7px 10px', borderBottom: '1px solid var(--pb-line)' } }, h('input', { type: 'checkbox', checked: !!sel[f.user_id], onChange: function (e) { var n = Object.assign({}, sel); n[f.user_id] = e.target.checked; setSel(n); } }), h(Avatar, { f: f, size: 28 }), h('span', null, full(f), h('span', { className: 'pb-sub' }, f.cargo ? ' · ' + f.cargo : '')));
        })),
      err ? h('div', { className: 'pb-err', role: 'alert' }, err) : null,
      h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 } }, h('button', { type: 'button', className: 'pb-b', onClick: p.onClose }, 'Cancelar'), h('button', { type: 'button', className: 'pb-b prim', disabled: busy, onClick: create }, busy ? 'Creando…' : 'Crear grupo')));
  }

  /* ---------- conversación (directa o de grupo) ---------- */
  function Thread(p) {
    var isG = p.sel.t === 'g', id = p.sel.id, me = U.meId(), f = isG ? null : core.byUser(id), g = isG ? core.groupById(id) : null;
    var s1 = useState(''), txt = s1[0], setTxt = s1[1], s2 = useState(false), busy = s2[0], setBusy = s2[1], s3 = useState(''), err = s3[0], setErr = s3[1], s4 = useState({}), typing = s4[0], setTyping = s4[1], s5 = useState(null), file = s5[0], setFile = s5[1], s6 = useState(false), showMem = s6[0], setShowMem = s6[1];
    var end = useRef(null), chRef = useRef(null), lastT = useRef(0), fileIn = useRef(null);
    useTypingMap(typing);
    var msgs = core.msgs.filter(function (m) { return isG ? m.grupo_id === id : (!m.grupo_id && ((m.de === me && m.para === id) || (m.de === id && m.para === me))); });
    useEffect(function () { if (isG) core.markReadGroup(id); else core.markRead(id); }, [id, msgs.length, document.hidden]);
    var tt = typingText(typing);
    useEffect(function () { if (end.current) end.current.scrollTop = end.current.scrollHeight; }, [msgs.length, tt, id]);
    useEffect(function () {
      var name = isG ? 'pb-tg-' + id : 'pb-t-' + [me, id].sort().join('-');
      var ch = sb().channel(name).on('broadcast', { event: 'typing' }, function (e) {
        var from = e.payload && e.payload.from; if (!from || from === me) return;
        setTyping(function (o) { var n = Object.assign({}, o); n[from] = Date.now() + 3500; return n; });
      }).subscribe();
      chRef.current = ch; setTyping({});
      return function () { try { sb().removeChannel(ch); } catch (e) { } };
    }, [id, isG]);
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
        var row = isG ? { de: me, grupo_id: id, cuerpo: body.slice(0, 4000), adjunto: adj } : { de: me, para: id, cuerpo: body.slice(0, 4000), adjunto: adj };
        var r = await sb().from('pb_mensajes').insert(row).select().single();
        if (r.error) throw r.error;
        core.merge(r.data); setTxt(''); setFile(null);
      } catch (e) { setErr('No se pudo enviar: ' + U.errMsg(e)); }
      setBusy(false);
    }
    var cfg = U.cfgGet(), muted = !!cfg.muted[id], lastDay = '', title = isG ? (g ? g.nombre : 'Grupo') : (f ? full(f) : 'Usuario');
    if (isG && !g) return h('div', { className: 'pb-empty pb-th' }, 'Ya no perteneces a este grupo.', h('div', null, h('button', { type: 'button', className: 'pb-b', style: { marginTop: 10 }, onClick: p.onBack }, 'Volver')));
    return h('div', { className: 'pb-th' },
      h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--pb-line)' } },
        h('button', { type: 'button', className: 'pb-b pb-back', onClick: p.onBack, 'aria-label': 'Volver a conversaciones' }, h(Ico, { n: 'back', s: 14 })),
        isG ? h(GAvatar, { g: g, size: 36 }) : (f ? h(Avatar, { f: f, size: 36, estado: core.estado(f) }) : null),
        h('div', { style: { minWidth: 0, flex: 1 } }, h('div', { className: 'pb-nm pb-ell' }, title), h('div', { className: 'pb-sub pb-ell', 'aria-live': 'polite' }, tt || (isG ? (core.members[id] || []).length + ' miembros' : (f ? U.ESTADOS[core.estado(f)] : '')))),
        isG ? h('button', { type: 'button', className: 'pb-b', onClick: function () { setShowMem(true); } }, 'Miembros') : (f ? h('button', { type: 'button', className: 'pb-b', onClick: function () { p.onOpen(f); } }, 'Ver ficha') : null),
        h('button', { type: 'button', className: 'pb-b', onClick: function () { var c = U.cfgGet(); c.muted[id] = !c.muted[id]; U.cfgSet(c); core.pushEnsure(); p.refresh(); }, title: 'Silenciar avisos de este chat' }, muted ? 'Silenciado' : 'Silenciar')),
      h('div', { className: 'pb-msgs', ref: end, role: 'log', 'aria-live': 'polite', 'aria-label': 'Mensajes' },
        !msgs.length ? h('div', { className: 'pb-empty' }, 'Aún no hay mensajes. Escribe el primero.') : null,
        msgs.map(function (m) {
          var d = new Date(m.creado).toDateString(), sep = d !== lastDay ? h('div', { key: 'd' + m.id, className: 'pb-day' }, new Date(m.creado).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })) : null; lastDay = d;
          var from = isG && m.de !== me ? core.byUser(m.de) : null;
          return [sep, h('div', { key: m.id, className: 'pb-m ' + (m.de === me ? 'me' : 'ot') }, from ? h('div', { className: 'pb-sn' }, full(from)) : null, m.adjunto ? h(Attach, { a: m.adjunto }) : null, m.cuerpo ? h('div', null, m.cuerpo) : null, h('div', { className: 'pb-meta' }, U.fmtTime(m.creado), h(Ticks, { m: m })))];
        }),
        tt ? h('div', { className: 'pb-typing', key: 'typing' }, tt) : null),
      err ? h('div', { className: 'pb-err', role: 'alert', style: { padding: '0 12px' } }, err) : null,
      file ? h('div', { className: 'pb-att', style: { margin: '0 10px' } }, h(Ico, { n: 'clip', s: 14 }), h('span', { className: 'pb-ell', style: { flex: 1 } }, file.name), h('span', null, U.fmtSize(file.size)), h('button', { type: 'button', className: 'pb-b', style: { padding: '2px 8px' }, onClick: function () { setFile(null); }, 'aria-label': 'Quitar adjunto' }, h(Ico, { n: 'x', s: 12 }))) : null,
      h('div', { className: 'pb-comp' },
        h('input', { ref: fileIn, type: 'file', hidden: true, onChange: pickFile, accept: '.pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx' }),
        h('button', { type: 'button', className: 'pb-b', onClick: function () { fileIn.current && fileIn.current.click(); }, 'aria-label': 'Adjuntar archivo (hasta 25 MB)', title: 'Adjuntar (hasta 25 MB)' }, h(Ico, { n: 'clip', s: 15 })),
        h('textarea', { className: 'pb-in', rows: 1, value: txt, maxLength: 4000, placeholder: 'Escribe un mensaje…', 'aria-label': 'Mensaje', onChange: function (e) { onType(e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } } }),
        h('button', { type: 'button', className: 'pb-b prim', disabled: busy || (!txt.trim() && !file), onClick: send }, h(Ico, { n: 'send', s: 14 }), busy ? 'Enviando…' : 'Enviar')),
      showMem && g ? h(Members, { g: g, onClose: function () { setShowMem(false); }, onLeft: function () { setShowMem(false); p.onBack(); } }) : null);
  }
  function Chat(p) {
    var me = U.meId(), s = useState(''), q = s[0], setQ = s[1], s2 = useState(0), tick = s2[0], setTick = s2[1], s3 = useState(false), ng = s3[0], setNg = s3[1];
    var sel = p.sel, convs = (function () {
      var m = {}; core.msgs.forEach(function (x) {
        if (x.grupo_id) return;
        var o = x.de === me ? x.para : x.de; var c = m[o] || (m[o] = { t: 'u', id: o, last: x, unread: 0 }); c.last = x; if (x.para === me && !x.leido_en) c.unread++;
      });
      var arr = Object.keys(m).map(function (k) { return m[k]; });
      core.groups.forEach(function (g) {
        var last = null; core.msgs.forEach(function (x) { if (x.grupo_id === g.id) last = x; });
        arr.push({ t: 'g', id: g.id, g: g, last: last, unread: core.groupUnread(g.id) });
      });
      arr.sort(function (a, b) { var ta = a.last ? a.last.creado : (a.g ? a.g.creado : ''), tb = b.last ? b.last.creado : (b.g ? b.g.creado : ''); return ta < tb ? 1 : -1; });
      if (sel && sel.t === 'u' && !m[sel.id]) arr.unshift({ t: 'u', id: sel.id, last: null, unread: 0 });
      return arr;
    })();
    var nq = U.norm(q), list = convs.filter(function (c) { var name = c.t === 'g' ? (c.g ? c.g.nombre : '') : (core.byUser(c.id) ? full(core.byUser(c.id)) : ''); return !nq || U.norm(name).indexOf(nq) >= 0; });
    var newOpts = core.dir.filter(function (f) { return f.user_id && f.user_id !== me && f.activo; });
    return h('div', { className: 'pb-panel pb-chat' + (sel ? ' th' : '') },
      h('div', { className: 'pb-inbox' },
        h('div', { style: { padding: 10, display: 'flex', flexDirection: 'column', gap: 6 } },
          h('input', { className: 'pb-in', type: 'search', placeholder: 'Buscar conversación…', 'aria-label': 'Buscar conversación', value: q, onChange: function (e) { setQ(e.target.value); } }),
          h('div', { style: { display: 'flex', gap: 6 } },
            h('select', { className: 'pb-in', 'aria-label': 'Nueva conversación', value: '', onChange: function (e) { if (e.target.value) p.setSel({ t: 'u', id: e.target.value }); } }, h('option', { value: '' }, '+ Nueva conversación…'), newOpts.map(function (f) { return h('option', { key: f.user_id, value: f.user_id }, full(f)); })),
            h('button', { type: 'button', className: 'pb-b', onClick: function () { setNg(true); }, title: 'Crear un grupo' }, h(Ico, { n: 'plus', s: 14 }), 'Grupo'))),
        !list.length ? h('div', { className: 'pb-empty' }, convs.length ? 'Sin coincidencias.' : 'No tienes conversaciones. Abre una ficha y pulsa «Chatear», o crea un grupo.') : null,
        list.map(function (c) {
          var f = c.t === 'u' ? core.byUser(c.id) : null; if (c.t === 'u' && !f) return null;
          var name = c.t === 'g' ? c.g.nombre : full(f), lastTxt = c.last ? (c.last.de === me ? 'Tú: ' : (c.t === 'g' && core.byUser(c.last.de) ? core.byUser(c.last.de).nombres + ': ' : '')) + (c.last.cuerpo || '📎 ' + (c.last.adjunto && c.last.adjunto.name)) : (c.t === 'g' ? 'Grupo nuevo' : 'Conversación nueva');
          return h('button', { key: c.t + c.id, type: 'button', className: 'pb-conv', 'aria-current': !!(sel && sel.t === c.t && sel.id === c.id), onClick: function () { p.setSel({ t: c.t, id: c.id }); } },
            c.t === 'g' ? h(GAvatar, { g: c.g, size: 40 }) : h(Avatar, { f: f, size: 40, estado: core.estado(f) }),
            h('div', { style: { minWidth: 0, flex: 1 } }, h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 6 } }, h('span', { className: 'pb-nm pb-ell' }, name), c.last ? h('span', { className: 'pb-sub', style: { fontSize: 11, flex: 'none' } }, U.fmtTime(c.last.creado)) : null),
              h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 6 } }, h('span', { className: 'pb-sub pb-ell' }, lastTxt), c.unread ? h('span', { className: 'pb-cnt', 'aria-label': c.unread + ' sin leer' }, c.unread) : null)));
        })),
      sel ? h(Thread, { key: sel.t + sel.id, sel: sel, onBack: function () { p.setSel(null); }, onOpen: p.onOpen, refresh: function () { setTick(tick + 1); } }) : h('div', { className: 'pb-empty pb-th', style: { justifyContent: 'center' } }, h(Ico, { n: 'chat', s: 36 }), h('div', { style: { marginTop: 8 } }, 'Selecciona una conversación')),
      ng ? h(NewGroup, { onClose: function () { setNg(false); }, onCreated: function (gid) { setNg(false); p.setSel({ t: 'g', id: gid }); } }) : null);
  }

  /* ---------- pestaña ---------- */

  /* ---------- anuncios (comunicados informativos, no son chat) ---------- */
  function when(x) { try { return new Date(x).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return ''; } }
  function annWho(a) { var f = core.byUser(a.de); return f ? full(f) : 'Administración'; }
  function sameSet(a, b) { if (a.length !== b.length) return false; var m = {}; a.forEach(function (x) { m[x] = 1; }); return b.every(function (x) { return m[x]; }); }

  function NewAnn(p) {
    var me = U.meId(), s1 = useState(''), titulo = s1[0], setTitulo = s1[1], s2 = useState(''), cuerpo = s2[0], setCuerpo = s2[1];
    var s3 = useState({}), sel = s3[0], setSel = s3[1], s4 = useState(''), aud = s4[0], setAud = s4[1], s5 = useState(''), q = s5[0], setQ = s5[1];
    var s6 = useState(false), busy = s6[0], setBusy = s6[1], s7 = useState(''), err = s7[0], setErr = s7[1];
    var reach = (function () { var set = {}; core.alcance.forEach(function (u) { set[u] = 1; }); return core.dir.filter(function (f) { return f.activo && f.user_id && set[f.user_id]; }); })();
    var mine = core.dir.filter(function (f) { return f.user_id === me; })[0];
    /* audiencias predeterminadas: todo lo que esta persona puede alcanzar, por supervisados, gerencia y departamento */
    var audiences = (function () {
      var out = [], byId = {}; core.dir.forEach(function (f) { byId[f.id] = f; });
      var ids = function (arr) { return arr.map(function (f) { return f.user_id; }); };
      if (reach.length) out.push({ k: 'all', g: 'General', label: 'Todos los que puedo alcanzar (' + reach.length + ')', name: 'Todos los que alcanzo', ids: ids(reach) });
      if (mine) {
        var seen = {}, stack = [mine.id], sub = [];
        while (stack.length) { var cur = stack.pop(); core.dir.forEach(function (f) { if (f.jefe_id === cur && !seen[f.id]) { seen[f.id] = 1; stack.push(f.id); if (reach.indexOf(f) >= 0) sub.push(f); } }); }
        if (sub.length) out.push({ k: 'sup', g: 'General', label: 'Mis supervisados (' + sub.length + ')', name: 'Mis supervisados', ids: ids(sub) });
      }
      var gers = {}, deps = {};
      reach.forEach(function (f) { if (f.gerencia) { (gers[f.gerencia] = gers[f.gerencia] || []).push(f); if (f.departamento) (deps[f.gerencia + '||' + f.departamento] = deps[f.gerencia + '||' + f.departamento] || []).push(f); } });
      Object.keys(gers).sort().forEach(function (g) { out.push({ k: 'g:' + g, g: 'Gerencias', label: g + ' (' + gers[g].length + ')', name: 'Gerencia · ' + g, ids: ids(gers[g]) }); });
      Object.keys(deps).sort().forEach(function (k) { var pr = k.split('||'); out.push({ k: 'd:' + k, g: 'Departamentos', label: pr[1] + ' — ' + pr[0] + ' (' + deps[k].length + ')', name: 'Departamento · ' + pr[1], ids: ids(deps[k]) }); });
      return out;
    })();
    var chosen = Object.keys(sel).filter(function (k) { return sel[k]; });
    function pickAud(k) {
      var a = audiences.filter(function (x) { return x.k === k; })[0]; setAud(k);
      var m = {}; if (a) a.ids.forEach(function (u) { m[u] = true; }); setSel(m);
    }
    function toggle(u, on) { var m = Object.assign({}, sel); m[u] = on; setSel(m); }
    var nq = U.norm(q), shown = reach.filter(function (f) { return !nq || U.norm(full(f) + ' ' + f.cargo + ' ' + f.departamento + ' ' + f.gerencia).indexOf(nq) >= 0; });
    function allShown(on) { var m = Object.assign({}, sel); shown.forEach(function (f) { m[f.user_id] = on; }); setSel(m); }
    async function send() {
      if (busy) return; setErr('');
      if (!titulo.trim()) return setErr('Escribe el título del anuncio.');
      if (!cuerpo.trim()) return setErr('Escribe el mensaje del anuncio.');
      if (!chosen.length) return setErr('Elige al menos un destinatario.');
      var cur = audiences.filter(function (x) { return x.k === aud; })[0];
      var label = cur && sameSet(cur.ids, chosen) ? cur.name : 'Selección (' + chosen.length + (chosen.length === 1 ? ' persona)' : ' personas)');
      setBusy(true);
      var r = await sb().rpc('pb_anuncio_enviar', { p_titulo: titulo.trim(), p_cuerpo: cuerpo.trim(), p_destinos: chosen, p_audiencia: label });
      setBusy(false);
      if (r.error) return setErr(U.errMsg(r.error));
      await core.loadAnn(); p.onSent('Anuncio enviado a ' + chosen.length + (chosen.length === 1 ? ' persona.' : ' personas.'));
    }
    var groups = {}; audiences.forEach(function (a) { (groups[a.g] = groups[a.g] || []).push(a); });
    return h(Modal, { title: 'Nuevo anuncio', onClose: p.onClose, wide: true },
      h('p', { className: 'pb-hint', style: { marginTop: 0 } }, 'Los anuncios son informativos: los destinatarios los reciben en su pestaña «Anuncios» (y como notificación), pero no pueden responder en cadena.'),
      err ? h('div', { className: 'pb-err', role: 'alert', style: { marginBottom: 8 } }, err) : null,
      h(Field, { id: 'pba-aud', label: 'Audiencia predeterminada' },
        h('select', { id: 'pba-aud', className: 'pb-in', value: aud, onChange: function (e) { pickAud(e.target.value); } }, h('option', { value: '' }, '— Elegir una audiencia —'),
          Object.keys(groups).map(function (g) { return h('optgroup', { key: g, label: g }, groups[g].map(function (a) { return h('option', { key: a.k, value: a.k }, a.label); })); }))),
      h('div', { style: { marginTop: 10 } }, h(Field, { id: 'pba-q', label: 'Destinatarios (' + chosen.length + ' elegidos de ' + reach.length + ')', hint: 'Puedes ajustar la selección persona por persona.' },
        h('input', { id: 'pba-q', type: 'search', className: 'pb-in', placeholder: 'Buscar por nombre, cargo o departamento…', value: q, onChange: function (e) { setQ(e.target.value); } }))),
      h('div', { style: { display: 'flex', gap: 6, margin: '6px 0' } },
        h('button', { type: 'button', className: 'pb-b', onClick: function () { allShown(true); } }, 'Marcar los que se ven'),
        h('button', { type: 'button', className: 'pb-b', onClick: function () { allShown(false); } }, 'Quitar los que se ven')),
      h('div', { className: 'pb-pick' }, shown.length ? shown.map(function (f) {
        return h('label', { key: f.user_id }, h('input', { type: 'checkbox', checked: !!sel[f.user_id], onChange: function (e) { toggle(f.user_id, e.target.checked); } }),
          h(Avatar, { f: f, size: 26 }), h('span', { style: { minWidth: 0 } }, h('span', { className: 'pb-ell', style: { display: 'block' } }, full(f)), h('span', { className: 'pb-sub pb-ell', style: { display: 'block', fontSize: 11 } }, [f.cargo, f.departamento].filter(Boolean).join(' · '))));
      }) : h('div', { className: 'pb-empty', style: { padding: 14 } }, reach.length ? 'Sin coincidencias.' : 'No tienes personas a tu alcance.')),
      h('div', { style: { marginTop: 10 } }, h(Field, { id: 'pba-t', label: 'Título', req: true }, h('input', { id: 'pba-t', className: 'pb-in', maxLength: 120, value: titulo, onChange: function (e) { setTitulo(e.target.value); } }))),
      h('div', { style: { marginTop: 10 } }, h(Field, { id: 'pba-c', label: 'Mensaje', req: true, hint: cuerpo.length + ' / 4000' }, h('textarea', { id: 'pba-c', className: 'pb-in', rows: 5, maxLength: 4000, value: cuerpo, onChange: function (e) { setCuerpo(e.target.value); } }))),
      h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 } },
        h('button', { type: 'button', className: 'pb-b', onClick: p.onClose }, 'Cancelar'),
        h('button', { type: 'button', className: 'pb-b prim', disabled: busy || !chosen.length, onClick: send }, busy ? 'Enviando…' : 'Enviar a ' + chosen.length + (chosen.length === 1 ? ' persona' : ' personas'))));
  }

  function AnnDetail(p) {
    var a = p.a, me = U.meId(), mineSent = a.de === me, s1 = useState(false), ask = s1[0], setAsk = s1[1], s2 = useState(''), err = s2[0], setErr = s2[1];
    useEffect(function () { if (!mineSent) core.markAnnRead(a.id); }, [a.id]);
    var rows = mineSent ? core.dest.filter(function (d) { return d.anuncio_id === a.id; }) : [], st = mineSent ? core.annStats(a.id) : null;
    async function del() { var r = await sb().from('pb_anuncios').delete().eq('id', a.id); if (r.error) { setErr(U.errMsg(r.error)); return; } await core.loadAnn(); p.onDeleted('Anuncio eliminado.'); }
    return h(Modal, { title: a.titulo, onClose: p.onClose },
      h('div', { className: 'pb-sub' }, 'De ' + annWho(a) + ' · ' + when(a.creado) + (a.audiencia ? ' · ' + a.audiencia : '')),
      h('p', { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', marginTop: 12, fontSize: 14 } }, a.cuerpo),
      mineSent ? h('div', { style: { marginTop: 14 } },
        h('div', { className: 'pb-lbl' }, 'Leído por ' + st.leidos + ' de ' + st.total),
        h('div', null, rows.map(function (d) { var f = core.byUser(d.user_id); return h('span', { key: d.user_id, className: 'pb-chip', style: d.leido_en ? { color: 'var(--pb-fg)' } : null }, (d.leido_en ? '✓ ' : '· ') + (f ? full(f) : 'Usuario')); })),
        err ? h('div', { className: 'pb-err', role: 'alert', style: { marginTop: 8 } }, err) : null,
        h('div', { style: { marginTop: 12, display: 'flex', gap: 8 } },
          !ask ? h('button', { type: 'button', className: 'pb-b', onClick: function () { setAsk(true); } }, 'Eliminar anuncio')
            : [h('button', { key: 'c', type: 'button', className: 'pb-b prim', onClick: del }, 'Sí, eliminar para todos'), h('button', { key: 'n', type: 'button', className: 'pb-b', onClick: function () { setAsk(false); } }, 'No')]))
        : null);
  }

  function Anuncios(p) {
    var me = U.meId(), s1 = useState('in'), v = s1[0], setV = s1[1], s2 = useState(null), open = s2[0], setOpen = s2[1], s3 = useState(false), comp = s3[0], setComp = s3[1];
    var canSend = core.alcance.length > 0, inbox = core.ann.filter(function (a) { return a.de !== me; }), sent = core.ann.filter(function (a) { return a.de === me; });
    var list = v === 'in' ? inbox : sent, nuevos = inbox.filter(function (a) { var d = core.annMine(a.id); return d && !d.leido_en; }).length;
    var openFresh = open ? (core.ann.filter(function (a) { return a.id === open.id; })[0] || null) : null;
    return h('div', null,
      h('div', { className: 'pb-bar' },
        h('div', { role: 'group', 'aria-label': 'Anuncios', style: { display: 'inline-flex', gap: 4 } },
          h('button', { type: 'button', className: 'pb-b' + (v === 'in' ? ' prim' : ''), 'aria-pressed': v === 'in', onClick: function () { setV('in'); } }, 'Recibidos' + (nuevos ? ' (' + nuevos + ' sin leer)' : '')),
          canSend || sent.length ? h('button', { type: 'button', className: 'pb-b' + (v === 'out' ? ' prim' : ''), 'aria-pressed': v === 'out', onClick: function () { setV('out'); } }, 'Enviados (' + sent.length + ')') : null),
        h('div', { className: 'pb-grow' }),
        canSend ? h('button', { type: 'button', className: 'pb-b prim', onClick: function () { setComp(true); } }, h(Ico, { n: 'plus', s: 14 }), 'Nuevo anuncio') : null),
      !canSend ? h('p', { className: 'pb-hint', style: { marginTop: 0 } }, 'Aquí recibirás los comunicados de tus jefes, de tu gerencia o de tu departamento. Pueden enviar anuncios quienes tienen personas a su cargo y los líderes de gerencia o de departamento.') : null,
      !list.length ? h('div', { className: 'pb-panel pb-empty' }, v === 'in' ? 'No tienes anuncios por ahora.' : 'Aún no has enviado anuncios.') : list.map(function (a) {
        var d = core.annMine(a.id), isNew = v === 'in' && d && !d.leido_en, st = v === 'out' ? core.annStats(a.id) : null;
        return h('button', { key: a.id, type: 'button', className: 'pb-ann' + (isNew ? ' new' : ''), onClick: function () { setOpen(a); } },
          h('h3', null, a.titulo, isNew ? h('span', { className: 'pb-chip', style: { marginLeft: 8, color: '#e5484d', borderColor: '#e5484d' } }, 'Nuevo') : null),
          h('div', { className: 'pb-sub' }, (v === 'in' ? 'De ' + annWho(a) + ' · ' : '') + when(a.creado) + (a.audiencia ? ' · ' + a.audiencia : '') + (st ? ' · Leído por ' + st.leidos + ' de ' + st.total : '')),
          h('p', { className: 'pb-clamp' }, a.cuerpo));
      }),
      openFresh ? h(AnnDetail, { a: openFresh, onClose: function () { setOpen(null); }, onDeleted: function (m) { setOpen(null); p.toast(m); } }) : null,
      comp ? h(NewAnn, { onClose: function () { setComp(false); }, onSent: function (m) { setComp(false); setV('out'); p.toast(m); } }) : null);
  }

  function Tab(p) {
    var c = window.PB.core; var cc = U.useCore();
    var qs = new URLSearchParams(location.search), q0 = qs.get('grupo') ? { t: 'g', id: qs.get('grupo') } : qs.get('chat') ? { t: 'u', id: qs.get('chat') } : null, qa = qs.get('anuncios') === '1';
    var s1 = useState(qa ? 'ann' : q0 ? 'chat' : 'dir'), tab = s1[0], setTab = s1[1], s2 = useState(null), open = s2[0], setOpen = s2[1], s3 = useState(null), form = s3[0], setForm = s3[1], s4 = useState(q0), sel = s4[0], setSel = s4[1];
    var s5 = useState(''), toast = s5[0], setToast = s5[1], s6 = useState(''), modal = s6[0], setModal = s6[1], s7 = useState([]), visible = s7[0], setVisible = s7[1];
    var adm = U.isAdm(), me = U.meId();
    useEffect(function () { var f = function (e) { var d = e.data; if (d && d.type === 'pb-open') { if (d.anuncio) { setTab('ann'); } else if (d.grupo) { setSel({ t: 'g', id: d.grupo }); setTab('chat'); } else if (d.peer) { setSel({ t: 'u', id: d.peer }); setTab('chat'); } } }; if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', f); return function () { if (navigator.serviceWorker) navigator.serviceWorker.removeEventListener('message', f); }; }, []);
    useEffect(function () { if (!toast) return; var t = setTimeout(function () { setToast(''); }, 4000); return function () { clearTimeout(t); }; }, [toast]);
    var openFresh = open ? (c.dir.filter(function (x) { return x.id === open.id; })[0] || open) : null;
    async function toggle(f) { var r = await sb().from('pb_fichas').update({ activo: !f.activo }).eq('id', f.id); if (r.error) setToast(U.errMsg(r.error)); else { setToast(f.activo ? 'Ficha desactivada.' : 'Ficha reactivada.'); setOpen(null); c.loadDir(); } }
    function goChat(f) { setOpen(null); setSel({ t: 'u', id: f.user_id }); setTab('chat'); }
    var tabs = [['dir', 'Directorio'], ['org', 'Organigrama'], ['chat', 'Mensajes', c.unreadMsgs], ['ann', 'Anuncios', c.annN]].concat(adm ? [['adm', 'Administración']] : []);
    var mine = c.dir.filter(function (f) { return f.user_id === me; })[0];
    return h('div', { className: 'pb' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap', marginBottom: 6 } },
        h('div', null, h('div', { style: { fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--pb-muted)' } }, 'Directorio corporativo'), h('h2', { className: 'disp', style: { margin: 0, fontSize: 26, fontWeight: 700 } }, 'Páginas Blancas')),
        h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
          mine ? h('button', { type: 'button', className: 'pb-b', onClick: function () { setForm(mine); } }, h(Ico, { n: 'edit', s: 14 }), 'Mi ficha') : null,
          h('button', { type: 'button', className: 'pb-b', onClick: function () { setModal('cfg'); } }, h(Ico, { n: 'bell', s: 14 }), 'Notificaciones'))),
      h('p', { className: 'pb-hint', style: { marginTop: 0 } }, 'Información de uso interno: no la compartas fuera de la organización. · Versión ' + (window.PB.version || '')),
      h('div', { className: 'pb-tabs', role: 'tablist' }, tabs.map(function (t) { return h('button', { key: t[0], type: 'button', role: 'tab', className: 'pb-tab', 'aria-selected': tab === t[0], onClick: function () { setTab(t[0]); } }, t[1], t[2] ? h('span', { className: 'pb-cnt' }, t[2]) : null); })),
      tab === 'dir' ? h(Directory, { onOpen: setOpen, setVisible: setVisible })
        : tab === 'org' ? h(OrgChart, { onOpen: setOpen })
          : tab === 'chat' ? h(Chat, { sel: sel, setSel: setSel, onOpen: setOpen })
            : tab === 'ann' ? h(Anuncios, { toast: setToast })
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
