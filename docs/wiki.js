(function () {
  'use strict';

  var stored = localStorage.getItem('subscribemanager-lang');
  var nav = (navigator.language || '').toLowerCase();
  var lang = stored || (nav.indexOf('zh') === 0 ? 'zh' : 'en');

  var sidebar = document.getElementById('sidebar');
  var menuBtn = document.getElementById('menuBtn');

  function pageIdFromHref(href) {
    if (!href) return '';
    var hash = href.indexOf('#');
    return hash >= 0 ? href.slice(hash + 1) : '';
  }
  function query(sel) { return document.querySelectorAll(sel); }

  function applyLang(l) {
    lang = l;
    document.documentElement.lang = (l === 'zh') ? 'zh-CN' : 'en';

    query('[data-zh]').forEach(function (el) {
      if (el.childElementCount > 0) return;
      var v = el.getAttribute('data-' + l);
      if (v !== null && v !== '') el.textContent = v;
    });

    query('.nav-group').forEach(function (g) {
      var lbl = g.getAttribute('data-label-' + l);
      if (lbl) g.setAttribute('data-label', lbl);
    });

    query('.lang-btn').forEach(function (b) {
      b.textContent = (l === 'zh') ? 'EN' : '中文';
    });

    localStorage.setItem('subscribemanager-lang', l);
  }

  function showPage(id) {
    if (!id || !document.getElementById(id)) {
      id = 'intro';
    }
    query('main.content > article.page').forEach(function (p) {
      var on = (p.id === id);
      p.classList.toggle('active', on);
      p.style.display = on ? 'block' : 'none';
    });
    query('.sidebar-nav .nav-item').forEach(function (n) {
      n.classList.toggle('active', pageIdFromHref(n.getAttribute('href')) === id);
    });
    if (location.hash !== '#' + id) {
      history.replaceState(null, '', '#' + id);
    }
    if (sidebar) sidebar.classList.remove('open');
    window.scrollTo(0, 0);
  }

  query('.lang-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyLang(lang === 'zh' ? 'en' : 'zh');
    });
  });

  query('.sidebar-nav .nav-item').forEach(function (item) {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      showPage(pageIdFromHref(item.getAttribute('href')));
    });
  });

  window.addEventListener('hashchange', function () {
    showPage(pageIdFromHref(location.hash));
  });

  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', function () {
      sidebar.classList.toggle('open');
    });
  }

  showPage(pageIdFromHref(location.hash));
  applyLang(lang);
})();
