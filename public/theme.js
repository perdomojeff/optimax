/* StrataFlow · selector de tema (claro / oscuro). Se carga en <head> para que no haya parpadeo.
   Guarda la elección en este navegador. Por defecto: oscuro. */
(function () {
  var K = 'sf_theme', d = document.documentElement;
  function get() { try { var v = localStorage.getItem(K); if (v === 'light' || v === 'dark') return v; } catch (e) { } return 'dark'; }
  function apply(t) {
    d.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', t === 'light' ? '#f4f8fa' : '#021b31');
  }
  function set(t) { try { localStorage.setItem(K, t); } catch (e) { } apply(t); try { window.dispatchEvent(new Event('sf-theme')); } catch (e) { } }
  window.SFTheme = { get: get, set: set, toggle: function () { set(get() === 'dark' ? 'light' : 'dark'); } };
  apply(get());
})();
