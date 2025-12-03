'use strict';

/**
 * ============================================================
 * 6. その他：グローバル変数定義・初期設定
 * ============================================================
 */
// 複数の関数からアクセスされる変数を定義
let ytplayer;
let eventsData;
let wordbook = JSON.parse(localStorage.getItem("wordbook") || "[]");

// 変数はここで公開してOK
window.ytplayer = ytplayer;
window.eventsData = eventsData;
// ※ addToWordbook の公開は、関数を作ったあと（下の方）で行います

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
   * 2. 単語帳生成の部分
   * ============================================================
   */
  // 単語帳をローカルストレージに保存
  function saveWordbook() {
    localStorage.setItem("wordbook", JSON.stringify(wordbook));
    renderWordbook();
  }

  // 単語帳リストを画面に描画
  function renderWordbook() {
    const list = document.getElementById("wordbook-list"); // id=wordbook-listであるもの、<ul>をlistに格納する
    if (!list) return; // エラー防止

    list.innerHTML = ""; // 既存のリストの初期化
    wordbook.forEach(w => { // wordbook配列の要素をひとつづつとりだし、wに代入してループ処理を実行する
      const li = document.createElement("li"); // 新しい<li>をHTMLに作成
      li.textContent = w; // <li>のテキスト内容を現在のwにする
      list.appendChild(li);
    });
  }

  // 単語を追加する関数
  function addToWordbook(text) {
    console.log("クリック検知:", text);
    if (!wordbook.includes(text)) {
      wordbook.push(text);
      saveWordbook();
      console.log("単語帳に追加:", text);
    }
  }

  // 修正箇所：関数が定義されたので、ここで外部に公開します
  window.addToWordbook = addToWordbook;

  // 初期表示時に単語帳を描画
  renderWordbook();


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

  // プレーヤーの状態変化時（再生・一時停止など）
  function onPlayerStateChange(event) {
    console.log('main.js: Player State Change Detected ->', event.data);

    // 外部ファイル（contents-6.js等）の関数があれば実行
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
      if (!videoId || videoId === "unknown") {
        const playerDiv = document.getElementById('player');
        if(playerDiv) playerDiv.innerHTML = '<p>unknown</p>';
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
             if(playerDiv) playerDiv.innerHTML = '<p>Error loading player</p>';
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

  // YouTube関連の初期化を実行
  initYouTubeAndSubtitles();

});


/*　この下がもともとあった部分

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

  let ytplayer;
  let eventsData;
  let latestTime = 0;
  let checkTime = null;
  let wordbook = JSON.parse(localStorage.getItem("wordbook") || "[]");

  // --- 変更点 1: グローバル変数・関数の公開 ---
  window.ytplayer = ytplayer;
  window.eventsData = eventsData;
  window.addToWordbook = addToWordbook;
  // --------------------

  function saveWordbook() {
    localStorage.setItem("wordbook", JSON.stringify(wordbook));
    renderWordbook();
  }

  function renderWordbook() {
    const list = document.getElementById("wordbook-list");
    list.innerHTML = "";
    wordbook.forEach(w => {
      const li = document.createElement("li");
      li.textContent = w;
      list.appendChild(li);
    });
  }

  function addToWordbook(text) {
    console.log("クリック検知:", text);
    if (!wordbook.includes(text)) {
      wordbook.push(text);
      saveWordbook();
      console.log("単語帳に追加:", text);
    }
  }

  // URLからキーを取得
  function getVideoFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("video") || "default";
  }

  // 内容をリストに追加 (使われなくなりましたが、構造保持のため残しています)
  function addEventToList(text, translated, speaker) {
    const enBox = document.querySelectorAll('.lang-text')[0];
    const jaBox = document.querySelectorAll('.lang-text')[1];

    const pEn = document.createElement('p');
    pEn.textContent = `${speaker}: ${text}`;
    pEn.addEventListener('click', () => addToWordbook(text));


    const pJa = document.createElement('p');
    pJa.textContent = `${speaker}: ${translated}`;
    pJa.addEventListener('click', () => addToWordbook(translated));

    if (enBox.firstChild) enBox.insertBefore(pEn, enBox.firstChild);
    else enBox.appendChild(pEn);

    if (jaBox.firstChild) jaBox.insertBefore(pJa, jaBox.firstChild);
    else jaBox.appendChild(pJa);
  }

  // 再生状態の変化を検知
  function onPlayerStateChange(event) {
    // デバッグ用ログ: これが出れば main.js は正常です
    console.log('main.js: Player State Change Detected ->', event.data);

    // --- 変更点 2: 既存の字幕ロジックを削除し、contents-6.jsに委譲 ---
    if (window.handlePlayerStateChange) {
      window.handlePlayerStateChange(event);
    }
    // --------------------
  }

  // 初期化処理
  async function init() {
    const video = getVideoFromUrl();
    console.log("URLから取得したvideo:", video);

    // --- 字幕パスと動画IDの特定方法を変更 ---
    const videoId = 'M7lc1UVf-VE'; // デモ動画IDを直接指定
    const subtitlePath = 'json/jimaku/transcript.json'; // 指定されたパスを直接使用

    // 字幕JSON読み込み
    try {
      const res = await fetch(subtitlePath);
      if (!res.ok) throw new Error(`字幕JSONが見つかりません: ${res.status}`);
      eventsData = await res.json(); // JSON配列として読み込む

      // データをグローバル変数にセット（重要）
      window.eventsData = eventsData;

      // --- 変更点 3: 初期表示の呼び出しを contents-6.jsに委譲 ---
      if (window.initializeTranscriptDisplay) {
        window.initializeTranscriptDisplay(eventsData);
      }
      // --------------------
      
    } catch (err) {
      console.error(err);
      eventsData = []; // 読み込めなければ空配列
    }

    // 🚨 修正ポイント: 現在のオリジン（URL）を取得 🚨
    // これにより http://127.0.0.1:5501 などのローカル環境でも通信が許可されます
    const currentOrigin = window.location.origin;

    // YouTubeプレイヤー初期化
    window.onYouTubeIframeAPIReady = function () {
      if (!videoId || videoId === "unknown") {
        document.getElementById('player').innerHTML = '<p>unknown</p>';
        return;
      }

      ytplayer = new YT.Player('player', {
        videoId: videoId,
        // 🚨 修正ポイント: host と origin を明示的に設定して通信エラーを防ぐ 🚨
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
            document.getElementById('player').innerHTML = '<p>unknown</p>';
          }
        }
      });
      // ytplayerオブジェクトが生成されたら、window.ytplayerも更新
      window.ytplayer = ytplayer; 
    };
  }

  // DOM読み込み後に初期化
  window.addEventListener("DOMContentLoaded", init);

  // YouTube IFrame API スクリプト読み込み
  const scriptTag = document.createElement('script');
  scriptTag.src = 'https://www.youtube.com/iframe_api';
  document.body.appendChild(scriptTag);

  // 翻訳タブの切り替え機能
  const tabButtons = document.querySelectorAll('.tab-button');
  const langContents = document.querySelectorAll('.lang-text');

  tabButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      langContents.forEach(content => content.classList.remove('active'));
      langContents[index].classList.add('active');
    });
  });

  // クイズの答え表示機能
  const answerButtons = document.querySelectorAll('.answer-button');

  answerButtons.forEach(button => {
    button.addEventListener('click', () => {
      const answerText = button.nextElementSibling;
      if (answerText) {
        answerText.classList.toggle('hidden');
      }
    });
  });
});

*/