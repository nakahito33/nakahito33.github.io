'use strict';

// --- グローバル変数 ---
let player;
let subtitles = [];
let subtitleInterval;
const subtitleContainer = document.getElementById('subtitle-container');
const subtitleList = document.getElementById('subtitle-list');

// --- メインの処理 ---

// 1. 字幕JSONファイルを読み込む
fetch('../csv/transcript.json')
    .then(response => response.json())
    .then(data => {
        subtitles = data;
        console.log('字幕データの読み込み完了');
        renderSubtitles();
    })
    .catch(error => {
        console.error('字幕ファイルの読み込みエラー:', error);
        subtitleList.textContent = '字幕ファイルを読み込めませんでした。';
    });

// 2. YouTube IFrame API準備完了時に呼ばれる
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '315',
        width: '560',
        videoId: 'M7lc1UVf-VE',
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
}

// 3. 動画の再生状態が変わった時に呼ばれる
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        subtitleInterval = setInterval(updateSubtitle, 100);
    } else {
        clearInterval(subtitleInterval);
    }
}

// 4. 字幕をDOMにレンダリング
function renderSubtitles() {
    subtitleList.innerHTML = '';
    subtitles.forEach((subtitle, index) => {
        const p = document.createElement('p');
        p.textContent = subtitle.text;
        p.dataset.index = index;
        subtitleList.appendChild(p);
    });
}

// 5. 字幕を更新
function updateSubtitle() {
    const currentTime = player.getCurrentTime();
    let activeSubtitleIndex = -1;

    for (let i = 0; i < subtitles.length; i++) {
        if (currentTime >= subtitles[i].start) {
            activeSubtitleIndex = i;
        } else {
            break;
        }
    }

    const allSubtitleElements = subtitleList.querySelectorAll('p');
    allSubtitleElements.forEach(p => p.classList.remove('active'));

    if (activeSubtitleIndex !== -1) {
        const activeElement = allSubtitleElements[activeSubtitleIndex];
        activeElement.classList.add('active');

        // --- 上から530px余白をあけてスクロール ---
        const marginTop = 530;
        const scrollPosition = activeElement.offsetTop - marginTop;

        subtitleContainer.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
        });
    }
}

