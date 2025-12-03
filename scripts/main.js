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
    // NOTE: subtitle_map.jsonをスキップし、特定のファイルパスを直接使用
    const videoId = 'M7lc1UVf-VE'; // デモ動画IDを直接指定
    const subtitlePath = 'json/jimaku/transcript.json'; // 指定されたパスを直接使用

    // 字幕JSON読み込み
    try {
      const res = await fetch(subtitlePath);
      if (!res.ok) throw new Error(`字幕JSONが見つかりません: ${res.status}`);
      eventsData = await res.json(); // JSON配列として読み込む

      // --- 変更点 3: 初期表示の呼び出しを contents-6.jsに委譲 ---
      if (window.initializeTranscriptDisplay) {
        window.initializeTranscriptDisplay(eventsData);
      }
      // --------------------

    } catch (err) {
      console.error(err);
      eventsData = []; // 読み込めなければ空配列
    }

    // YouTubeプレイヤー初期化
    window.onYouTubeIframeAPIReady = function () {
      if (!videoId || videoId === "unknown") {
        document.getElementById('player').innerHTML = '<p>unknown</p>';
        return;
      }

      ytplayer = new YT.Player('player', {
        videoId: videoId,
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

  // 翻訳タブの切り替え機能 (※ contents-6.jsで再定義しているため、こちらを削除しても動作しますが、構造保持のため残しています)
  const tabButtons = document.querySelectorAll('.tab-button');
  const langContents = document.querySelectorAll('.lang-text');

  tabButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      // 全部のボタンのactiveクラスを削除
      tabButtons.forEach(btn => btn.classList.remove('active'));
      // クリックしたものにactiveクラスを追加
      button.classList.add('active');

      // すべての翻訳を非表示
      langContents.forEach(content => content.classList.remove('active'));
      // クリックされたボタンのものだけ表示
      langContents[index].classList.add('active');
    });
  });

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