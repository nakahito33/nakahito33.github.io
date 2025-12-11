'use strict';

// ハンバーガーメニュークリック
document.addEventListener('DOMContentLoaded', function () {
  // ハンバーガーメニューのスライドの動き
  const openNav = document.getElementById('open_nav');
  const nav = document.getElementById('nav');
  openNav.addEventListener('click', function () {
    nav.classList.toggle('show');
  });


  // ハンバーガーメニューの動き（バツに変化するもの）
  const btnTrigger = document.querySelector('.btn-trigger');
  if (btnTrigger) {
    btnTrigger.addEventListener('click', function () {
      this.classList.toggle('active');
    });
  }

  let ytplayer = null;
  let eventsData = [];
  let subtitleInterval = null;

  let wordbook = JSON.parse(localStorage.getItem('wordbook') || '[]');

  // 状態（単純化）
  let isAutoScroll = true;        // 自動追従フラグ（仕様どおり：クリックで復帰）
  let isAnimating = false;
  let animCancelToken = null;

  let activeIndex = -1;

  // DOM refs
  let enBox = null;
  let jaBox = null;
  let enItems = [];
  let jaItems = [];
  let btnUp = null;
  let btnDown = null;
  let sharedScrollTop = 0;

  const ANIM_DURATION_MS = 100;   // 100ms 固定（仕様）
  const SCROLL_THROTTLE_MS = 80;

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function now() { return performance.now(); }

  // 上寄せの理想 top を返す
  function computeIdealScrollTop(box, el) {
    if (!box || !el) return 0;
    // el.offsetTop は親コンテナからのオフセット（期待どおり）
    const offset = el.offsetTop || 0;
    return Math.max(0, offset - 8); // 少し余白
  }

  // 固定時間アニメ（en/ja 同期） — 100ms
  function animateScrollTo(targetTop) {
    console.log("[ANIM] start anim to targetTop=", targetTop,
      "en.start=", enBox.scrollTop,
      "ja.start=", jaBox.scrollTop,
      "isAutoScroll=", isAutoScroll
    );
    if (!enBox || !jaBox) return Promise.resolve();
    // cancel previous
    if (animCancelToken) {
      animCancelToken();
      animCancelToken = null;
    }

    const startEn = enBox.scrollTop;
    const startJa = jaBox.scrollTop;
    const deltaEn = targetTop - startEn;
    const deltaJa = targetTop - startJa;
    const startTime = now();
    let rafId = null;
    let cancelled = false;
    isAnimating = true;

    const step = () => {
      const t = now() - startTime;
      const p = clamp(t / ANIM_DURATION_MS, 0, 1);
      const ease = p * (2 - p);
      const newEn = startEn + deltaEn * ease;
      const newJa = startJa + deltaJa * ease;

      // apply
      enBox.scrollTop = newEn;
      jaBox.scrollTop = newJa;

      // update sharedScrollTop to latest applied value (use en as canonical)
      sharedScrollTop = enBox.scrollTop;

      if (p < 1 && !cancelled) {
        rafId = requestAnimationFrame(step);
      } else {
        isAnimating = false;
        animCancelToken = null;
      }
    };

    rafId = requestAnimationFrame(step);

    animCancelToken = () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      isAnimating = false;
      animCancelToken = null;
    };

    // resolve after duration
    return new Promise(res => setTimeout(() => {
      // finalize sharedScrollTop to exact target
      sharedScrollTop = targetTop;
      enBox.scrollTop = targetTop;
      jaBox.scrollTop = targetTop;
      res();
    }, ANIM_DURATION_MS + 10));
  }  

  // ハイライト表示のみ（DOMクラス切替）
  function updateHighlight(index) {
    activeIndex = index;
    const boxes = document.querySelectorAll('.lang-text');
    boxes.forEach(box => {
      box.querySelectorAll('p').forEach(p => {
        p.classList.toggle('active', Number(p.dataset.index) === index);
      });
    });
    updateScrollButtonsVisual();
  }

  // ボタン表示更新（enBox を基準）
  function updateScrollButtonsVisual() {
    // 現在アクティブなタブを判定
    const enActive = enBox?.classList.contains('active');
    const box = enActive ? enBox : jaBox;
    const items = enActive ? enItems : jaItems;

    if (!box || !items || !items.length) {
      hideScrollButtons();
      return;
    }

    const item = activeIndex >= 0 ? items[activeIndex] : items[0];
    if (!item) {
      hideScrollButtons();
      return;
    }

    const ideal = computeIdealScrollTop(box, item);
    const current = box.scrollTop;

    const down_MARGIN = 20;
    const up_MARGIN = 220;

    if (current < ideal - up_MARGIN) {
      if (btnDown) btnDown.style.display = 'block';
      if (btnUp) btnUp.style.display = 'none';
    } else if (current > ideal + down_MARGIN) {
      if (btnUp) btnUp.style.display = 'block';
      if (btnDown) btnDown.style.display = 'none';
    } else {
      hideScrollButtons();
    }
  }
  
  function hideScrollButtons() {
    if (btnUp) btnUp.style.display = 'none';
    if (btnDown) btnDown.style.display = 'none';
  }

  // 行クリック（ジャンプ） — 100ms アニメで上寄せ。クリックで isAutoScroll を true に戻す。
  function onLineClick(index) {
    updateHighlight(index);
    isAutoScroll = true;
    // rAF×2 でレイアウト安定の後アニメ
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const enActive = enBox.classList.contains('active');
        const box = enActive ? enBox : jaBox;
        const items = enActive ? enItems : jaItems;
        const target = items[activeIndex];
        if (!target) return;
        const targetTop = computeIdealScrollTop(box, target);
        animateScrollTo(targetTop);
      });
    });

    const ev = eventsData[index];
    if (ytplayer && ev && typeof ev.start === 'number') {
      ytplayer.seekTo(ev.start, true);
    }
  }

  // 自動追従呼び出し
  function scrollToActiveIfNeeded() {
    if (activeIndex < 0) return;

    // 現在アクティブなタブを判定
    const enActive = enBox.classList.contains('active');
    const box = enActive ? enBox : jaBox;
    const items = enActive ? enItems : jaItems;

    const target = items[activeIndex];
    if (!target) return;

    const targetTop = computeIdealScrollTop(box, target);

    // 英語・日本語は常に同期スクロール
    animateScrollTo(targetTop);
  }

  // renderSubtitles（DOMが存在する前提で呼ぶ）
  function renderSubtitles() {
    console.log("[DEBUG] renderSubtitles CALLED");

    enBox = document.querySelectorAll('.lang-text')[0];
    jaBox = document.querySelectorAll('.lang-text')[1];

    if (!enBox || !jaBox) {
      console.warn('renderSubtitles: lang-text containers not found');
      return;
    }
    if (!eventsData || !eventsData.length) {
      enBox.innerHTML = '';
      jaBox.innerHTML = '';
      enItems = jaItems = [];
      return;
    }

    enBox.innerHTML = '';
    jaBox.innerHTML = '';
    const fragEn = document.createDocumentFragment();
    const fragJa = document.createDocumentFragment();

    eventsData.forEach((ev, idx) => {
      const pEn = document.createElement('p');
      pEn.className = 'subtitle-line';
      pEn.textContent = (ev.speaker ? ev.speaker + ' : ' : ' : ') + ev.text;
      pEn.dataset.index = idx;
      if (ev.start != null) pEn.dataset.start = ev.start;
      if (ev.end != null) pEn.dataset.end = ev.end;

      const starEn = document.createElement('span');
      starEn.className = 'star-icon';
      starEn.textContent = '★';
      starEn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleWordbook(idx);
      });
      pEn.appendChild(starEn);
      pEn.addEventListener('click', () => onLineClick(idx));

      const pJa = document.createElement('p');
      pJa.className = 'subtitle-line';
      pJa.textContent = (ev.speaker ? ev.speaker + ' : ' : ' : ') + ev.translated;
      pJa.dataset.index = idx;
      if (ev.start != null) pJa.dataset.start = ev.start;
      if (ev.end != null) pJa.dataset.end = ev.end;

      const starJa = document.createElement('span');
      starJa.className = 'star-icon';
      starJa.textContent = '★';

      const saved = wordbook.some(w => w.en === ev.text && w.ja === ev.translated);
      if (saved) {
        starEn.classList.add('star-active');
        starJa.classList.add('star-active');
      }

      starJa.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleWordbook(idx);
      });
      pJa.appendChild(starJa);
      pJa.addEventListener('click', () => onLineClick(idx));

      fragEn.appendChild(pEn);
      fragJa.appendChild(pJa);
    });

    enBox.appendChild(fragEn);
    jaBox.appendChild(fragJa);

    enItems = Array.from(enBox.querySelectorAll('p'));
    jaItems = Array.from(jaBox.querySelectorAll('p'));

    attachScrollWatchers();
    updateScrollButtonsVisual(); 
  }

  // wordbook toggle（辞書仕様は触らない）
  function toggleWordbook(idx) {
    const ev = eventsData[idx];
    if (!ev) return;

    const pair = { en: ev.text, ja: ev.translated };

    const exists = wordbook.some(
      w => w.en === pair.en && w.ja === pair.ja
    );

    const en = enItems[idx];
    const ja = jaItems[idx];
    const starEn = en.querySelector('.star-icon');
    const starJa = ja.querySelector('.star-icon');

    if (exists) {
      wordbook = wordbook.filter(w => !(w.en === pair.en && w.ja === pair.ja));
      starEn.classList.remove('star-active');
      starJa.classList.remove('star-active');
    } else {
      wordbook.push(pair);
      starEn.classList.add('star-active');
      starJa.classList.add('star-active');
    }

    localStorage.setItem('wordbook', JSON.stringify(wordbook));
  }  

  // スクロール検出とボタンワイヤリング
  function attachScrollWatchers() {
    if (!enBox || !jaBox) return;
    console.log("[DEBUG] attachScrollWatchers CALLED");

    btnUp = document.getElementById('scroll-up-btn');
    btnDown = document.getElementById('scroll-down-btn');

    [enBox, jaBox].forEach(box => {
      if (box._watchRegistered) return;
      box._watchRegistered = true;

      let last = 0;
      box.addEventListener('scroll', () => {
        const t = now();
        if (t - last < SCROLL_THROTTLE_MS) return;
        last = t;
        if (isAnimating) return;

        // update shared and sync the other box
        const other = (box === enBox) ? jaBox : enBox;
        const current = box.scrollTop;

        // store shared
        sharedScrollTop = current;

        // sync other if different (avoid unnecessary writes)
        if (other && Math.abs(other.scrollTop - current) > 1) {
          other.scrollTop = current;
        }

        updateScrollButtonsVisual();
      }, { passive: true });

      // user intent only on wheel / touchstart (prevents star/button clicks from stopping auto-follow)
      ['wheel', 'touchstart'].forEach(ev => {
        box.addEventListener(ev, () => {
          isAutoScroll = false;
          if (animCancelToken) animCancelToken();
          updateScrollButtonsVisual();
        }, { passive: true });
      });
    });

    if (btnUp && !btnUp._registered) {
      btnUp.addEventListener('click', () => {
        if (activeIndex < 0) activeIndex = 0;

        // 現在のアクティブタブを判定
        const enActive = enBox.classList.contains('active');
        const box = enActive ? enBox : jaBox;
        const items = enActive ? enItems : jaItems;

        const targetItem = items[activeIndex];
        const top = targetItem ? computeIdealScrollTop(box, targetItem) : 0;

        // 両方同期スクロール（ここは即時）
        sharedScrollTop = top;
        if (enBox) enBox.scrollTop = top;
        if (jaBox) jaBox.scrollTop = top;

        isAutoScroll = true;
        updateScrollButtonsVisual();
      });
      btnUp._registered = true;
    }

    if (btnDown && !btnDown._registered) {
      btnDown.addEventListener('click', () => {
        if (activeIndex < 0) activeIndex = 0;

        // 現在のアクティブタブを判定
        const enActive = enBox.classList.contains('active');
        const box = enActive ? enBox : jaBox;
        const items = enActive ? enItems : jaItems;

        const targetItem = items[activeIndex];
        const top = targetItem ? computeIdealScrollTop(box, targetItem) : 0;

        // 両方同期スクロール
        sharedScrollTop = top;
        if (enBox) enBox.scrollTop = top;
        if (jaBox) jaBox.scrollTop = top;

        isAutoScroll = true;
        updateScrollButtonsVisual();
      });
      btnDown._registered = true;
    }
  }  

  // YouTube 側で再生時に呼ばれるループ
  function updateSubtitleFromPlayer() {
    if (!ytplayer || !eventsData.length) return;

    const t = ytplayer.getCurrentTime();
    const firstStart = parseFloat(eventsData[0]?.start ?? 0);

    // ① 最初の時間より前に戻った → ハイライト解除
    if (t < firstStart) {
      if (activeIndex !== -1) {
        activeIndex = -1;
        updateHighlight(-1);
      }
      return;
    }

    // ② どの行が現在か判定
    let newIndex = -1;
    for (let i = 0; i < eventsData.length; i++) {
      const next = i < eventsData.length - 1 ? eventsData[i + 1].start : Infinity;
      if (t >= eventsData[i].start && t < next) { newIndex = i; break; }
    }
    if (newIndex === -1) return;

    // ③ 初回のハイライトセット時は自動スクロールONにする
    if (activeIndex === -1) {
      isAutoScroll = true;
    }

    // ④ ハイライト更新
    if (newIndex !== activeIndex) {
      updateHighlight(newIndex);
      if (isAutoScroll) scrollToActiveIfNeeded();
    }
  }

  function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {

      if (activeIndex === -1 && eventsData.length > 0) {
        const top = computeIdealScrollTop(enBox, enItems[0]);
        sharedScrollTop = top;
        if (enBox) enBox.scrollTop = top;
        if (jaBox) jaBox.scrollTop = top;

        // 初回は自動スクロールを有効化
        isAutoScroll = true;
      }      

      // ▼（現状の処理）
      if (!window.__subtitlesRendered) {
        renderSubtitles();
        window.__subtitlesRendered = true;
      }

      if (subtitleInterval) clearInterval(subtitleInterval);
      subtitleInterval = setInterval(updateSubtitleFromPlayer, 100);
    }    
  }

  // タブバインド（クリックで active 切替・即時ジャンプ→短いアニメ）
  function bindTabButtons() {
    const tabButtons = Array.from(document.querySelectorAll('.tab-button'));
    const langContents = Array.from(document.querySelectorAll('.lang-text'));

    tabButtons.forEach((btn, i) => {
      // 防止: 二重登録
      if (btn._registered) return;
      btn._registered = true;

      btn.addEventListener('click', () => {
        // 1) タブの active 切替（見た目）
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 2) 表示切替（DOM の active クラス）
        langContents.forEach((c, ci) => c.classList.toggle('active', ci === i));

        // 3) 自動追従を有効にする
        isAutoScroll = true;

        // 4) レイアウト確定後、sharedScrollTop を復元して両方に反映
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              const t = sharedScrollTop || 0;
              if (enBox) enBox.scrollTop = t;
              if (jaBox) jaBox.scrollTop = t;
        
              updateScrollButtonsVisual();
            }, 0);
          });
        });
      });
    });
  }
  
  // 初期化：字幕ロード -> render -> bind
  async function init() {
    enBox = document.querySelectorAll('.lang-text')[0];
    jaBox = document.querySelectorAll('.lang-text')[1];

    // load map & subtitles (same pattern as before)
    try {
      const video = new URLSearchParams(window.location.search).get('video') || 'default';
      const mapResponse = await fetch('json/subtitle_map.json');
      if (!mapResponse.ok) throw new Error('subtitle_map.json not found');
      const map = await mapResponse.json();
      const entry = map[video] || map['default'];
      const subtitlePath = entry.subtitle;
      const res = await fetch(subtitlePath);
      eventsData = await res.json();
    } catch (err) {
      console.error('subtitle load error', err);
      eventsData = [];
    }

    renderSubtitles();
    bindTabButtons();

    // inject youtube api once
    if (!document.querySelector('script[data-ytapi]')) {
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.dataset.ytapi = '1';
      document.body.appendChild(s);
    }

    // prepare player creation when API ready
    window.onYouTubeIframeAPIReady = function () {
      try {
        const video = new URLSearchParams(window.location.search).get('video') || 'default';
        fetch('json/subtitle_map.json').then(r => r.json()).then(map => {
          const entry = map[video] || map['default'];
          if (!entry || !entry.videoId || entry.videoId === 'unknown') {
            const playerEl = document.getElementById('player');
            if (playerEl) playerEl.innerHTML = '<p>unknown</p>';
            return;
          }
          ytplayer = new YT.Player('player', {
            videoId: entry.videoId,
            events: { onStateChange: onPlayerStateChange }
          });
        }).catch(err => console.warn('failed to init player', err));
      } catch (err) {
        console.warn('YT init error', err);
      }
    };

    // attach watchers after everything
    attachScrollWatchers();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {

        // safety: items が未準備なら return
        if (!enItems || !enItems.length) return;
        const targetItem = enItems[0];        // activeIndex=0 相当
        const top = computeIdealScrollTop(enBox, targetItem);

        sharedScrollTop = top;
        if (enBox) enBox.scrollTop = top;
        if (jaBox) jaBox.scrollTop = top;

        updateScrollButtonsVisual();
      });
    });    
  }

  // デバッグ用
  window.__debug = {
    state: () => ({
      activeIndex, isAutoScroll, isAnimating,
      enScroll: enBox?.scrollTop, jaScroll: jaBox?.scrollTop
    })
  };

  // init once
  if (!window.__mainInitCalled) {
    window.__mainInitCalled = true;
    init();
  }

  // クイズの答え表示機能
  const answerButtons = document.querySelectorAll('.answer-button');

  answerButtons.forEach(button => {
    button.addEventListener('click', () => {
      const answerText = button.nextElementSibling;
      if (answerText) {
      // クリックされたらhiddenクラスをつけ外し
        answerText.classList.toggle('hidden');
      }
    });
  });
});