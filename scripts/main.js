'use strict';

// 複数の関数からアクセスされる変数を定義
let ytplayer;
let eventsData;
// wordbookのデータ構造をオブジェクトの配列に変更: [{en: 'word', ja: '単語', learned: false}, ...]
let wordbook = JSON.parse(localStorage.getItem("wordbook") || "[]");

// 変数はここで公開してOK
window.ytplayer = ytplayer;
window.eventsData = eventsData;
// ★ contents-2.jsでデータ操作を行うため、wordbookを公開
window.wordbook = wordbook;

// 単語帳に単語を追加する関数 (字幕クリック時に呼ばれることを想定)
function addToWordbook(enText) {
  if (!enText || typeof enText !== 'string') {
    return;
  }

  // 既に存在するかのチェック (データ形式が混在していても対応)
  const exists = window.wordbook.some(w => {
    const existingText = (typeof w === 'string') ? w : w.en;
    return existingText.toLowerCase() === enText.toLowerCase();
  });

  if (!exists) {
    const newWord = { en: enText, ja: "", learned: false };
    window.wordbook.push(newWord);

    // main.jsで公開されている保存関数を呼び出し、再描画をトリガー
    if (window.saveWordbook) {
      window.saveWordbook();
      console.log("単語帳に追加:", newWord);
    }
  }
}

// ★ addToWordbookをグローバルに公開（contents-6.htmlなどから呼び出されるため）
window.addToWordbook = addToWordbook;


// DOM読み込み完了後に各機能を実行
document.addEventListener('DOMContentLoaded', function () {

  /**
   * ============================================================
   * 1. ハンバーガーメニュー
   * ============================================================
   */
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


  /**
   * ============================================================
   * 2. 単語帳生成の部分 (contents-2.jsへの移譲)
   * ============================================================
   */

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


  /**
   * ============================================================
   * 3. 翻訳タブの切り替え
   * ============================================================
   */
  const tabButtons = document.querySelectorAll('.tab-button');
  const langContents = document.querySelectorAll('.lang-text');

  if (tabButtons.length > 0 && langContents.length > 0) {
    tabButtons.forEach((button, index) => {
      button.addEventListener('click', () => {
        // すべてのボタンとコンテンツからactiveクラスを削除
        tabButtons.forEach(btn => btn.classList.remove('active'));
        langContents.forEach(content => content.classList.remove('active'));

        // クリックされたボタンと対応するコンテンツにactiveクラスを追加
        button.classList.add('active');
        // 要素が存在する場合のみ追加
        if (langContents[index]) {
          langContents[index].classList.add('active');
        }
      });
    });
  }


  /**
   * ============================================================
   * 4. クイズの答え表示機能
   * ============================================================
   */
  const answerButtons = document.querySelectorAll('.answer-button');

  answerButtons.forEach(button => {
    button.addEventListener('click', () => {
      // ボタンの直後にある要素（答えのテキスト）を取得
      const answerText = button.nextElementSibling;
      if (answerText) {
        answerText.classList.toggle('hidden');
      }
    });
  });


  /**
   * ============================================================
   * 5. YouTubeの字幕表示＆それに付随した機能
   * ============================================================
   */

  // URLから動画IDなどを取得するヘルパー関数
  function getVideoFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("video") || "default";
  }

  // プレーヤーの状態変化時（再生・一時停止など）が起きたときに実行される
  function onPlayerStateChange(event) {
    console.log('main.js: Player State Change Detected ->', event.data);

    // 外部ファイル（contents-6.js等）の関数があれば実行の
    if (window.handlePlayerStateChange) {
      window.handlePlayerStateChange(event);
    }
  }

  // YouTubeプレーヤーと字幕データの初期化
  async function initYouTubeAndSubtitles() {
    const video = getVideoFromUrl();
    console.log("URLから取得したvideo:", video);

    // 動画IDと字幕パスの設定
    const videoId = 'M7lc1UVf-VE'; // デモ用ID
    const subtitlePath = 'json/jimaku/transcript.json';

    // 1. 字幕データの読み込み
    try {
      const res = await fetch(subtitlePath);
      if (!res.ok) throw new Error(`字幕JSONが見つかりません: ${res.status}`);
      eventsData = await res.json();

      // グローバル変数へセット
      window.eventsData = eventsData;

      // 外部ファイルへ初期化を委譲
      if (window.initializeTranscriptDisplay) {
        window.initializeTranscriptDisplay(eventsData);
      }
    } catch (err) {
      console.error(err);
      eventsData = [];
    }

    // 2. YouTubeプレーヤーの準備
    const currentOrigin = window.location.origin;

    // YouTube APIが準備できた時に呼ばれる関数を定義
    window.onYouTubeIframeAPIReady = function () {
      if (!videoId || videoId === "unknown") { // 動画IDがない場合の処理
        const playerDiv = document.getElementById('player');
        if (playerDiv) playerDiv.innerHTML = '<p>unknown</p>';
        return;
      }

      ytplayer = new YT.Player('player', {
        videoId: videoId,
        host: 'https://www.youtube.com',
        playerVars: {
          'origin': currentOrigin,
          'enablejsapi': 1,
          'rel': 0,
          'playsinline': 1
        },
        events: {
          onStateChange: onPlayerStateChange,
          onError: function () {
            const playerDiv = document.getElementById('player');
            if (playerDiv) playerDiv.innerHTML = '<p>Error loading player</p>';
          }
        }
      });

      window.ytplayer = ytplayer;
    };

    // YouTube IFrame API スクリプトの動的読み込み
    const scriptTag = document.createElement('script');
    scriptTag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(scriptTag);
  }

  // --- YouTube初期化の実行 ---
  // 現在のページが 'contents-6.html' のときだけ initYouTubeAndSubtitles を実行する
  const initYouTubeAndSubtitlesIfNecessary = () => {
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage === 'contents-6.html') {
      initYouTubeAndSubtitles();
    }
  };

  // 呼び出し
  initYouTubeAndSubtitlesIfNecessary();

// main.js の末尾に追加

/**
 * テキスト読み上げ関数 (Web Speech API)
 * @param {string} text - 読み上げるテキスト
 * @param {string} lang - 言語コード (英語: 'en-US', 日本語: 'ja-JP')
 */
window.speakText = function(text, lang = 'en-US') {
    // ブラウザが対応していなければ終了
    if (!('speechSynthesis' in window)) {
        alert("お使いのブラウザは読み上げに対応していません");
        return;
    }

    // 読み上げ中のものがあればキャンセル（連打対策）
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang; 
    utter.rate = 1.0;  // 速度 (0.1 ~ 10)
    utter.pitch = 1.0; // 高さ (0 ~ 2)
    utter.volume = 1.0; // 音量 (0 ~ 1)

    window.speechSynthesis.speak(utter);
};

　　

});
