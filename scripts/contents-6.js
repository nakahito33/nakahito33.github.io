// contents-6.js
'use strict';

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


const openNav = document.getElementById('open_nav');
const nav = document.getElementById('nav');
const btnTrigger = document.querySelector('.btn-trigger');

// メニューのスライド動作
if (openNav && nav) {
    openNav.addEventListener('click', function () {
        nav.classList.toggle('show');
    });
}

// ボタンのアニメーション（バツ印への変化など）
if (btnTrigger) {
    btnTrigger.addEventListener('click', function () {
        this.classList.toggle('active');
    });
}

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

    const targetTop = item.offsetTop;
    const targetBottom = targetTop + item.offsetHeight;
    const scrollTop = box.scrollTop;
    const scrollBottom = scrollTop + box.clientHeight;

    // 上下に余裕を持たせるパディング（オプション）
    const PADDING = 4; // px単位で微調整

    // ハイライト行が上端より上に出ている場合 → 上ボタン表示
    if (targetBottom < scrollTop + PADDING) {
        if (btnUp) btnUp.style.display = 'block';
    } else {
        if (btnUp) btnUp.style.display = 'none';
    }

    // ハイライト行が下端より下に出ている場合 → 下ボタン表示
    if (targetTop > scrollBottom - PADDING) {
        if (btnDown) btnDown.style.display = 'block';
    } else {
        if (btnDown) btnDown.style.display = 'none';
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

// 単語帳をローカルストレージに保存
function saveWordbook() {
    localStorage.setItem("wordbook", JSON.stringify(wordbook));

    // contents-2.jsで定義された描画関数を呼び出し、再描画を委譲
    if (window.renderWordbook) {
        window.renderWordbook();
    }
}

// ★ saveWordbook をグローバルに公開
window.saveWordbook = saveWordbook;

// 単語帳追加・削除トグル
function toggleWordbook(idx) {
    const ev = eventsData[idx];
    if (!ev) return;

    const pair = { en: ev.text, ja: ev.translated };

    const exists = wordbook.some(
        w => w.en === pair.en && w.ja === pair.ja
    );

    if (exists) {
        // 削除
        wordbook = wordbook.filter(w => !(w.en === pair.en && w.ja === pair.ja));
    } else {
        // 追加
        wordbook.push(pair);
    }

    // 保存と描画は saveWordbook に任せる
    saveWordbook();

    // 星アイコンの状態を更新
    const en = enItems[idx];
    const ja = jaItems[idx];
    if (!en || !ja) return;

    const starEn = en.querySelector('.star-icon');
    const starJa = ja.querySelector('.star-icon');

    if (exists) {
        starEn.classList.remove('star-active');
        starJa.classList.remove('star-active');
    } else {
        starEn.classList.add('star-active');
        starJa.classList.add('star-active');
    }
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

            // ユーザー操作尊重：自動スクロールがOFFなら位置を変更しない
            if (isAutoScroll) {
                const top = 0; // 最上部に戻す場合のみ
                if (enBox) enBox.scrollTop = top;
                if (jaBox) jaBox.scrollTop = top;
                sharedScrollTop = top;
            }
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
            if (isAutoScroll == true) {
                scrollToActiveIfNeeded();
            }

            // 4) レイアウト確定後、sharedScrollTop を復元して両方に反映
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        // タブ切り替え時にスクロール位置を復元するのは
                        // 自動追従オフの時だけにする
                        if (!isAutoScroll) {
                            const t = sharedScrollTop || 0;
                            if (enBox) enBox.scrollTop = t;
                            if (jaBox) jaBox.scrollTop = t;
                            updateScrollButtonsVisual();
                        }

                    }, 0);
                });
            });
        });
    });
}

