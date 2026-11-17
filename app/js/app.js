(function () {
  'use strict';

  const views = document.querySelectorAll('.view');
  const navBtns = document.querySelectorAll('.nav-btn[data-view]');
  const viewsEl = document.getElementById('views');
  const notification = document.getElementById('notification');
  const toolClose = document.getElementById('toolClose');
  const toolHint = document.getElementById('toolHint');
  let hintTimer = null;

  function setView(name, updateHash = true) {
    const target = document.getElementById('view-' + name) || document.getElementById('view-home');
    views.forEach(v => v.classList.toggle('active', v === target));
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.view === target.dataset.view));
    target.querySelectorAll('iframe[data-src]').forEach(f => {
      if (!f.src || f.src === 'about:blank') f.src = f.dataset.src;
    });
    if (updateHash && location.hash !== '#' + target.dataset.view) {
      history.replaceState(null, '', '#' + target.dataset.view);
    }
  }

  function openTool(name) {
    const tool = document.getElementById('tool-' + name);
    if (!tool) return;
    document.querySelectorAll('.tool.open').forEach(t => t.classList.remove('open'));
    tool.classList.add('open');
    document.body.classList.add('tool-open');
    tool.scrollTop = 0;
    toolClose.style.display = 'block';
    toolHint.classList.add('show');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => toolHint.classList.remove('show'), 3000);
    window.dispatchEvent(new Event('resize'));
  }

  function closeTool() {
    document.querySelectorAll('.tool.open').forEach(t => t.classList.remove('open'));
    document.body.classList.remove('tool-open');
    toolClose.style.display = 'none';
    toolHint.classList.remove('show');
  }

  window.FacetTools = { open: openTool, close: closeTool };

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => blurSwap(btn.dataset.view));
  });

  function blurSwap(name) {
    if (document.getElementById('view-' + name).classList.contains('active')) {
      setView(name);
      return;
    }
    viewsEl.classList.add('blurred');
    setTimeout(() => {
      setView(name);
      viewsEl.classList.remove('blurred');
    }, 180);
  }

  window.addEventListener('hashchange', () => applyHash());
  function applyHash() {
    const h = location.hash.slice(1);
    if (h.startsWith('tool-')) { setView('home', false); openTool(h.slice(5)); }
    else if (h) { closeTool(); setView(h); }
  }

  function getActiveGameFrame() {
    const frames = document.querySelectorAll('#view-home .fullscreen-frame');
    for (const f of frames) {
      if (f.style.display === 'block' || getComputedStyle(f).display !== 'none') return f;
    }
    return null;
  }

  document.getElementById('appFullscreenBtn').addEventListener('click', () => {
    if (!document.fullscreenElement) {
      const game = getActiveGameFrame();
      const target = game || document.documentElement;
      (target.requestFullscreen ? target.requestFullscreen() : document.documentElement.requestFullscreen())
        .catch(err => showNotification('Fullscreen failed: ' + err.message));
    } else {
      document.exitFullscreen();
    }
  });

  const sidebarMenuBtn = document.getElementById('sidebarMenuBtn');
  if (sidebarMenuBtn) {
    sidebarMenuBtn.addEventListener('click', () => {
      const modal = document.getElementById('popupModal');
      if (modal) modal.style.display = 'flex';
    });
  }

  const exitFullscreenBtn = document.getElementById('exitFullscreenBtn');
  function syncExitFullscreenBtn() {
    if (!exitFullscreenBtn) return;
    exitFullscreenBtn.classList.toggle('show', !!document.fullscreenElement);
  }
  if (exitFullscreenBtn) {
    exitFullscreenBtn.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    });
  }
  document.addEventListener('fullscreenchange', syncExitFullscreenBtn);
  syncExitFullscreenBtn();

  toolClose.addEventListener('click', closeTool);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeTool();
  });

  function showNotification(message) {
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 3000);
  }
  window.FacetNotify = showNotification;

  if (location.hash) applyHash();
  else setView('home');
})();
