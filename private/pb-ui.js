/* StrataFlow · Páginas Blancas · interfaz (se carga después de pb.js) */
(function () {
  if (!window.PB || window.PB.Tab) return;
  var U = window.PB._u, core = window.PB.core, h = U.h, React = window.React;
  var useState = React.useState, useEffect = React.useEffect, useMemo = React.useMemo, useRef = React.useRef, useCallback = React.useCallback;
  var full = U.full, sb = U.sb;

  var CSS = '' +
    '.pb{--pb-bg:var(--bg,#0a1114);--pb-panel:var(--panel,#111b20);--pb-panel2:var(--panel2,#16242b);--pb-line:var(--line,#26373f);--pb-fg:var(--fg,#e8eff2);--pb-muted:var(--muted,#8fa3ad);--pb-acc:var(--accent,#f0a540);--pb-crit:var(--crit,#e5594f);--pb-good:var(--good,#3dbb8d);color:var(--pb-fg);font-size:14px}' +
    '.pb *{box-sizing:border-box}.pb button,.pb input,.pb select,.pb textarea{font:inherit;color:inherit}' +
    '.pb-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}.pb-grow{flex:1 1 220px;min-width:0}' +
    '.pb-in{width:100%;background:var(--pb-bg);color:var(--pb-fg);border:1px solid var(--pb-line);border-radius:6px;padding:7px 10px;font-size:13px;min-width:0}.pb-in:focus-visible,.pb-b:focus-visible,.pb-card:focus-visible,.pb-row:focus-visible,.pb-az button:focus-visible{outline:2px solid var(--pb-acc);outline-offset:1px}' +
    'textarea.pb-in{resize:vertical;font-family:inherit}.pb-lbl{display:block;font-size:12.5px;font-weight:500;margin-bottom:3px}.pb-req{color:var(--pb-crit)}.pb-hint{font-size:11.5px;color:var(--pb-muted);margin-top:3px}.pb-err{font-size:12px;color:var(--pb-crit);margin-top:3px}' +
    '.pb-b{display:inline-flex;align-items:center;gap:6px;background:var(--pb-panel2);border:1px solid var(--pb-line);border-radius:6px;padding:6px 11px;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap}.pb-b:hover{border-color:var(--pb-muted)}.pb-b.prim{background:var(--pb-acc);border-color:var(--pb-acc);color:#1a1205;font-weight:600}.pb-b.crit{background:var(--pb-crit);border-color:var(--pb-crit);color:#1a0705;font-weight:600}.pb-b:disabled{opacity:.5;cursor:not-allowed}' +
    '.pb-tabs{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:14px;border-bottom:1px solid var(--pb-line)}.pb-tab{background:none;border:0;border-bottom:2px solid transparent;color:var(--pb-muted);padding:8px 13px;font-weight:600;cursor:pointer;display:inline-flex;gap:7px;align-items:center}.pb-tab[aria-selected=true]{color:var(--pb-fg);border-bottom-color:var(--pb-acc)}' +
    '.pb-cnt{background:var(--pb-acc);color:#1a1205;border-radius:999px;font-size:11px;font-weight:700;padding:1px 7px;min-width:20px;text-align:center}' +
    '.pb-panel{background:var(--pb-panel);border:1px solid var(--pb-line);border-radius:10px}' +
    '.pb-main{display:flex;gap:10px;align-items:flex-start}.pb-az{display:flex;flex-direction:column;gap:1px;position:sticky;top:8px;flex:none}.pb-az button{background:none;border:0;color:var(--pb-muted);font-size:11px;font-weight:700;width:22px;height:20px;border-radius:4px;cursor:pointer;padding:0}.pb-az button:disabled{opacity:.25;cursor:default}.pb-az button[aria-pressed=true]{background:var(--pb-acc);color:#1a1205}' +
    '.pb-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));flex:1;min-width:0}' +
    '.pb-card{background:var(--pb-panel);border:1px solid var(--pb-line);border-radius:10px;padding:14px;cursor:pointer;text-align:left;display:flex;flex-direction:column;gap:6px;align-items:center;text-align:center;transition:border-color .15s,transform .15s}.pb-card:hover{border-color:var(--pb-acc);transform:translateY(-1px)}' +
    '.pb-list{flex:1;min-width:0;background:var(--pb-panel);border:1px solid var(--pb-line);border-radius:10px;overflow:hidden}.pb-row{display:flex;gap:12px;align-items:center;width:100%;background:none;border:0;border-bottom:1px solid var(--pb-line);padding:9px 12px;cursor:pointer;text-align:left}.pb-row:last-child{border-bottom:0}.pb-row:hover{background:var(--pb-panel2)}' +
    '.pb-av{border-radius:50%;background:var(--pb-panel2);border:1px solid var(--pb-line);color:var(--pb-acc);display:inline-flex;align-items:center;justify-content:center;font-weight:700;overflow:hidden;flex:none;position:relative;font-family:"Barlow Condensed",system-ui,sans-serif;letter-spacing:.04em}.pb-av img{width:100%;height:100%;object-fit:cover}' +
    '.pb-dot{position:absolute;right:0;bottom:0;border-radius:50%;border:2px solid var(--pb-panel)}' +
    '.pb-nm{font-weight:600;font-size:14.5px}.pb-sub{color:var(--pb-muted);font-size:12.5px}.pb-ell{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}' +
    '.pb-chip{display:inline-flex;font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid var(--pb-line);color:var(--pb-muted);margin:2px 3px 0 0}' +
    '.pb-ov{position:fixed;inset:0;background:rgba(3,8,10,.72);z-index:10000;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 12px}.pb-modal{background:var(--pb-panel);border:1px solid var(--pb-line);border-radius:12px;width:100%;max-width:680px;padding:18px;position:relative}' +
    '.pb-g2{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}.pb-sw{display:flex;gap:8px;align-items:center;font-size:13px}.pb-sw input{width:16px;height:16px}' +
    '.pb-chat{display:grid;grid-template-columns:320px 1fr;gap:0;height:min(72vh,680px);min-height:420px;overflow:hidden}.pb-inbox{border-right:1px solid var(--pb-line);overflow:auto;display:flex;flex-direction:column}.pb-th{display:flex;flex-direction:column;min-width:0;min-height:0}' +
    '.pb-msgs{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:6px;min-height:0}.pb-m{max-width:78%;padding:7px 10px;border-radius:12px;font-size:13.5px;line-height:1.4;overflow-wrap:anywhere;white-space:pre-wrap}.pb-m.me{align-self:flex-end;background:var(--pb-acc);color:#1a1205;border-bottom-right-radius:3px}.pb-m.ot{align-self:flex-start;background:var(--pb-panel2);border:1px solid var(--pb-line);border-bottom-left-radius:3px}.pb-meta{font-size:10.5px;opacity:.75;text-align:right;margin-top:2px;white-space:nowrap}' +
    '.pb-day{align-self:center;font-size:11px;color:var(--pb-muted);margin:6px 0}.pb-comp{display:flex;gap:8px;padding:10px;border-top:1px solid var(--pb-line);align-items:flex-end}.pb-comp textarea{max-height:120px}' +
    '.pb-conv{display:flex;gap:10px;align-items:center;padding:10px 12px;border:0;border-bottom:1px solid var(--pb-line);background:none;width:100%;cursor:pointer;text-align:left}.pb-conv:hover,.pb-conv[aria-current=true]{background:var(--pb-panel2)}' +
    '.pb-att{display:flex;gap:8px;align-items:center;background:rgba(0,0,0,.18);border-radius:8px;padding:6px 8px;margin-bottom:4px;font-size:12.5px}.pb-m img.pb-img{max-width:240px;max-height:200px;border-radius:8px;display:block;margin-bottom:4px;cursor:pointer}' +
    '.pb-empty{padding:40px 16px;text-align:center;color:var(--pb-muted)}.pb-tbl{width:100%;border-collapse:collapse;font-size:12.5px}.pb-tbl th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--pb-muted);padding:6px 8px;border-bottom:1px solid var(--pb-line)}.pb-tbl td{padding:6px 8px;border-bottom:1px solid var(--pb-line);vertical-align:top}' +
    '.pb-treewrap{overflow-x:auto;padding:4px 4px 14px}.pb-tree{width:max-content;min-width:100%;display:flex;justify-content:center}.pb-tree ul{display:flex;justify-content:center;list-style:none;margin:0;padding:22px 0 0;position:relative}.pb-tree>ul{padding-top:0}.pb-tree li{position:relative;text-align:center;padding:22px 7px 0;list-style:none}.pb-tree>ul>li{padding-top:0}' +
    '.pb-tree li::before,.pb-tree li::after{content:"";position:absolute;top:0;right:50%;width:50%;height:22px;border-top:1px solid var(--pb-line)}.pb-tree li::after{right:auto;left:50%;border-left:1px solid var(--pb-line)}.pb-tree>ul>li::before,.pb-tree>ul>li::after{display:none}.pb-tree li:only-child::before,.pb-tree li:only-child::after{display:none}.pb-tree li:first-child::before,.pb-tree li:last-child::after{border:0}.pb-tree li:last-child::before{border-right:1px solid var(--pb-line);border-radius:0 8px 0 0}.pb-tree li:first-child::after{border-radius:8px 0 0 0}.pb-tree ul ul::before{content:"";position:absolute;top:0;left:50%;height:22px;border-left:1px solid var(--pb-line)}' +
    '.pb-ocard{display:inline-flex;flex-direction:column;align-items:center;gap:3px;width:158px;padding:10px 8px;background:var(--pb-panel2);border:1px solid var(--pb-line);border-radius:10px;cursor:pointer}.pb-ocard:hover{border-color:var(--pb-acc)}.pb-solos{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}.pb-typing{align-self:flex-start;font-size:12px;color:var(--pb-muted);font-style:italic;padding:2px 4px}.pb-sn{font-size:11px;font-weight:700;color:var(--pb-acc);margin-bottom:2px}.pb-gav{background:var(--pb-acc)!important;color:#1a1205!important}' +
    '.pb-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:64px;background:var(--pb-panel2);border:1px solid var(--pb-acc);border-radius:8px;padding:8px 14px;z-index:10001;font-size:13px}' +
    '.pb-back{display:none}' +
    '@media (max-width:760px){.pb-chat{grid-template-columns:1fr;height:78vh}.pb-chat.th .pb-inbox{display:none}.pb-chat:not(.th) .pb-th{display:none}.pb-back{display:inline-flex}.pb-az{display:none}.pb-m{max-width:88%}.pb-ov{padding:0}.pb-modal{border-radius:0;min-height:100vh}}' +
    '@media (prefers-reduced-motion:reduce){.pb-card{transition:none}}';
  (function () { if (document.getElementById('pb-css')) return; var s = document.createElement('style'); s.id = 'pb-css'; s.textContent = CSS; document.head.appendChild(s); })();

  function Ico(p) {
    var D = { chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z', mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm18 2-10 7L2 6', copy: 'M9 9h11v11H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1', dl: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3', send: 'm22 2-7 20-4-9-9-4zM22 2 11 13', clip: 'm21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5', x: 'M18 6 6 18M6 6l12 12', edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z', grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z', list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', plus: 'M12 5v14M5 12h14', back: 'm15 18-6-6 6-6', bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0', search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2-4.3-4.3', up: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12', log: 'M12 8v4l3 3M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5' };
    return h('svg', { width: p.s || 16, height: p.s || 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, style: { flex: 'none' } }, h('path', { d: D[p.n] }));
  }
  function Avatar(p) {
    var f = p.f, s = p.size || 44, est = p.estado;
    return h('span', { className: 'pb-av', style: { width: s, height: s, fontSize: Math.round(s * 0.4) } },
      f.foto ? h('img', { src: f.foto, alt: 'Fotografía de ' + full(f), loading: 'lazy', decoding: 'async' }) : initials(f),
      est ? h('span', { className: 'pb-dot', title: U.ESTADOS[est], style: { width: Math.max(10, s * 0.26), height: Math.max(10, s * 0.26), background: U.ESTADO_COLOR[est] } }) : null);
  }
  function initials(f) { return U.initials(f); }
  function Modal(p) {
    var ref = useRef(null);
    useEffect(function () {
      var prev = document.activeElement, esc = function (e) { if (e.key === 'Escape') p.onClose(); };
      document.addEventListener('keydown', esc); if (ref.current) ref.current.focus();
      return function () { document.removeEventListener('keydown', esc); if (prev && prev.focus) prev.focus(); };
    }, []);
    return h('div', { className: 'pb-ov', onMouseDown: function (e) { if (e.target === e.currentTarget) p.onClose(); } },
      h('div', { className: 'pb-modal', role: 'dialog', 'aria-modal': true, 'aria-label': p.title, tabIndex: -1, ref: ref, style: p.wide ? { maxWidth: 860 } : null },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 } },
          h('h2', { style: { margin: 0, fontSize: 18, fontWeight: 700 } }, p.title),
          h('button', { type: 'button', className: 'pb-b', onClick: p.onClose, 'aria-label': 'Cerrar' }, h(Ico, { n: 'x', s: 14 }))),
        p.children));
  }
  function Field(p) {
    return h('div', { style: p.style }, h('label', { className: 'pb-lbl', htmlFor: p.id }, p.label, p.req ? h('span', { className: 'pb-req', 'aria-hidden': true }, ' *') : null), p.children, p.hint ? h('div', { className: 'pb-hint' }, p.hint) : null, p.err ? h('div', { className: 'pb-err', role: 'alert' }, p.err) : null);
  }
  function Toast(p) { return p.msg ? h('div', { className: 'pb-toast', role: 'status' }, p.msg) : null; }

  /* ---------- recorte de fotografía ---------- */
  function PhotoCropper(p) {
    var cv = useRef(null), s1 = useState(null), img = s1[0], setImg = s1[1];
    var s2 = useState(1), zoom = s2[0], setZoom = s2[1], s3 = useState(0), ox = s3[0], setOx = s3[1], s4 = useState(0), oy = s4[0], setOy = s4[1], s5 = useState(''), err = s5[0], setErr = s5[1];
    function pick(e) {
      var f = e.target.files && e.target.files[0]; if (!f) return; setErr('');
      if (['image/jpeg', 'image/png', 'image/webp'].indexOf(f.type) < 0) return setErr('Formato no válido. Usa JPG, PNG o WebP.');
      if (f.size > 8 * 1024 * 1024) return setErr('La imagen supera 8 MB.');
      var im = new Image(), url = URL.createObjectURL(f);
      im.onload = function () { URL.revokeObjectURL(url); setImg(im); setZoom(1); setOx(0); setOy(0); };
      im.onerror = function () { setErr('No se pudo leer la imagen.'); };
      im.src = url;
    }
    function draw(size) {
      var c = cv.current; if (!c || !img) return null; c.width = size; c.height = size;
      var x = c.getContext('2d'), base = Math.min(img.width, img.height) / zoom, sx = (img.width - base) / 2 + ox * (img.width - base) / 2, sy = (img.height - base) / 2 + oy * (img.height - base) / 2;
      sx = Math.max(0, Math.min(img.width - base, sx)); sy = Math.max(0, Math.min(img.height - base, sy));
      x.fillStyle = '#16242b'; x.fillRect(0, 0, size, size); x.drawImage(img, sx, sy, base, base, 0, 0, size, size); return c;
    }
    useEffect(function () { draw(160); }, [img, zoom, ox, oy]);
    function apply() {
      var c = draw(192); if (!c) return; var out = c.toDataURL('image/webp', 0.82);
      if (out.indexOf('data:image/webp') !== 0) out = c.toDataURL('image/jpeg', 0.82);
      p.onApply(out);
    }
    return h('div', { className: 'pb-panel', style: { padding: 12, marginTop: 8 } },
      h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', onChange: pick, 'aria-label': 'Seleccionar fotografía' }),
      err ? h('div', { className: 'pb-err', role: 'alert' }, err) : null,
      img ? h('div', { style: { display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' } },
        h('canvas', { ref: cv, width: 160, height: 160, style: { width: 120, height: 120, borderRadius: '50%', border: '1px solid var(--pb-line)' }, 'aria-label': 'Vista previa del recorte' }),
        h('div', { style: { flex: '1 1 180px' } },
          h('label', { className: 'pb-lbl' }, 'Acercar'), h('input', { type: 'range', min: 1, max: 3, step: 0.05, value: zoom, onChange: function (e) { setZoom(+e.target.value); }, style: { width: '100%' } }),
          h('label', { className: 'pb-lbl' }, 'Mover horizontal'), h('input', { type: 'range', min: -1, max: 1, step: 0.05, value: ox, onChange: function (e) { setOx(+e.target.value); }, style: { width: '100%' } }),
          h('label', { className: 'pb-lbl' }, 'Mover vertical'), h('input', { type: 'range', min: -1, max: 1, step: 0.05, value: oy, onChange: function (e) { setOy(+e.target.value); }, style: { width: '100%' } }),
          h('div', { style: { marginTop: 8, display: 'flex', gap: 8 } }, h('button', { type: 'button', className: 'pb-b prim', onClick: apply }, 'Usar esta foto'), h('button', { type: 'button', className: 'pb-b', onClick: p.onCancel }, 'Cancelar')))) : null,
      h('div', { className: 'pb-hint' }, 'Se recorta en cuadrado (192 × 192 px) y se comprime automáticamente.'));
  }

  /* ---------- formulario de ficha ---------- */
  function FichaForm(p) {
    var base = p.ficha, nuevo = !base;
    var s1 = useState(null), f = s1[0], setF = s1[1], s2 = useState({}), errs = s2[0], setErrs = s2[1], s3 = useState(false), busy = s3[0], setBusy = s3[1], s4 = useState(false), crop = s4[0], setCrop = s4[1], s5 = useState(''), top = s5[0], setTop = s5[1];
    useEffect(function () {
      if (nuevo) { setF({ nombres: '', apellidos: '', cargo: '', departamento: '', sede: '', jefe_id: '', correo: '', telefono: '', extension: '', celular: '', whatsapp: '', foto: null, fecha_ingreso: '', idiomas: '', habilidades: '', biografia: '', estado: 'disponible', visibilidad: { correo: true, telefono: true, celular: false, whatsapp: false, fecha_ingreso: false, biografia: true } }); return; }
      sb().from('pb_fichas').select('*').eq('id', base.id).single().then(function (r) {
        if (r.error) { setTop(U.errMsg(r.error)); return; }
        var d = r.data; setF(Object.assign({}, d, { jefe_id: d.jefe_id || '', fecha_ingreso: d.fecha_ingreso || '', idiomas: (d.idiomas || []).join(', '), habilidades: (d.habilidades || []).join(', '), visibilidad: Object.assign({ correo: true, telefono: true, celular: false, whatsapp: false, fecha_ingreso: false, biografia: true }, d.visibilidad || {}) }));
      });
    }, []);
    if (!f) return h(Modal, { title: 'Ficha', onClose: p.onClose }, top ? h('div', { className: 'pb-err' }, top) : h('div', { className: 'pb-empty' }, 'Cargando…'));
    function set(k, v) { setF(function (o) { var n = Object.assign({}, o); n[k] = v; return n; }); }
    function validate() {
      var e = {};
      if (!f.nombres.trim()) e.nombres = 'Los nombres son obligatorios.';
      if (!U.emailOk(f.correo.trim())) e.correo = 'Correo con formato no válido.';
      ['telefono', 'celular', 'whatsapp'].forEach(function (k) { if (!U.phoneOk(U.normPhone(f[k]))) e[k] = 'Teléfono no válido (7 a 15 dígitos).'; });
      if (f.fecha_ingreso && !/^\d{4}-\d{2}-\d{2}$/.test(f.fecha_ingreso)) e.fecha_ingreso = 'Fecha no válida.';
      if (f.biografia.length > 1000) e.biografia = 'Máximo 1.000 caracteres.';
      setErrs(e); return !Object.keys(e).length;
    }
    async function save() {
      if (!validate()) return; setBusy(true); setTop('');
      var row = { nombres: f.nombres.trim(), apellidos: f.apellidos.trim(), cargo: f.cargo.trim(), departamento: f.departamento.trim(), sede: f.sede.trim(), jefe_id: f.jefe_id || null, correo: f.correo.trim(), telefono: U.normPhone(f.telefono), extension: f.extension.trim(), celular: U.normPhone(f.celular), whatsapp: U.normPhone(f.whatsapp), foto: f.foto || null, fecha_ingreso: f.fecha_ingreso || null, idiomas: U.listOf(f.idiomas), habilidades: U.listOf(f.habilidades), biografia: f.biografia.trim(), estado: f.estado, visibilidad: f.visibilidad };
      var r = nuevo ? await sb().from('pb_fichas').insert(row) : await sb().from('pb_fichas').update(row).eq('id', base.id);
      setBusy(false);
      if (r.error) { setTop(U.errMsg(r.error)); return; }
      p.onSaved(nuevo ? 'Ficha creada.' : 'Ficha actualizada.');
    }
    var jefes = core.dir.filter(function (x) { return !base || x.id !== base.id; });
    var inp = function (k, label, o) {
      o = o || {};
      return h(Field, { id: 'pbf-' + k, label: label, req: o.req, err: errs[k], hint: o.hint }, o.area
        ? h('textarea', { id: 'pbf-' + k, className: 'pb-in', rows: 3, maxLength: 1000, value: f[k], onChange: function (e) { set(k, e.target.value); } })
        : h('input', { id: 'pbf-' + k, className: 'pb-in', type: o.type || 'text', value: f[k] || '', maxLength: o.max || 100, 'aria-required': !!o.req, onChange: function (e) { set(k, e.target.value); } }));
    };
    return h(Modal, { title: nuevo ? 'Nueva ficha' : 'Editar ficha', onClose: p.onClose, wide: true },
      top ? h('div', { className: 'pb-err', role: 'alert', style: { marginBottom: 8 } }, top) : null,
      h('div', { style: { display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' } },
        h(Avatar, { f: f, size: 72 }),
        h('div', null, h('button', { type: 'button', className: 'pb-b', onClick: function () { setCrop(!crop); } }, h(Ico, { n: 'up', s: 14 }), 'Cambiar fotografía'),
          f.foto ? h('button', { type: 'button', className: 'pb-b', style: { marginLeft: 6 }, onClick: function () { set('foto', null); } }, 'Quitar') : null)),
      crop ? h(PhotoCropper, { onApply: function (d) { set('foto', d); setCrop(false); }, onCancel: function () { setCrop(false); } }) : null,
      h('p', { className: 'pb-hint' }, 'Los campos con ', h('span', { className: 'pb-req' }, '*'), ' son obligatorios.'),
      h('div', { className: 'pb-g2' },
        inp('nombres', 'Nombres', { req: true, max: 80 }), inp('apellidos', 'Apellidos', { max: 80 }),
        inp('cargo', 'Cargo'), inp('departamento', 'Departamento / gerencia', { max: 80 }), inp('sede', 'Sede / ubicación', { max: 80 }),
        h(Field, { id: 'pbf-jefe', label: 'Jefe directo' }, h('select', { id: 'pbf-jefe', className: 'pb-in', value: f.jefe_id, onChange: function (e) { set('jefe_id', e.target.value); } }, h('option', { value: '' }, '— Ninguno —'), jefes.map(function (j) { return h('option', { key: j.id, value: j.id }, full(j)); }))),
        inp('correo', 'Correo corporativo', { type: 'email', max: 160 }), inp('telefono', 'Teléfono fijo', { type: 'tel', max: 40 }), inp('extension', 'Extensión', { max: 12 }),
        inp('celular', 'Celular', { type: 'tel', max: 40 }), inp('whatsapp', 'WhatsApp (opcional)', { type: 'tel', max: 40 }), inp('fecha_ingreso', 'Fecha de ingreso', { type: 'date' }),
        inp('idiomas', 'Idiomas', { hint: 'Sepáralos con comas.' }), inp('habilidades', 'Habilidades', { hint: 'Sepáralas con comas.' }),
        h(Field, { id: 'pbf-estado', label: 'Mi disponibilidad' }, h('select', { id: 'pbf-estado', className: 'pb-in', value: f.estado, onChange: function (e) { set('estado', e.target.value); } }, [['disponible', 'En línea'], ['ocupado', 'Ocupado'], ['ausente', 'Ausente']].map(function (o) { return h('option', { key: o[0], value: o[0] }, o[1]); })))),
      h('div', { style: { marginTop: 12 } }, inp('biografia', 'Biografía breve', { area: true })),
      h('fieldset', { style: { border: '1px solid var(--pb-line)', borderRadius: 8, margin: '14px 0 0', padding: '8px 12px' } },
        h('legend', { style: { fontSize: 12.5, fontWeight: 600, padding: '0 6px' } }, 'Privacidad: ¿qué datos pueden ver los demás?'),
        h('div', { className: 'pb-g2' }, U.CAMPOS_PRIV.map(function (c) {
          return h('label', { key: c[0], className: 'pb-sw' }, h('input', { type: 'checkbox', checked: !!f.visibilidad[c[0]], onChange: function (e) { var v = Object.assign({}, f.visibilidad); v[c[0]] = e.target.checked; set('visibilidad', v); } }), c[1]);
        })), h('div', { className: 'pb-hint' }, 'Tu nombre, cargo, departamento, sede, fotografía y disponibilidad siempre son visibles. Administración puede ver todos los datos.')),
      h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 } },
        h('button', { type: 'button', className: 'pb-b', onClick: p.onClose }, 'Cancelar'),
        h('button', { type: 'button', className: 'pb-b prim', disabled: busy, onClick: save }, busy ? 'Guardando…' : 'Guardar')));
  }

  /* ---------- ficha (detalle) ---------- */
  function FichaView(p) {
    var f = p.f, me = U.meId(), mine = f.user_id === me, adm = U.isAdm(), est = core.estado(f), jefe = null;
    core.dir.forEach(function (x) { if (x.id === f.jefe_id) jefe = x; });
    var subs = core.dir.filter(function (x) { return x.jefe_id === f.id; });
    function copy() {
      var t = U.contactText(f), ok = function () { p.toast('Contacto copiado.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function () { p.toast('No se pudo copiar.'); });
      else p.toast('Tu navegador no permite copiar.');
    }
    var row = function (l, v) { return v ? h('div', { style: { display: 'flex', gap: 10, padding: '5px 0', borderBottom: '1px solid var(--pb-line)' } }, h('div', { className: 'pb-sub', style: { width: 120, flex: 'none' } }, l), h('div', { style: { minWidth: 0, overflowWrap: 'anywhere' } }, v)) : null; };
    var canChat = f.user_id && !mine;
    return h(Modal, { title: 'Ficha del trabajador', onClose: p.onClose },
      h('div', { style: { display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' } },
        h(Avatar, { f: f, size: 88, estado: est }),
        h('div', { style: { minWidth: 0, flex: 1 } }, h('div', { className: 'disp', style: { fontSize: 24, fontWeight: 700 } }, full(f)), h('div', null, f.cargo || 'Sin cargo registrado'),
          h('div', { className: 'pb-sub' }, [f.departamento, f.sede].filter(Boolean).join(' · ') || 'Sin departamento ni sede'),
          h('div', { className: 'pb-sub', style: { color: U.ESTADO_COLOR[est] } }, '● ' + U.ESTADOS[est], f.activo ? '' : ' · Ficha desactivada'))),
      h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', margin: '14px 0' } },
        canChat ? h('button', { type: 'button', className: 'pb-b prim', onClick: function () { p.onChat(f); } }, h(Ico, { n: 'chat', s: 14 }), 'Chatear') : null,
        !f.user_id ? h('span', { className: 'pb-hint', style: { alignSelf: 'center' } }, 'Este trabajador aún no tiene cuenta en StrataFlow; el chat no está disponible.') : null,
        (f.celular || f.telefono) ? h('a', { className: 'pb-b', href: 'tel:' + (f.celular || f.telefono).replace(/[^\d+]/g, ''), style: { textDecoration: 'none' } }, h(Ico, { n: 'phone', s: 14 }), 'Llamar') : null,
        f.correo ? h('a', { className: 'pb-b', href: 'mailto:' + encodeURIComponent(f.correo).replace('%40', '@'), style: { textDecoration: 'none' } }, h(Ico, { n: 'mail', s: 14 }), 'Correo') : null,
        h('button', { type: 'button', className: 'pb-b', onClick: copy }, h(Ico, { n: 'copy', s: 14 }), 'Copiar contacto'),
        h('button', { type: 'button', className: 'pb-b', onClick: function () { U.download('Contacto_' + U.safeName(full(f)).replace(/ /g, '_') + '_' + U.stamp() + '.vcf', U.vcard(f), 'text/vcard'); } }, h(Ico, { n: 'dl', s: 14 }), 'Descargar tarjeta (.vcf)')),
      row('Correo', f.correo), row('Teléfono', f.telefono && (f.telefono + (f.extension ? ' · ext. ' + f.extension : ''))), row('Celular', f.celular), row('WhatsApp', f.whatsapp),
      row('Jefe directo', jefe && h('button', { type: 'button', className: 'pb-b', style: { padding: '2px 8px' }, onClick: function () { p.onOpen(jefe); } }, full(jefe))),
      row('Supervisados', subs.length ? subs.map(function (s) { return h('button', { key: s.id, type: 'button', className: 'pb-b', style: { padding: '2px 8px', margin: '0 4px 4px 0' }, onClick: function () { p.onOpen(s); } }, full(s)); }) : null),
      row('Fecha de ingreso', U.fmtDate(f.fecha_ingreso)),
      row('Idiomas', (f.idiomas || []).length ? f.idiomas.map(function (x) { return h('span', { key: x, className: 'pb-chip' }, x); }) : null),
      row('Habilidades', (f.habilidades || []).length ? f.habilidades.map(function (x) { return h('span', { key: x, className: 'pb-chip' }, x); }) : null),
      row('Biografía', f.biografia),
      h('p', { className: 'pb-hint', style: { marginTop: 12 } }, 'Información de uso interno. No la compartas fuera de la organización.'),
      (mine || adm) ? h('div', { style: { display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' } },
        h('button', { type: 'button', className: 'pb-b', onClick: function () { p.onEdit(f); } }, h(Ico, { n: 'edit', s: 14 }), mine ? 'Editar mi ficha' : 'Editar ficha'),
        adm ? h('button', { type: 'button', className: 'pb-b ' + (f.activo ? '' : 'prim'), onClick: function () { p.onToggle(f); } }, f.activo ? 'Desactivar ficha' : 'Reactivar ficha') : null) : null);
  }

  window.PB._ui = { Ico: Ico, Avatar: Avatar, Modal: Modal, Field: Field, Toast: Toast, FichaForm: FichaForm, FichaView: FichaView };
})();
