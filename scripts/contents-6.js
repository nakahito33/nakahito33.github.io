'use strict';

// ----------------------------------------------------
// CineLingua コンテンツ6用 字幕同期ロジック (content-6.js)
// ----------------------------------------------------

// DOM要素の参照 (contents-6.htmlの構造に基づく)
// NOTE: main.jsのHTML構造では、字幕コンテナは .lang-text の配列です
const enTextContainer = document.querySelectorAll('.lang-text')[0]; // 英語字幕用
const jaTextContainer = document.querySelectorAll('.lang-text')[1]; // 日本語字幕用
const subtitleContainer = document.querySelector('.translation-content'); // スクロールコンテナ

// 状態管理用の変数 (transcript.jsの player/subtitles/subtitleInterval に相当)
let checkTimeInterval = null; // setIntervalのID
let currentLineIndex = -1; // 現在ハイライトされているセリフのインデックス


/**
 * 1. 全字幕をDOMに描画し、クリックイベントを設定します。（transcript.jsの renderSubtitles() に相当）
 * main.jsの init() 関数から window.initializeTranscriptDisplay(eventsData) として呼ばれます。
 * @param {Array} data - 字幕データ (window.eventsData)
 */
function initializeTranscriptDisplay(data) {
    // コンテンツをクリア
    enTextContainer.innerHTML = '';
    jaTextContainer.innerHTML = '';
    currentLineIndex = -1;
    
    // 全てのセリフをDOMに事前に描画
    data.forEach((ev, index) => {
        
        // --- 英語 (enTextContainer) ---
        const spanEn = document.createElement('span');
        // ご提示のtranscript.jsと同じ形式で表示: スピーカー名: テキスト
        spanEn.textContent = `${ev.speaker ? ev.speaker + ': ' : ''}${ev.text}`;
        spanEn.dataset.index = index; 
        
        // 単語帳への追加 (main.jsのグローバル関数を利用)
        spanEn.addEventListener('click', () => {
             if (window.addToWordbook) window.addToWordbook(ev.text); 
        });
        enTextContainer.appendChild(spanEn);
        
        // --- 日本語 (jaTextContainer) ---
        const spanJa = document.createElement('span');
        spanJa.textContent = `${ev.speaker ? ev.speaker + ': ' : ''}${ev.translated || '翻訳なし'}`;
        spanJa.dataset.index = index;
        
        // 単語帳への追加
        spanJa.addEventListener('click', () => {
             if (window.addToWordbook) window.addToWordbook(ev.translated || ev.text);
        });
        jaTextContainer.appendChild(spanJa);
    });
}


/**
 * 2. 0.1秒ごとに現在の再生時間とセリフを同期し、ハイライトと自動スクロールを制御します。（transcript.jsの updateSubtitle() に相当）
 */
function updateSubtitleSync() {
    // main.jsから受け取るグローバル変数が利用可能か確認
    if (!window.ytplayer || !window.eventsData || window.ytplayer.getPlayerState() !== window.YT.PlayerState.PLAYING) {
        return;
    }

    const currentTime = window.ytplayer.getCurrentTime();
    let activeSubtitleIndex = -1;

    // ご提示のtranscript.jsの同期ロジックを再現
    for (let i = 0; i < window.eventsData.length; i++) {
        if (currentTime >= window.eventsData[i].start) {
            activeSubtitleIndex = i;
        } else {
            break;
        }
    }
    
    const activeIndex = activeSubtitleIndex;

    // ハイライトに変更がなければ処理を中断
    if (activeIndex === currentLineIndex) return;
    
    currentLineIndex = activeIndex;

    // ------------------------------------
    // ハイライトの更新と自動スクロール
    // ------------------------------------
    
    // 全ての要素のハイライトをリセット
    document.querySelectorAll('.lang-text span').forEach(span => span.classList.remove('highlight'));
    
    if (activeIndex !== -1) {
        const newActiveEnSpan = enTextContainer.querySelector(`span[data-index="${activeIndex}"]`);
        const newActiveJaSpan = jaTextContainer.querySelector(`span[data-index="${activeIndex}"]`);
        
        // ハイライトの適用
        if (newActiveEnSpan) newActiveEnSpan.classList.add('highlight');
        if (newActiveJaSpan) newActiveJaSpan.classList.add('highlight');

        // 自動スクロールは現在アクティブな言語コンテナに対してのみ実行
        const currentActiveLangContainer = document.querySelector('.lang-text.active');
        if (currentActiveLangContainer) {
            const activeSpanInCurrentLang = currentActiveLangContainer.querySelector(`span[data-index="${activeIndex}"]`);

            if (activeSpanInCurrentLang) {
                scrollToActiveElement(subtitleContainer, activeSpanInCurrentLang); 
            }
        }
    }
}

