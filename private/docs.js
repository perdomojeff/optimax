/* StrataFlow · Documentos · módulo compartido (StrataFlow y vista SAI).
   Misma lógica que Biblioteca (búsqueda en nombre y contenido, vista previa, descarga, ZIP, carga con indexado de texto)
   con otra lista de tipos. Datos: colecciones docs / docstext de app_docs; archivos: bucket "biblioteca", carpeta d/.
   Subir: admin y analista · Eliminar: admin · Resto de roles (incluido SAI): solo lectura. */
(function () {
  if (window.DOCS || !window.React) return;
  var React = window.React, h = React.createElement, useState = React.useState, useEffect = React.useEffect, useMemo = React.useMemo, useRef = React.useRef;
  var DLANG = 'es';
  function L(es, en) { return DLANG === 'en' ? en : es; }
  function sb() { return window.__sb; }
  function nf(n, d) { var s = (+n).toFixed(d || 0); return DLANG === 'en' ? s : s.replace('.', ','); }
  function uid() { return 'd' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function fdate() { var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; }; return p(d.getMonth() + 1) + '-' + p(d.getDate()) + '-' + d.getFullYear(); }
  async function saveFile(name, data) {
    var b = data instanceof Blob ? data : new Blob([data]);
    var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  var ICONS = {
    download: [['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }], ['polyline', { points: '7 10 12 15 17 10' }], ['line', { x1: 12, x2: 12, y1: 15, y2: 3 }]],
    upload: [['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }], ['polyline', { points: '17 8 12 3 7 8' }], ['line', { x1: 12, x2: 12, y1: 3, y2: 15 }]],
    file: [['path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }], ['path', { d: 'M14 2v6h6' }]],
    x: [['path', { d: 'M18 6 6 18' }], ['path', { d: 'm6 6 12 12' }]],
    trash: [['path', { d: 'M3 6h18' }], ['path', { d: 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6' }], ['path', { d: 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' }]],
    check: [['path', { d: 'M20 6 9 17l-5-5' }]]
  };
  function Icon(p) { var s = p.s || 16; return h('svg', { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, style: { flex: 'none' } }, ICONS[p.n].map(function (x, i) { return h(x[0], Object.assign({ key: i }, x[1])); })); }
  function Chip(p) { return h('span', { className: 'pill', style: { '--sc': p.color || 'var(--muted)' } }, p.children); }
  function TxtIn(p) { return h('div', { className: 'nf', style: { minWidth: 0 } }, h('label', { htmlFor: p.id, className: 'lbl' }, p.label), h('input', { id: p.id, type: 'text', value: p.value || '', className: 'in', placeholder: p.ph || '', onChange: function (e) { p.onChange(e.target.value); } })); }
  function SelIn(p) { return h('div', { className: 'nf', style: { minWidth: 0 } }, p.label ? h('label', { htmlFor: p.id, className: 'lbl' }, p.label) : null, h('select', { id: p.id, value: p.value, className: 'in', onChange: function (e) { p.onChange(e.target.value); } }, p.options.map(function (o) { return h('option', { key: o[0], value: o[0] }, o[1]); }))); }
  function ConfirmBtn(p) {
    var s = useState(false), armed = s[0], setArmed = s[1];
    useEffect(function () { if (!armed) return; var t = setTimeout(function () { setArmed(false); }, 4000); return function () { clearTimeout(t); }; }, [armed]);
    return h('button', { type: 'button', className: 'btn2 ' + (armed ? 'crit' : ''), onClick: function () { if (armed) { setArmed(false); p.onConfirm(); } else setArmed(true); } }, h(Icon, { n: 'trash', s: 14 }), armed ? p.confirmLabel : p.label);
  }

  /* ---- tipos de documento (orden alfabético según el idioma) ---- */
  var DOC_TIPOS = [
    ['manuales', 'Manuales Homologados', 'Standardized Manuals'], ['formatos', 'Formatos Corporativos', 'Corporate Forms'],
    ['publicaciones', 'Publicaciones / Papers', 'Publications / Papers'], ['norma', 'Norma / Standard', 'Standard / Norm'],
    ['mapas', 'Mapas / Planos', 'Maps / Drawings'], ['hoja', 'Hoja de Cálculo', 'Spreadsheet'], ['finanzas', 'Finanzas', 'Finance'],
    ['informe', 'Informe Técnico', 'Technical Report'], ['presentacion', 'Presentación', 'Presentation'],
    ['identidad', 'Identidad Corporativa', 'Corporate Identity'], ['otros', 'Otros', 'Other']
  ];
  function docTipos() {
    return DOC_TIPOS.map(function (t) { return [t[0], DLANG === 'en' ? t[2] : t[1]]; }).sort(function (a, b) { return a[1].localeCompare(b[1], DLANG === 'en' ? 'en' : 'es', { sensitivity: 'base' }); });
  }
  function docTipoName(k) { var t = docTipos().filter(function (x) { return x[0] === k; })[0]; return t ? t[1] : (k || '—'); }

  /* ---- motor (mismo que Biblioteca) ---- */
  var LIB_MAX_TEXT = 600000, LIB_MAX_BYTES = 45 * 1024 * 1024;
  function libFold(s) { return String(s || '').replace(/[À-ɏ]/g, function (c) { return c.normalize('NFD').charAt(0); }).toLowerCase(); }
  function libTerms(q) { var out = [], re = /"([^"]+)"|(\S+)/g, m; while ((m = re.exec(q || ''))) { var t = libFold(m[1] || m[2]).trim(); if (t) out.push(t); } return out; }
  function libCount(hay, term, cap) { var n = 0, i = 0; while (n < cap && (i = hay.indexOf(term, i)) >= 0) { n++; i += term.length; } return n; }
  function libExt(name) { var m = /\.([a-z0-9]+)$/i.exec(name || ''); return m ? m[1].toLowerCase() : ''; }
  function libSize(b) { return b >= 1048576 ? nf(b / 1048576, 1) + ' MB' : nf(Math.max(1, b / 1024), 0) + ' KB'; }
  var LIB_MIME = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
  /* ---- ZIP (lectura mínima de .docx/.xlsx y escritura sin compresión) ---- */
  function libZipList(buf) {
    var dv = new DataView(buf), n = buf.byteLength, i, eocd = -1;
    for (i = n - 22; i >= Math.max(0, n - 65557); i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }
    if (eocd < 0) throw new Error('zip');
    var cnt = dv.getUint16(eocd + 10, true), p = dv.getUint32(eocd + 16, true), out = {}, k;
    for (k = 0; k < cnt; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      var nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
      var name = new TextDecoder().decode(new Uint8Array(buf, p + 46, nl));
      out[name] = { method: dv.getUint16(p + 10, true), csize: dv.getUint32(p + 20, true), lo: dv.getUint32(p + 42, true) };
      p += 46 + nl + xl + cl;
    }
    return out;
  }
  async function libZipRead(buf, e) {
    var dv = new DataView(buf), nl = dv.getUint16(e.lo + 26, true), xl = dv.getUint16(e.lo + 28, true), st = e.lo + 30 + nl + xl;
    var raw = new Uint8Array(buf, st, e.csize);
    if (e.method === 0) return raw;
    if (e.method !== 8 || typeof DecompressionStream === 'undefined') throw new Error('inflate');
    var r = new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')));
    return new Uint8Array(await r.arrayBuffer());
  }
  var LIB_CRC = null;
  function libCrc(u8) {
    if (!LIB_CRC) { LIB_CRC = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); LIB_CRC[n] = c >>> 0; } }
    var c2 = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c2 = LIB_CRC[(c2 ^ u8[i]) & 255] ^ (c2 >>> 8);
    return (c2 ^ 0xFFFFFFFF) >>> 0;
  }
  function libZipBuild(files) {
    var enc = new TextEncoder(), chunks = [], cd = [], off = 0, now = new Date();
    var dt = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate(), tm = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    files.forEach(function (f) {
      var nm = enc.encode(f.name), crc = libCrc(f.data), len = f.data.length;
      var lh = new Uint8Array(30 + nm.length), v = new DataView(lh.buffer);
      v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true); v.setUint16(8, 0, true); v.setUint16(10, tm, true); v.setUint16(12, dt, true);
      v.setUint32(14, crc, true); v.setUint32(18, len, true); v.setUint32(22, len, true); v.setUint16(26, nm.length, true); v.setUint16(28, 0, true); lh.set(nm, 30);
      chunks.push(lh, f.data);
      var ch = new Uint8Array(46 + nm.length), c = new DataView(ch.buffer);
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, tm, true); c.setUint16(14, dt, true);
      c.setUint32(16, crc, true); c.setUint32(20, len, true); c.setUint32(24, len, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true); ch.set(nm, 46);
      cd.push(ch); off += lh.length + len;
    });
    var cdSize = cd.reduce(function (a, b) { return a + b.length; }, 0), end = new Uint8Array(22), e = new DataView(end.buffer);
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cdSize, true); e.setUint32(16, off, true);
    return new Blob(chunks.concat(cd, [end]), { type: 'application/zip' });
  }

  /* ---- extracción de texto ---- */
  function libEnt(s) { return s.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos);/gi, function (m, g) { var l = g.toLowerCase(); if (l === 'amp') return '&'; if (l === 'lt') return '<'; if (l === 'gt') return '>'; if (l === 'quot') return '"'; if (l === 'apos') return "'"; var cp = l.charAt(1) === 'x' ? parseInt(l.slice(2), 16) : parseInt(l.slice(1), 10); try { return String.fromCodePoint(cp); } catch (e) { return ''; } }); }
  async function libDocxText(buf) {
    var z = libZipList(buf), e = z['word/document.xml']; if (!e) throw new Error('docx');
    var xml = new TextDecoder().decode(await libZipRead(buf, e));
    return libEnt(xml.replace(/<w:tab\s*\/>/g, ' ').replace(/<w:br\s*\/>/g, '\n').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
  }
  async function libXlsxText(buf) {
    var z = libZipList(buf), dec = new TextDecoder(), out = [], m;
    if (z['xl/workbook.xml']) { var wb = dec.decode(await libZipRead(buf, z['xl/workbook.xml'])), re = /<sheet\b[^>]*\bname="([^"]*)"/g; while ((m = re.exec(wb))) out.push('[' + libEnt(m[1]) + ']'); }
    if (z['xl/sharedStrings.xml']) {
      var ss = dec.decode(await libZipRead(buf, z['xl/sharedStrings.xml'])), items = ss.split('</si>');
      items.forEach(function (it) { var t = '', r = /<t\b[^>]*>([\s\S]*?)<\/t>/g, mm; while ((mm = r.exec(it))) t += mm[1]; if (t) out.push(libEnt(t)); });
    }
    Object.keys(z).filter(function (k) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(k); }).forEach(function (k) { z[k].p = libZipRead(buf, z[k]); });
    var names = Object.keys(z).filter(function (k) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(k); });
    for (var i = 0; i < names.length; i++) {
      var sx = dec.decode(await z[names[i]].p), r2 = /<is>([\s\S]*?)<\/is>/g, m2;
      while ((m2 = r2.exec(sx))) { var t2 = '', r3 = /<t\b[^>]*>([\s\S]*?)<\/t>/g, m3; while ((m3 = r3.exec(m2[1]))) t2 += m3[1]; if (t2) out.push(libEnt(t2)); }
    }
    return out.join('\n');
  }
  async function libPptxText(buf) {
    var z = libZipList(buf), dec = new TextDecoder(), out = [];
    var names = Object.keys(z).filter(function (k) { return /^ppt\/slides\/slide\d+\.xml$/.test(k); }).sort(function (a, b) { return parseInt(a.replace(/\D+/g, ''), 10) - parseInt(b.replace(/\D+/g, ''), 10); });
    if (!names.length) throw new Error('pptx');
    for (var i = 0; i < names.length; i++) {
      var xml = dec.decode(await libZipRead(buf, z[names[i]]));
      out.push('[' + (i + 1) + ']\n' + libEnt(xml.replace(/<a:br\s*\/>/g, '\n').replace(/<\/a:p>/g, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n'));
    }
    return out.join('\n');
  }
  var LIB_PDF_BASES = ['https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/', 'https://unpkg.com/pdfjs-dist@3.11.174/build/'];
  var libPdfPromise = null;
  function libLoadPdfjs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (libPdfPromise) return libPdfPromise;
    libPdfPromise = new Promise(function (res, rej) {
      var i = 0;
      (function next() {
        if (i >= LIB_PDF_BASES.length) { libPdfPromise = null; rej(new Error('pdfjs')); return; }
        var base = LIB_PDF_BASES[i++], s = document.createElement('script');
        s.src = base + 'pdf.min.js';
        s.onload = function () { if (window.pdfjsLib) { try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.js'; } catch (e) { } res(window.pdfjsLib); } else next(); };
        s.onerror = function () { s.remove(); next(); };
        document.head.appendChild(s);
      })();
    });
    return libPdfPromise;
  }
  async function libPdfText(buf) {
    var lib = await libLoadPdfjs(), pdf = await lib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise, parts = [], tot = 0, p, np = pdf.numPages;
    for (p = 1; p <= np; p++) {
      var pg = await pdf.getPage(p), tc = await pg.getTextContent(), s = '';
      tc.items.forEach(function (it) { s += it.str + (it.hasEOL ? '\n' : ' '); });
      s = s.replace(/[ \t]+/g, ' '); parts.push(s); tot += s.length;
      try { pg.cleanup(); } catch (e) { }
      if (tot > LIB_MAX_TEXT) break;
    }
    try { pdf.destroy(); } catch (e) { }
    return { text: parts.join('\f'), pages: np };
  }
  async function libExtract(buf, ext) {
    var r = { text: '', pages: null };
    if (ext === 'pdf') r = await libPdfText(buf);
    else if (ext === 'docx') r.text = await libDocxText(buf);
    else if (ext === 'xlsx') r.text = await libXlsxText(buf);
    else if (ext === 'pptx') { r.text = await libPptxText(buf); }
    if (r.text.length > LIB_MAX_TEXT) r.text = r.text.slice(0, LIB_MAX_TEXT);
    return r;
  }



  /* ---- almacenamiento: bucket "biblioteca", carpeta d/ ---- */
  var LIBST = {
    put: async function (file, id, ext) {
      var path = 'd/' + id + '.' + ext, r = await sb().storage.from('biblioteca').upload(path, file, { contentType: LIB_MIME[ext] || 'application/octet-stream', upsert: false });
      if (r.error) throw r.error;
      return { path: path };
    },
    get: async function (m) {
      if (!m.path) throw new Error('sin archivo');
      var r = await sb().storage.from('biblioteca').download(m.path); if (r.error) throw r.error; return r.data;
    },
    del: async function (m) {
      if (!m.path) return;
      var r = await sb().storage.from('biblioteca').remove([m.path]); if (r.error) throw r.error;
      if (!r.data || !r.data.length) throw { message: L('Sin permiso para borrar el archivo.', 'No permission to delete the file.') };
    }
  };

  /* ---- búsqueda ---- */
  function libSearch(lib, txt, q, scope, tipo, fmt) {
    var terms = libTerms(q), out = [];
    lib.forEach(function (d) {
      if (tipo && d.tipo !== tipo) return;
      if (fmt && d.ext !== fmt) return;
      if (!terms.length) { out.push({ d: d, score: 0, hits: 0, nameHit: false }); return; }
      var nm = libFold(d.name), body = (scope !== 'name' && txt && txt[d.id]) ? libFold(txt[d.id]) : '', score = 0, hits = 0, nameHit = false, ok = true;
      for (var i = 0; i < terms.length; i++) {
        var inName = scope !== 'content' && nm.indexOf(terms[i]) >= 0, c = body ? libCount(body, terms[i], 99) : 0;
        if (!inName && !c) { ok = false; break; }
        if (inName) { score += 50; nameHit = true; }
        score += c; hits += c;
      }
      if (ok) out.push({ d: d, score: score, hits: hits, nameHit: nameHit });
    });
    out.sort(function (a, b) { return b.score - a.score || (a.d.name < b.d.name ? -1 : 1); });
    return out;
  }
  function libSnippets(text, terms, max) {
    var f = libFold(text), out = [], used = -1e9, pos = [];
    terms.forEach(function (tm) { var k = 0, ix, n = 0; while (n < 40 && (ix = f.indexOf(tm, k)) >= 0) { pos.push(ix); k = ix + tm.length; n++; } });
    pos.sort(function (a, b) { return a - b; });
    for (var i = 0; i < pos.length && out.length < max; i++) {
      if (pos[i] - used < 200) continue;
      var a = Math.max(0, pos[i] - 90), b = Math.min(text.length, pos[i] + 110);
      var page = text.slice(0, pos[i]).split('\f').length;
      out.push({ s: (a > 0 ? '…' : '') + text.slice(a, b).replace(/[\f\n]+/g, ' ') + (b < text.length ? '…' : ''), page: page, paged: text.indexOf('\f') >= 0 });
      used = pos[i];
    }
    return out;
  }
  function libHighlight(text, terms) {
    if (!terms.length) return [text];
    var f = libFold(text), ranges = [], i;
    terms.forEach(function (tm) { var k = 0, ix; while ((ix = f.indexOf(tm, k)) >= 0 && ranges.length < 400) { ranges.push([ix, ix + tm.length]); k = ix + tm.length; } });
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var out = [], cur = 0;
    for (i = 0; i < ranges.length; i++) {
      var r = ranges[i]; if (r[0] < cur) { if (r[1] > cur) { out.push(h('mark', { key: 'm' + i, style: { background: 'rgba(240,165,64,.35)', color: 'inherit', borderRadius: 2, padding: '0 1px' } }, text.slice(cur, r[1]))); cur = r[1]; } continue; }
      if (r[0] > cur) out.push(text.slice(cur, r[0]));
      out.push(h('mark', { key: 'm' + i, style: { background: 'rgba(240,165,64,.35)', color: 'inherit', borderRadius: 2, padding: '0 1px' } }, text.slice(r[0], r[1]))); cur = r[1];
    }
    if (cur < text.length) out.push(text.slice(cur));
    return out;
  }


  function DocsTab(p) {
    var lib = (p.lib || []).filter(function (d) { return d && d.name; });
    var role = window.OPT_ROLE || '';
    var canUp = role === 'admin' || role === 'analista';
    var canDel = role === 'admin';
    var s1 = useState(''), q = s1[0], setQ = s1[1];
    var s2 = useState(''), dq = s2[0], setDq = s2[1];
    var s3 = useState('both'), scope = s3[0], setScope = s3[1];
    var s4 = useState(''), tipoF = s4[0], setTipoF = s4[1];
    var s5 = useState(''), fmtF = s5[0], setFmtF = s5[1];
    var s6 = useState({}), sel = s6[0], setSel = s6[1];
    var s7 = useState(null), prevId = s7[0], setPrevId = s7[1];
    var s8 = useState([]), ups = s8[0], setUps = s8[1];
    var s9 = useState('otros'), uTipo = s9[0], setUTipo = s9[1];
    var s10 = useState({}), txt = s10[0], setTxt = s10[1];
    var s11 = useState(false), needTxt = s11[0], setNeedTxt = s11[1];
    var s12 = useState(40), shown = s12[0], setShown = s12[1];
    var s13 = useState('orig'), pView = s13[0], setPView = s13[1];
    var s14 = useState({ url: '', err: '', busy: false }), pBlob = s14[0], setPBlob = s14[1];
    var s15 = useState(false), drag = s15[0], setDrag = s15[1];

    useEffect(function () { var t = setTimeout(function () { setDq(q); setShown(40); }, 180); return function () { clearTimeout(t); }; }, [q]);
    useEffect(function () { if ((dq && scope !== 'name') || prevId) setNeedTxt(true); }, [dq, scope, prevId]);
    useEffect(function () {
      if (!needTxt) return;
      var alive = true, ch = null, tm = null;
      function load() {
        sb().from('app_docs').select('doc_id,data').eq('collection', 'docstext').then(function (r) {
          if (!alive || r.error) return;
          var m = {}; (r.data || []).forEach(function (x) { m[x.doc_id] = (x.data || {}).text || ''; });
          setTxt(m);
        });
      }
      load();
      try { ch = sb().channel('docstext_' + Math.random().toString(36).slice(2)).on('postgres_changes', { event: '*', schema: 'public', table: 'app_docs', filter: 'collection=eq.docstext' }, function () { clearTimeout(tm); tm = setTimeout(load, 400); }).subscribe(); } catch (e) { }
      return function () { alive = false; clearTimeout(tm); if (ch) { try { sb().removeChannel(ch); } catch (e) { } } };
    }, [needTxt]);

    var terms = useMemo(function () { return libTerms(dq); }, [dq]);
    var results = useMemo(function () { return libSearch(lib, txt, dq, scope, tipoF, fmtF); }, [lib, txt, dq, scope, tipoF, fmtF]);
    var vis = results.slice(0, shown);
    var snips = useMemo(function () {
      var o = {}; if (!terms.length || scope === 'name') return o;
      results.slice(0, shown).forEach(function (r) { if (txt[r.d.id]) o[r.d.id] = libSnippets(txt[r.d.id], terms, 2); });
      return o;
    }, [results, shown, terms, txt, scope]);
    var byId = {}; lib.forEach(function (d) { byId[d.id] = d; });
    var selIds = Object.keys(sel).filter(function (k) { return sel[k] && byId[k]; });
    var totalSize = lib.reduce(function (a, d) { return a + (d.size || 0); }, 0);
    var loadingTxt = !!dq && scope !== 'name' && lib.some(function (d) { return !d.noText && txt[d.id] === undefined; });

    var doUpload = async function (files) {
      files = [].slice.call(files || []); if (!files.length) return;
      var cur = files.map(function (f) { return { name: f.name, st: 'wait', msg: '' }; }); setUps(cur);
      var mark = function (i, st, msg) { cur = cur.map(function (x, k) { return k === i ? { name: x.name, st: st, msg: msg || '' } : x; }); setUps(cur); };
      for (var i = 0; i < files.length; i++) {
        var f = files[i], ext = libExt(f.name);
        if (['pdf', 'docx', 'xlsx', 'pptx'].indexOf(ext) < 0) { mark(i, 'err', L('Formato no admitido: usa PDF, DOCX, XLSX o PPTX.', 'Unsupported format: use PDF, DOCX, XLSX or PPTX.')); continue; }
        if (f.size > LIB_MAX_BYTES) { mark(i, 'err', L('Supera el máximo de 45 MB.', 'Exceeds the 45 MB limit.')); continue; }
        if (lib.some(function (x) { return x.name === f.name && x.size === f.size; })) { mark(i, 'skip', L('Ya está en Documentos.', 'Already in Documents.')); continue; }
        var id = uid();
        try {
          mark(i, 'run', L('Leyendo e indexando…', 'Reading and indexing…'));
          var buf = await f.arrayBuffer(), ex = { text: '', pages: null };
          try { ex = await libExtract(buf, ext); } catch (e) { ex = { text: '', pages: null }; }
          mark(i, 'run', L('Subiendo…', 'Uploading…'));
          var st = await LIBST.put(f, id, ext);
          var usr = window.OPT_USER || {};
          var meta = { name: f.name, ext: ext, size: f.size, tipo: uTipo, by: usr.disp || usr.email || '', date: today(), pages: ex.pages, chars: ex.text.length, noText: !(ex.text && ex.text.replace(/\s/g, '').length > 30) };
          if (st.path) meta.path = st.path; if (st.assetId) meta.assetId = st.assetId;
          var ok = await p.save('docs', id, meta);
          if (ok && ex.text) await p.save('docstext', id, { text: ex.text });
          if (!ok) mark(i, 'err', L('No se pudo registrar el documento.', 'Could not register the document.'));
          else mark(i, 'ok', meta.noText ? L('Subido, pero sin texto legible (¿escaneado?): se busca solo por nombre.', 'Uploaded, but no readable text (scanned?): searchable by name only.') : '');
        } catch (e) { mark(i, 'err', (e && e.message) || L('Error al subir.', 'Upload error.')); }
      }
    };
    var dlOne = function (d) { p.runExport(async function () { var b = await LIBST.get(d); await saveFile(d.name, b); }, L('Descargado: ', 'Downloaded: ') + d.name); };
    var dlZip = function () {
      p.runExport(async function () {
        var files = [], used = {};
        for (var i = 0; i < selIds.length; i++) {
          var d = byId[selIds[i]], b = await LIBST.get(d), u8 = new Uint8Array(await b.arrayBuffer()), nm = d.name;
          if (used[nm]) { nm = nm.replace(/(\.[^.]*)?$/, ' (' + used[nm] + ')$1'); used[d.name]++; } else used[nm] = 1;
          files.push({ name: nm, data: u8 });
        }
        await saveFile('Documentos_' + fdate() + '.zip', libZipBuild(files));
      }, selIds.length + L(' documento(s) en un ZIP.', ' document(s) in a ZIP.'));
    };
    var delOne = async function (d) {
      try { await LIBST.del(d); } catch (e) { p.toast(L('No se pudo borrar el archivo: ', 'Could not delete the file: ') + ((e && e.message) || '')); return; }
      await p.remove('docs', d.id); await p.remove('docstext', d.id);
      setSel(function (s) { var n = Object.assign({}, s); delete n[d.id]; return n; });
      if (prevId === d.id) setPrevId(null);
    };
    var openPrev = function (d) { setPView(d.ext === 'pdf' ? 'orig' : 'text'); setPrevId(d.id); };
    var pd = prevId ? byId[prevId] : null;
    useEffect(function () {
      if (!pd || pd.ext !== 'pdf') { setPBlob({ url: '', err: '', busy: false }); return; }
      var alive = true, url = '';
      setPBlob({ url: '', err: '', busy: true });
      LIBST.get(pd).then(function (b) { if (!alive) return; url = URL.createObjectURL(new Blob([b], { type: 'application/pdf' })); setPBlob({ url: url, err: '', busy: false }); })
        .catch(function (e) { if (alive) setPBlob({ url: '', err: (e && e.message) || 'error', busy: false }); });
      return function () { alive = false; if (url) { try { URL.revokeObjectURL(url); } catch (e) { } } };
    }, [prevId]);

    var stColor = { ok: 'var(--good)', err: 'var(--crit)', skip: 'var(--warn)', run: 'var(--info)', wait: 'var(--muted)' };
    var fmtOpts = [['', L('Todos los formatos', 'All formats')], ['pdf', 'PDF'], ['docx', 'Word (DOCX)'], ['xlsx', 'Excel (XLSX)'], ['pptx', 'PowerPoint (PPTX)']];
    var tipoOpts = [['', L('Todos los tipos', 'All types')]].concat(docTipos());

    var prevPanel = null;
    if (pd) {
      var ptext = txt[pd.id], pages = ptext ? ptext.split('\f') : [], pageEls = [];
      if (ptext !== undefined) {
        var idxs = pages.map(function (_, i) { return i; });
        if (terms.length) idxs = idxs.filter(function (i) { var f = libFold(pages[i]); return terms.some(function (t) { return f.indexOf(t) >= 0; }); });
        idxs.slice(0, 40).forEach(function (i) {
          pageEls.push(h('div', { key: 'pg' + i, className: 'panel2 p-3', style: { marginBottom: 8 } },
            pages.length > 1 ? h('div', { className: 'eyebrow', style: { marginBottom: 4 } }, L('Página ', 'Page ') + (i + 1)) : null,
            h('div', { style: { whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.55, overflowWrap: 'anywhere' } }, libHighlight(pages[i], terms))));
        });
        if (!pageEls.length) pageEls.push(h('div', { key: 'none', className: 'hint' }, terms.length ? L('Las palabras buscadas no aparecen en este documento.', 'The searched words do not appear in this document.') : L('Este documento no tiene texto legible.', 'This document has no readable text.')));
        else if (idxs.length > 40) pageEls.push(h('div', { key: 'more', className: 'hint' }, L('Mostrando 40 de ', 'Showing 40 of ') + idxs.length + L(' páginas.', ' pages.')));
      }
      prevPanel = h('div', { role: 'dialog', 'aria-modal': 'true', 'aria-label': pd.name, style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 60, background: 'rgba(4,8,10,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }, onClick: function (e) { if (e.target === e.currentTarget) setPrevId(null); } },
        h('div', { className: 'panel', style: { width: 'min(1100px,100%)', height: 'min(90vh,920px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' } },
          h('div', { className: 'flex flex-wrap items-center gap-2', style: { padding: '10px 12px', borderBottom: '1px solid var(--line)' } },
            h('div', { style: { flex: '1 1 220px', minWidth: 0, fontWeight: 600, overflowWrap: 'anywhere' } }, pd.name),
            h('div', { className: 'seg' }, h('button', { type: 'button', className: 'btn', 'aria-pressed': pView === 'orig', onClick: function () { setPView('orig'); } }, L('Original', 'Original')), h('button', { type: 'button', className: 'btn', 'aria-pressed': pView === 'text', onClick: function () { setPView('text'); } }, L('Texto', 'Text'))),
            h('button', { type: 'button', className: 'btn2', onClick: function () { dlOne(pd); } }, h(Icon, { n: 'download', s: 14 }), L('Descargar', 'Download')),
            h('button', { type: 'button', className: 'btn2', onClick: function () { setPrevId(null); } }, h(Icon, { n: 'x', s: 14 }), L('Cerrar', 'Close'))),
          h('div', { style: { flex: 1, minHeight: 0, overflow: 'auto', padding: pView === 'text' ? 12 : 0, display: 'flex', flexDirection: 'column' } },
            pView === 'orig'
              ? (pd.ext !== 'pdf' ? h('div', { className: 'hint', style: { padding: 16 } }, L('La vista original solo está disponible para PDF. Usa "Texto" para ver el contenido o descarga el archivo.', 'The original view is only available for PDF. Use "Text" to read the content or download the file.'))
                : pBlob.url ? h('iframe', { src: pBlob.url, title: pd.name, style: { flex: 1, width: '100%', border: 0, background: '#fff', minHeight: 300 } })
                : h('div', { className: 'hint', style: { padding: 16 } }, pBlob.err ? L('No se pudo abrir el PDF: ', 'Could not open the PDF: ') + pBlob.err : L('Cargando PDF…', 'Loading PDF…')))
              : (ptext === undefined ? h('div', { className: 'hint' }, pd.noText ? L('Este documento no tiene texto legible.', 'This document has no readable text.') : L('Cargando texto…', 'Loading text…')) : pageEls)),
          pView === 'orig' && pBlob.url ? h('div', { className: 'hint', style: { padding: '6px 12px', margin: 0, borderTop: '1px solid var(--line)' } }, L('Si tu celular no muestra el PDF aquí, ', 'If your phone does not show the PDF here, '), h('a', { href: pBlob.url, target: '_blank', rel: 'noopener', style: { color: 'var(--accent)' } }, L('ábrelo en una pestaña nueva', 'open it in a new tab')), '.') : null));
    }

    return h('div', { className: 'flex flex-col gap-4' },
      h('section', { className: 'panel p-4 flex flex-col gap-3' },
        h('div', { className: 'flex flex-wrap items-baseline justify-between gap-2' },
          h('div', { className: 'eyebrow' }, L('Documentos corporativos', 'Corporate documents')),
          h('div', { className: 'hint', style: { margin: 0 } }, nf(lib.length) + L(' documentos · ', ' documents · ') + libSize(totalSize))),
        canUp ? h('div', { className: 'flex flex-col gap-3', onDragOver: function (e) { e.preventDefault(); setDrag(true); }, onDragLeave: function () { setDrag(false); }, onDrop: function (e) { e.preventDefault(); setDrag(false); doUpload(e.dataTransfer && e.dataTransfer.files); }, style: { border: '1px dashed ' + (drag ? 'var(--accent)' : 'var(--line)'), borderRadius: 8, padding: 12 } },
          h('div', { className: 'grid gap-3 items-end', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' } },
            h(SelIn, { id: 'doc-utipo', label: L('Tipo de documento (para los archivos que subas ahora)', 'Document type (for the files you upload now)'), value: uTipo, onChange: setUTipo, options: docTipos() }),
            h('div', null, h('label', { className: 'btn2 prim', style: { cursor: 'pointer', display: 'inline-flex' } }, h(Icon, { n: 'upload', s: 14 }), L('Elegir archivos', 'Choose files'),
              h('input', { id: 'doc-file', type: 'file', multiple: true, accept: '.pdf,.docx,.xlsx,.pptx', style: { display: 'none' }, onChange: function (e) { var fl = e.target.files; doUpload(fl); try { e.target.value = ''; } catch (er) { } } })))),
          h('div', { className: 'hint', style: { margin: 0 } }, L('También puedes arrastrar los archivos aquí. Formatos: PDF, Word (.docx), Excel (.xlsx) y PowerPoint (.pptx), hasta 45 MB cada uno. Se lee el texto de cada documento para poder buscar dentro de él.', 'You can also drag files here. Formats: PDF, Word (.docx), Excel (.xlsx) and PowerPoint (.pptx), up to 45 MB each. The text of each document is read so you can search inside it.')))
          : h('div', { className: 'hint', style: { margin: 0 } }, L('Tu rol permite buscar, ver y descargar documentos.', 'Your role lets you search, preview and download documents.')),
        ups.length ? h('div', { className: 'flex flex-col gap-1' }, ups.map(function (u, i) { return h('div', { key: i, className: 'hint', style: { margin: 0, color: stColor[u.st] } }, (u.st === 'ok' ? '✔ ' : u.st === 'err' ? '✖ ' : u.st === 'skip' ? '• ' : '… ') + u.name + (u.msg ? ' — ' + u.msg : '')); })) : null),
      h('section', { className: 'panel p-4 flex flex-col gap-3' },
        h('div', { className: 'grid gap-3 items-end', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' } },
          h('div', { style: { gridColumn: 'span 2', minWidth: 0 } }, h(TxtIn, { id: 'doc-q', label: L('Buscar', 'Search'), value: q, ph: L('palabras clave, nombre o frase entre comillas…', 'keywords, file name or "quoted phrase"…'), onChange: setQ })),
          h(SelIn, { id: 'doc-scope', label: L('Buscar en', 'Search in'), value: scope, onChange: setScope, options: [['both', L('Nombre y contenido', 'Name and content')], ['name', L('Solo el nombre del archivo', 'File name only')], ['content', L('Solo el contenido', 'Content only')]] }),
          h(SelIn, { id: 'doc-tipo', label: L('Tipo', 'Type'), value: tipoF, onChange: setTipoF, options: tipoOpts }),
          h(SelIn, { id: 'doc-fmt', label: L('Formato', 'Format'), value: fmtF, onChange: setFmtF, options: fmtOpts })),
        h('div', { className: 'hint', style: { margin: 0 } }, L('Con varias palabras, el documento debe contener todas. No distingue mayúsculas ni acentos.', 'With several words, the document must contain all of them. Case and accents are ignored.'), loadingTxt ? h('span', { style: { color: 'var(--info)' } }, ' ' + L('Cargando el contenido de los documentos…', 'Loading document content…')) : null)),
      h('section', { className: 'flex flex-wrap items-center justify-between gap-2' },
        h('div', { className: 'mono', style: { fontSize: 13 } }, nf(results.length) + (dq || tipoF || fmtF ? L(' resultado(s)', ' result(s)') : L(' documento(s)', ' document(s)')) + (selIds.length ? ' · ' + selIds.length + L(' seleccionado(s)', ' selected') : '')),
        h('div', { className: 'flex flex-wrap items-center gap-2' },
          h('button', { type: 'button', className: 'btn2', disabled: !results.length, onClick: function () { setSel(function (s) { var n = Object.assign({}, s); results.forEach(function (r) { n[r.d.id] = true; }); return n; }); } }, L('Seleccionar todos los resultados', 'Select all results')),
          h('button', { type: 'button', className: 'btn2', disabled: !selIds.length, onClick: function () { setSel({}); } }, L('Limpiar selección', 'Clear selection')),
          h('button', { type: 'button', className: 'btn2 prim', disabled: !selIds.length, onClick: dlZip }, h(Icon, { n: 'download', s: 14 }), L('Descargar ZIP', 'Download ZIP') + (selIds.length ? ' (' + selIds.length + ')' : '')))),
      !results.length ? h('div', { className: 'panel p-4 hint' }, lib.length ? L('Ningún documento coincide con la búsqueda.', 'No document matches the search.') : (canUp ? L('Aún no hay documentos. Sube el primero arriba.', 'There are no documents yet. Upload the first one above.') : L('Aún no hay documentos.', 'There are no documents yet.')))
        : h('div', { className: 'flex flex-col gap-2' }, vis.map(function (r) {
          var d = r.d, sn = snips[d.id] || [];
          return h('div', { key: d.id, className: 'panel2 p-3', style: { display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' } },
            h('input', { type: 'checkbox', checked: !!sel[d.id], 'aria-label': L('Seleccionar ', 'Select ') + d.name, style: { marginTop: 5 }, onChange: function (e) { var on = e.target.checked; setSel(function (s) { var n = Object.assign({}, s); n[d.id] = on; return n; }); } }),
            h('div', { style: { flex: '1 1 260px', minWidth: 0 } },
              h('div', { className: 'flex flex-wrap items-center gap-2' },
                h('button', { type: 'button', className: 'lnk', style: { textAlign: 'left', overflowWrap: 'anywhere', fontWeight: 600 }, onClick: function () { openPrev(d); } }, scope === 'content' ? d.name : libHighlight(d.name, terms)),
                canUp ? h('select', { 'aria-label': L('Tipo de documento', 'Document type'), className: 'in', style: { width: 'auto', padding: '2px 6px', fontSize: 12 }, value: d.tipo || 'otros', onChange: function (e) { p.save('docs', d.id, Object.assign({}, d, { tipo: e.target.value })); } }, docTipos().map(function (t) { return h('option', { key: t[0], value: t[0] }, t[1]); })) : h(Chip, { color: 'var(--info)' }, docTipoName(d.tipo)),
                h(Chip, null, (d.ext || '').toUpperCase()),
                r.hits ? h(Chip, { color: 'var(--accent)' }, r.hits + (r.hits >= 99 ? '+' : '') + L(' coincidencias', ' matches')) : null,
                d.noText ? h(Chip, { color: 'var(--warn)' }, L('sin texto', 'no text')) : null),
              h('div', { className: 'hint', style: { margin: '2px 0 0' } }, libSize(d.size || 0) + (d.pages ? ' · ' + d.pages + L(' pág.', ' pp.') : '') + (d.date ? ' · ' + d.date : '') + (d.by ? ' · ' + d.by : '')),
              sn.map(function (s, i) { return h('div', { key: i, style: { marginTop: 6, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, overflowWrap: 'anywhere' } }, s.paged ? h('span', { className: 'mono', style: { marginRight: 6 } }, L('p. ', 'p. ') + s.page) : null, libHighlight(s.s, terms)); })),
            h('div', { className: 'flex flex-wrap gap-2' },
              h('button', { type: 'button', className: 'btn2', onClick: function () { openPrev(d); } }, h(Icon, { n: 'file', s: 14 }), L('Vista previa', 'Preview')),
              h('button', { type: 'button', className: 'btn2', onClick: function () { dlOne(d); } }, h(Icon, { n: 'download', s: 14 }), L('Descargar', 'Download')),
              canDel ? h(ConfirmBtn, { label: L('Eliminar', 'Delete'), confirmLabel: L('Confirmar', 'Confirm'), onConfirm: function () { delOne(d); } }) : null));
        })),
      results.length > shown ? h('div', null, h('button', { type: 'button', className: 'btn2', onClick: function () { setShown(shown + 40); } }, L('Mostrar más (', 'Show more (') + (results.length - shown) + ')')) : null,
      prevPanel);
  }

  /* ---- estilos (con las variables del tema) ---- */
  var CSS = '.dc{color:var(--fg);font-size:14px}.dc *{box-sizing:border-box}.dc button,.dc input,.dc select{font:inherit}' +
    '.dc input[type=checkbox]{width:auto;flex:none;margin-top:5px;accent-color:var(--accent)}.dc label{margin-bottom:4px}' +
    '.dc .panel{background:var(--panel);border:1px solid var(--line);border-radius:10px}.dc .panel2{background:var(--panel2);border:1px solid var(--line);border-radius:8px}' +
    '.dc .eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:500}.dc .lbl{font-size:13px;font-weight:500;display:block;margin-bottom:4px}' +
    '.dc .hint{font-size:11.5px;color:var(--muted);margin-top:4px}.dc .nf{display:flex;flex-direction:column}' +
    '.dc .in{width:100%;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:6px;padding:6px 9px;font-size:13px;min-width:0}' +
    '.dc .in:focus-visible,.dc .btn:focus-visible,.dc .btn2:focus-visible,.dc .lnk:focus-visible{outline:2px solid var(--accent);outline-offset:2px}' +
    '.dc .seg{display:inline-flex;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:3px;gap:2px}.dc .btn{border:0;background:transparent;color:var(--muted);font-weight:600;font-size:13px;padding:6px 12px;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}' +
    '.dc .btn[aria-pressed=true]{background:var(--accent);color:var(--on-accent,#1a1205)}.dc .btn2{display:inline-flex;align-items:center;gap:6px;background:var(--panel2);color:var(--fg);border:1px solid var(--line);border-radius:6px;padding:6px 11px;font-size:13px;font-weight:500;cursor:pointer}' +
    '.dc .btn2.prim{background:var(--accent);color:var(--on-accent,#1a1205);border-color:var(--accent);font-weight:600}.dc .btn2.crit{background:var(--crit);border-color:var(--crit);color:var(--on-crit,#1a0705);font-weight:600}.dc .btn2:disabled{opacity:.5;cursor:not-allowed}' +
    '.dc .pill{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;padding:2px 9px;border-radius:999px;border:1px solid var(--sc);color:var(--sc);letter-spacing:.03em;white-space:nowrap}' +
    '.dc .lnk{background:none;border:0;color:var(--accent);font-weight:600;cursor:pointer;padding:0;text-align:left;font-size:inherit}.dc .lnk:hover{text-decoration:underline}' +
    '.dc .mono{font-family:"IBM Plex Mono",ui-monospace,monospace;font-variant-numeric:tabular-nums}' +
    '.dc .flex{display:flex}.dc .flex-col{flex-direction:column}.dc .flex-wrap{flex-wrap:wrap}.dc .items-center{align-items:center}.dc .items-baseline{align-items:baseline}.dc .items-end{align-items:flex-end}.dc .justify-between{justify-content:space-between}.dc .grid{display:grid}' +
    '.dc .gap-1{gap:4px}.dc .gap-2{gap:8px}.dc .gap-3{gap:12px}.dc .gap-4{gap:16px}.dc .p-3{padding:12px}.dc .p-4{padding:16px}' +
    '.dc-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:56px;max-width:min(560px,calc(100% - 32px));background:var(--panel2);color:var(--fg);border:1px solid var(--accent);border-radius:10px;padding:10px 12px;display:flex;gap:12px;align-items:center;z-index:10001;box-shadow:0 6px 24px rgba(0,0,0,.35)}';
  (function () { if (document.getElementById('dc-css')) return; var s = document.createElement('style'); s.id = 'dc-css'; s.textContent = CSS; document.head.appendChild(s); })();

  /* ---- contenedor: carga docs y ofrece guardar/borrar ---- */
  function DocsTabRoot(p) {
    DLANG = p.lang === 'en' ? 'en' : 'es';
    var s1 = useState([]), lib = s1[0], setLib = s1[1];
    var s2 = useState(''), msg = s2[0], setMsg = s2[1];
    var s3 = useState(true), loading = s3[0], setLoading = s3[1];
    useEffect(function () { if (!msg) return; var t = setTimeout(function () { setMsg(''); }, 6000); return function () { clearTimeout(t); }; }, [msg]);
    useEffect(function () {
      var alive = true, ch = null, tm = null;
      function load() {
        sb().from('app_docs').select('doc_id,data').eq('collection', 'docs').then(function (r) {
          if (!alive) return;
          setLoading(false);
          if (r.error) { setMsg(L('No se pudo leer Documentos: ', 'Could not read Documents: ') + r.error.message); return; }
          setLib((r.data || []).map(function (x) { return Object.assign({ id: x.doc_id }, x.data); }));
        });
      }
      load();
      try { ch = sb().channel('docs_' + Math.random().toString(36).slice(2)).on('postgres_changes', { event: '*', schema: 'public', table: 'app_docs', filter: 'collection=eq.docs' }, function () { clearTimeout(tm); tm = setTimeout(load, 250); }).subscribe(); } catch (e) { }
      return function () { alive = false; clearTimeout(tm); if (ch) { try { sb().removeChannel(ch); } catch (e) { } } };
    }, []);
    var me = window.OPT_USER || {};
    var save = async function (coll, id, doc) {
      var src = Object.assign({}, doc); delete src.id;
      var r = await sb().from('app_docs').upsert({ collection: coll, doc_id: String(id), data: JSON.parse(JSON.stringify(src)), updated_by: me.id || null }, { onConflict: 'collection,doc_id' });
      if (r.error) { setMsg(L('No se pudo guardar: ', 'Could not save: ') + (r.error.code === '42501' ? L('sin permiso.', 'no permission.') : r.error.message)); return false; }
      if (coll === 'docs') setLib(function (a) { var f = false, o = a.map(function (x) { if (x.id === id) { f = true; return Object.assign({ id: id }, src); } return x; }); if (!f) o.push(Object.assign({ id: id }, src)); return o; });
      return true;
    };
    var remove = async function (coll, id) {
      var r = await sb().from('app_docs').delete().eq('collection', coll).eq('doc_id', String(id)).select('doc_id');
      if (r.error || !r.data || !r.data.length) { setMsg(L('No se pudo eliminar (sin permiso).', 'Could not delete (no permission).')); return false; }
      if (coll === 'docs') setLib(function (a) { return a.filter(function (x) { return x.id !== id; }); });
      return true;
    };
    var runExport = async function (fn, okMsg) { try { await fn(); if (okMsg) setMsg(okMsg); } catch (e) { setMsg(L('No se pudo completar: ', 'Could not complete: ') + ((e && e.message) || '')); } };
    return h('div', { className: 'dc' },
      loading ? h('div', { className: 'panel p-4 hint' }, L('Cargando documentos…', 'Loading documents…')) : h(DocsTab, { lib: lib, save: save, remove: remove, runExport: runExport, toast: setMsg }),
      msg ? h('div', { className: 'dc-toast', role: 'status' }, msg, h('button', { type: 'button', className: 'btn2', onClick: function () { setMsg(''); } }, h(Icon, { n: 'check', s: 14 }), 'OK')) : null);
  }

  window.DOCS = { Tab: DocsTabRoot, tipos: docTipos };
})();