// 初期化：字幕ロード -> render -> bind -> YouTube準備
async function init() {
    // 1. DOM要素取得
    enBox = document.querySelectorAll('.lang-text')[0];
    jaBox = document.querySelectorAll('.lang-text')[1];
    console.log('init() called');
    console.log('enBox / jaBox:', enBox, jaBox);

    // 2. 字幕データと videoId の取得
    let videoId = null;
    try {
        const video = new URLSearchParams(window.location.search).get('video') || 'default';
        console.log('video param:', video);

        const mapResponse = await fetch('json/subtitle_map.json');
        console.log('mapResponse.ok:', mapResponse.ok);
        if (!mapResponse.ok) throw new Error('subtitle_map.json not found');

        const map = await mapResponse.json();
        console.log('subtitle_map.json loaded:', map);

        const entry = map[video] || map['default'];
        console.log('map entry:', entry);

        videoId = entry?.videoId || null;
        console.log('videoId:', videoId);

        const subtitlePath = entry.subtitle;
        const res = await fetch(subtitlePath);
        if (!res.ok) throw new Error(`字幕JSONが見つかりません: ${res.status}`);
        eventsData = await res.json();
        window.eventsData = eventsData;
        console.log('subtitle fetch ok:', res.ok);
        console.log('eventsData loaded, length:', eventsData.length);
    } catch (err) {
        console.error('subtitle load error', err);
        eventsData = [];
    }

    // 3. 字幕描画
    renderSubtitles();
    console.log('[DEBUG] renderSubtitles CALLED');
    bindTabButtons();
    console.log('[DEBUG] bindTabButtons() done');

    // 4. YouTube API スクリプトを一度だけ読み込む / 既にロード済みなら手動で呼ぶ
    window.onYouTubeIframeAPIReady = function () {
        console.log('onYouTubeIframeAPIReady called');
        const playerDiv = document.getElementById('player');
        if (!videoId || videoId === 'unknown') {
            if (playerDiv) playerDiv.innerHTML = '<p>unknown</p>';
            return;
        }

        ytplayer = new YT.Player('player', {
            videoId: videoId,
            host: 'https://www.youtube.com',
            playerVars: {
                origin: window.location.origin,
                enablejsapi: 1,
                rel: 0,
                playsinline: 1
            },
            events: { onStateChange: onPlayerStateChange }
        });

        window.ytplayer = ytplayer;
        console.log('YouTube player created:', ytplayer);
    };

    if (!document.querySelector('script[data-ytapi]')) {
        console.log('injecting YouTube IFrame API script');
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        s.dataset.ytapi = '1';
        s.onload = () => {
            console.log('YouTube IFrame API script loaded');
            // APIロード完了時に手動呼び出し
            if (typeof window.onYouTubeIframeAPIReady === 'function') {
                window.onYouTubeIframeAPIReady();
            }
        };
        s.onerror = (e) => console.error('Failed to load YouTube IFrame API script', e);
        document.body.appendChild(s);
    } else if (window.YT && typeof window.YT.Player === 'function') {
        console.log('YT already loaded, calling onYouTubeIframeAPIReady manually');
        window.onYouTubeIframeAPIReady();
    }    

    // 5. YouTube API Ready 時にプレイヤーを同期生成
    window.onYouTubeIframeAPIReady = function () {
        console.log('onYouTubeIframeAPIReady called');
        const playerDiv = document.getElementById('player');
        if (!videoId || videoId === 'unknown') {
            if (playerDiv) playerDiv.innerHTML = '<p>unknown</p>';
            return;
        }

        ytplayer = new YT.Player('player', {
            videoId: videoId,
            host: 'https://www.youtube.com',
            playerVars: {
                origin: window.location.origin,
                enablejsapi: 1,
                rel: 0,
                playsinline: 1
            },
            events: { onStateChange: onPlayerStateChange }
        });

        window.ytplayer = ytplayer;
        console.log('YouTube player created:', ytplayer);
    };

    // 6. 初回スクロール位置設定
    attachScrollWatchers();
    console.log('[DEBUG] attachScrollWatchers CALLED');
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (!enItems || !enItems.length) return;

            let targetTop;
            if (isAutoScroll) {
                targetTop = computeIdealScrollTop(enBox, enItems[activeIndex]);
            } else {
                targetTop = enBox.scrollTop; // 現在の位置維持
            }

            sharedScrollTop = targetTop;
            if (enBox) enBox.scrollTop = targetTop;
            if (jaBox) jaBox.scrollTop = targetTop;

            updateScrollButtonsVisual();
        });
    });    
}

// ページロード時に初期化
window.addEventListener('DOMContentLoaded', init);