/**
 * 3. アクティブな要素が中央付近に来るように親コンテナをスクロールさせます。
 * (transcript.jsのスクロールロジックを調整)
 * @param {HTMLElement} container - スクロール対象の親要素 (.translation-content)
 * @param {HTMLElement} activeElement - ハイライトされている子要素 (span)
 */
function scrollToActiveElement(container, activeElement) {
    // transcript.jsの marginTop = 600 は、画面のどこに字幕を固定するかを示す大きなオフセットです。
    // 今回の構造に合わせて、コンテナの中央付近にスクロールするロジックに変更します。
    // （もしtranscript.jsの固定位置の再現が必要であれば、このロジックを変更します）
    
    // 要素がコンテナの中央付近に来るようにスクロール位置を計算
    const centerOffset = container.offsetHeight / 2 - activeElement.offsetHeight / 2;
    const scrollPosition = activeElement.offsetTop - centerOffset;
    
    container.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
    });
}


/**
 * 4. 動画が再生されたり停止されたりしたときに同期処理を制御します。（transcript.jsの onPlayerStateChange() に相当）
 * main.jsの onPlayerStateChange から呼ばれます。
 */
function handlePlayerStateChange(event) {
    if (!window.YT || !window.ytplayer) return;

    // 動画が巻き戻された時のハイライトリセット
    // main.jsの旧ロジックにあった「currentTime < latestTime」はmain.js側で管理されていましたが、ここでは簡易的に対応
    const currentTime = window.ytplayer.getCurrentTime();
    if (currentTime < 0.5 && currentLineIndex !== -1) { 
        document.querySelectorAll('.lang-text span').forEach(span => span.classList.remove('highlight'));
        currentLineIndex = -1;
    }


    if (event.data === window.YT.PlayerState.PLAYING) {
        // 再生中のとき、同期処理を開始
        if (!checkTimeInterval) {
            checkTimeInterval = setInterval(updateSubtitleSync, 100); // 0.1秒ごと
        }
    } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
        // 停止中または終了時、同期処理を停止
        if (checkTimeInterval) {
            clearInterval(checkTimeInterval);
            checkTimeInterval = null;
        }
    }
}

// ----------------------------------------------------
// 5. グローバル化: main.js から呼び出せるようにする
// ----------------------------------------------------

window.initializeTranscriptDisplay = initializeTranscriptDisplay;
window.handlePlayerStateChange = handlePlayerStateChange;


// ----------------------------------------------------
// 6. 翻訳タブの切り替え機能 (content-6.js内でのみ実行される)
// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // main.jsのタブ切り替えロジックが重複しないように、main.jsのタブ切り替えは削除推奨ですが、
    // ここでタブのactiveクラス切り替えと、再スクロール処理を実装します。
    const tabButtons = document.querySelectorAll('.tab-button');
    const langContents = document.querySelectorAll('.lang-text');

    tabButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            // タブのアクティブ状態を切り替え
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // 翻訳コンテンツの表示を切り替え
            langContents.forEach(content => content.classList.remove('active'));
            langContents[index].classList.add('active');
            
            // 言語切り替え時に、ハイライトされている行へスクロールを再実行
            if (currentLineIndex !== -1) {
                // アクティブな要素が属するコンテナがスクロール対象 (.translation-content)
                const activeSpan = langContents[index].querySelector(`span[data-index="${currentLineIndex}"]`);
                
                if (activeSpan) {
                     scrollToActiveElement(subtitleContainer, activeSpan);
                }
            }
        });
    });
});