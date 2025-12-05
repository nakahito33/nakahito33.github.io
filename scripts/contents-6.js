'use strict';

// ----------------------------------------------------
// CineLingua コンテンツ6用 字幕同期ロジック (contents-6.js)
// ----------------------------------------------------

// DOM要素の参照
const enTextContainer = document.querySelectorAll('.lang-text')[0]; // 英語字幕用
const jaTextContainer = document.querySelectorAll('.lang-text')[1]; // 日本語字幕用
const subtitleContainer = document.querySelector('.translation-content'); // スクロールコンテナ

// 状態管理用の変数
let checkTimeInterval = null; // 動画の再生開始に合わせたタイマーIDの保持
let currentLineIndex = -1; // ハイライトされている字幕の行のインデックス番号の保持


/**
 * 1. 全字幕をDOMに描画し、クリックイベントを設定します。
 */
function initializeTranscriptDisplay(data) {
    console.log('字幕の描画処理がしっかり開始されています。'); 
    
    // コンテンツをクリア
    enTextContainer.innerHTML = ''; // 字幕コンテナの中身を空にする（指定されたHTMLの内部にあるものをすべて削除）
    jaTextContainer.innerHTML = '';
    currentLineIndex = -1; // youtubeの状態関数を初期状態に
    
    // 全てのセリフをDOMに事前に描画
    data.forEach((ev, index) => { // dataに入っているセリフを一つずつ取り出しforループ開始
    // evには"speaker"などが、indexには現在処理しているセリフのインデックス番号が入っている
        
        // --- 英語 ---
        const spanEn = document.createElement('span'); // spanタグを生成
        spanEn.textContent = `${ev.speaker ? ev.speaker + ': ' : ''}${ev.text}`;
        spanEn.dataset.index = index; // <span data-index="0">...</span>となる。 

// ここだけちょっと単語帳入ってる
        spanEn.addEventListener('click', () => { // 字幕に対してクリックしたとき
             if (window.addToWordbook) window.addToWordbook(ev.text); // クリックされた英語字幕のテキストが単語帳データに保存される。
        });
        enTextContainer.appendChild(spanEn); // 新しい英語字幕の<span>要素をコンテナの末尾に追加する
        
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
    } // ytplayerオブジェクトがまだ読み込まれてない場合。字幕データが存在しない場合。youtubeが再生中(PLAYING)でない場合。処理を中止する。

    const currentTime = window.ytplayer.getCurrentTime(); // 動画が再生されてからの秒数を変えす
    let activeSubtitleIndex = -1; // 動画に対応する字幕データの配列インデックス

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