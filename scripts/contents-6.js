'use strict';

// ----------------------------------------------------
// CineLingua コンテンツ6用 字幕同期ロジック (contents-6.js)
// ----------------------------------------------------

// DOM要素の参照
const enTextContainer = document.querySelectorAll('.lang-text')[0]; // 英語字幕用
const jaTextContainer = document.querySelectorAll('.lang-text')[1]; // 日本語字幕用
const subtitleContainer = document.querySelector('.translation-content'); // スクロールコンテナ

// 状態管理用の変数
let checkTimeInterval = null;
let currentLineIndex = -1; 


/**
 * 1. 全字幕をDOMに描画し、クリックイベントを設定します。
 */
function initializeTranscriptDisplay(data) {
    console.log('Transcript Display Initializing...'); 
    
    // コンテンツをクリア
    enTextContainer.innerHTML = '';
    jaTextContainer.innerHTML = '';
    currentLineIndex = -1;
    
    // 全てのセリフをDOMに事前に描画
    data.forEach((ev, index) => {
        
        // --- 英語 ---
        const spanEn = document.createElement('span');
        spanEn.textContent = `${ev.speaker ? ev.speaker + ': ' : ''}${ev.text}`;
        spanEn.dataset.index = index; 
        spanEn.addEventListener('click', () => {
             if (window.addToWordbook) window.addToWordbook(ev.text); 
        });
        enTextContainer.appendChild(spanEn);
        
        // --- 日本語 ---
        const spanJa = document.createElement('span');
        spanJa.textContent = `${ev.speaker ? ev.speaker + ': ' : ''}${ev.translated || '翻訳なし'}`;
        spanJa.dataset.index = index;
        spanJa.addEventListener('click', () => {
             if (window.addToWordbook) window.addToWordbook(ev.translated || ev.text);
        });
        jaTextContainer.appendChild(spanJa);
    });
}


/**
 * 2. 0.1秒ごとに現在の再生時間とセリフを同期
 */
function updateSubtitleSync() {
    if (!window.ytplayer || !window.eventsData || window.ytplayer.getPlayerState() !== window.YT.PlayerState.PLAYING) {
        return;
    }

    const currentTime = window.ytplayer.getCurrentTime();
    let activeSubtitleIndex = -1;

    // 現在の時間に対応する字幕を探す
    for (let i = 0; i < window.eventsData.length; i++) {
        if (currentTime >= window.eventsData[i].start) {
            activeSubtitleIndex = i;
        } else {
            // 時間順に並んでいる前提なので、超えた時点で終了
            break;
        }
    }
    
    // ハイライトに変更がなければ何もしない
    if (activeSubtitleIndex === currentLineIndex) return;
    
    currentLineIndex = activeSubtitleIndex;

    // 全てのハイライトをリセット
    document.querySelectorAll('.lang-text span').forEach(span => span.classList.remove('highlight'));
    
    if (activeSubtitleIndex !== -1) {
        const newActiveEnSpan = enTextContainer.querySelector(`span[data-index="${activeSubtitleIndex}"]`);
        const newActiveJaSpan = jaTextContainer.querySelector(`span[data-index="${activeSubtitleIndex}"]`);
        
        // ハイライト適用
        if (newActiveEnSpan) newActiveEnSpan.classList.add('highlight');
        if (newActiveJaSpan) newActiveJaSpan.classList.add('highlight');

        // 自動スクロール（現在表示中の言語に対して実行）
        const currentActiveLangContainer = document.querySelector('.lang-text.active');
        if (currentActiveLangContainer) {
            const activeSpanInCurrentLang = currentActiveLangContainer.querySelector(`span[data-index="${activeSubtitleIndex}"]`);

            if (activeSpanInCurrentLang) {
                scrollToActiveElement(subtitleContainer, activeSpanInCurrentLang); 
            }
        }
    }
}

/**
 * 3. スクロール位置の調整（見やすい位置に固定）
 */
function scrollToActiveElement(container, activeElement) {
    // コンテナの上から 178px の位置に、ハイライトされた行が来るようにスクロール
    const fixedTopOffset = 178; 
    const scrollPosition = activeElement.offsetTop - fixedTopOffset;
    
    container.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
    });
}


/**
 * 4. プレイヤー状態監視
 */
function handlePlayerStateChange(event) {
    if (!window.YT || !window.ytplayer) return;

    // 巻き戻し時のリセット処理
    const currentTime = window.ytplayer.getCurrentTime();
    if (currentTime < 0.5 && currentLineIndex !== -1) { 
        document.querySelectorAll('.lang-text span').forEach(span => span.classList.remove('highlight'));
        currentLineIndex = -1;
    }

    if (event.data === window.YT.PlayerState.PLAYING) {
        if (!checkTimeInterval) {
            checkTimeInterval = setInterval(updateSubtitleSync, 100); 
        }
    } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
        if (checkTimeInterval) {
            clearInterval(checkTimeInterval);
            checkTimeInterval = null;
        }
    }
}

// ----------------------------------------------------
// 5. グローバル公開
// ----------------------------------------------------
window.initializeTranscriptDisplay = initializeTranscriptDisplay;
window.handlePlayerStateChange = handlePlayerStateChange;


// ----------------------------------------------------
// 6. タブ切り替え時のスクロール位置修正
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-button');
    const langContents = document.querySelectorAll('.lang-text');

    tabButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            langContents.forEach(content => content.classList.remove('active'));
            langContents[index].classList.add('active');
            
            // 言語を切り替えた時も、現在のハイライト位置までスクロールする
            if (currentLineIndex !== -1) {
                const activeSpan = langContents[index].querySelector(`span[data-index="${currentLineIndex}"]`);
                if (activeSpan) {
                     scrollToActiveElement(subtitleContainer, activeSpan);
                }
            }
        });
    });
});