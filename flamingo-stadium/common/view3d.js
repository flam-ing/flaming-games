/* Optional 3D presentation; the original Game shell owns every rule and input. */
(function () {
  const moduleURL = new URL('stadium3d.js', document.currentScript.src).href;
  const names = { splash: '스플래시', run: '허들 달리기', topsy: '링아웃' };
  window.STADIUM_3D = { create(kind, getGame) {
    const wrap = document.querySelector('.wrap');
    wrap.classList.add('stadium-stage');
    const top = document.createElement('header');
    top.className = 'stage-header';
    top.innerHTML = `<a href="../index.html" class="club-logo">🦩 <span>FLAMINGO<br><b>STADIUM</b></span></a><div class="stage-title"><span>MINIGAME CLUB / 3D EDITION</span><h1>${names[kind]}</h1></div><a class="all-games" href="../../index.html">Flaming Games ↗</a>`;
    wrap.prepend(top);
    const controls = document.createElement('div');
    controls.className = 'stage-controls';
    controls.innerHTML = '<div class="stage-mode"><span class="mode-status" role="status">경기장 준비 중…</span><button type="button" class="view-toggle" disabled>3D 준비 중</button></div><div class="stage-actions"><label>플레이어 <select aria-label="사람 플레이어 수"><option value="1">1명 + CPU 3</option><option value="2">2명 + CPU 2</option><option value="3">3명 + CPU 1</option><option value="4">4명 함께</option></select></label><button type="button" class="keys-button">키 설정</button><button type="button" class="start-button">경기 시작 ↗</button></div>';
    document.getElementById('game').after(controls);
    const toggle = controls.querySelector('.view-toggle');
    const status = controls.querySelector('.mode-status');
    const start = controls.querySelector('.start-button');
    const setup = controls.querySelector('.keys-button');
    const select = controls.querySelector('select');
    const keyEvent = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
    const press = code => { keyEvent(code, true); setTimeout(() => keyEvent(code, false), 90); };
    const touch = document.createElement('div');
    touch.className = 'touch-controls';
    touch.setAttribute('aria-label', '1P 터치 조작');
    const actions = kind === 'topsy' ? [['left', '←'], ['up', '↑'], ['down', '↓'], ['right', '→'], ['a', 'A · 회전']] : kind === 'run' ? [['up', '↑ · 점프'], ['a', 'A · 달리기']] : [['a', 'A · 꾹 눌렀다 떼기']];
    const held = new Map();
    actions.forEach(([action, label]) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
      b.addEventListener('pointerdown', event => {
        event.preventDefault(); if (getGame().state() !== 'play') return;
        b.setPointerCapture(event.pointerId);
        const code = STADIUM.slots()[0].keys[action]; held.set(event.pointerId, code); keyEvent(code, true); b.classList.add('held');
      });
      const release = event => { const code = held.get(event.pointerId); if (code) keyEvent(code, false); held.delete(event.pointerId); b.classList.remove('held'); };
      b.addEventListener('pointerup', release); b.addEventListener('pointercancel', release); b.addEventListener('lostpointercapture', release);
      touch.append(b);
    });
    controls.after(touch);
    window.addEventListener('blur', () => { held.forEach(code => keyEvent(code, false)); held.clear(); touch.querySelectorAll('.held').forEach(b => b.classList.remove('held')); });
    // Form keyboard navigation must not also trigger the canvas shortcuts.
    [controls, touch].forEach(el => el.addEventListener('keydown', event => event.stopPropagation()));
    [controls, touch].forEach(el => el.addEventListener('keyup', event => event.stopPropagation()));
    start.addEventListener('click', () => { press(getGame().state() === 'setup' ? 'Escape' : 'Space'); start.blur(); });
    setup.addEventListener('click', () => { press(getGame().state() === 'setup' ? 'Escape' : 'KeyK'); setup.blur(); });
    select.addEventListener('change', () => { press('Digit' + select.value); select.blur(); });
    let preferred = '3d';
    try { preferred = localStorage.getItem('flamingo-stadium:view') || '3d'; } catch (_) { }
    const override = new URLSearchParams(location.search).get('view');
    if (override === '2d' || override === '3d') preferred = override;
    const api = { view: null, enabled: preferred !== '2d', failed: false,
      draw(ctx, frame) {
        const state = getGame().state();
        start.disabled = state === 'play' || state === 'count';
        start.textContent = state === 'end' ? '다시 도전 ↗' : state === 'setup' ? '경기장으로' : state === 'play' ? '경기 진행 중' : state === 'count' ? '준비!' : '경기 시작 ↗';
        setup.disabled = state !== 'title' && state !== 'setup';
        setup.textContent = state === 'setup' ? '설정 닫기' : '키 설정';
        select.disabled = !['title', 'end'].includes(state);
        if (document.activeElement !== select) select.value = String(getGame().humans);
        if (!api.enabled || !api.view || api.failed) return false;
        try {
          if (api.view.render(ctx, frame) === false) { fail(); return false; }
          return true;
        } catch (_) { fail(); return false; }
      },
      labels(ctx, players) {
        if (!api.view || !api.view.projectPlayer) return;
        players.forEach(p => {
          if (p.st === 'fall') return;
          const point = api.view.projectPlayer(p.i);
          if (point && point.x > 25 && point.x < 935 && point.y > 124 && point.y < 490) STADIUM.drawPlayerTag(ctx, point.x, point.y, p.i);
        });
      }
    };
    function updateMode() {
      toggle.textContent = api.enabled ? '2D로 보기' : '3D로 보기';
      toggle.setAttribute('aria-pressed', String(api.enabled));
      status.textContent = api.enabled ? '● 3D 경기장' : '● 클래식 2D';
      document.documentElement.dataset.view = api.enabled ? '3d' : '2d';
    }
    function fail() {
      api.failed = true; api.enabled = false; toggle.disabled = true;
      status.textContent = '이 브라우저에서는 클래식 2D로 플레이합니다';
      toggle.textContent = '2D 모드'; document.documentElement.dataset.view = '2d';
    }
    toggle.addEventListener('click', () => { api.enabled = !api.enabled; try { localStorage.setItem('flamingo-stadium:view', api.enabled ? '3d' : '2d'); } catch (_) { } updateMode(); toggle.blur(); });
    import(moduleURL).then(({ Stadium3D }) => {
      api.view = new Stadium3D(kind);
      if (!api.view.available) { fail(); return; }
      toggle.disabled = false; updateMode();
    }).catch(fail);
    return api;
  } };
})();
