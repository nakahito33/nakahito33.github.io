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

  // 内容をリストに追加
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
    if (event.data === YT.PlayerState.PLAYING) {
      checkTime = setInterval(() => {
        const currentTime = ytplayer.getCurrentTime();
        
        // 動画が戻された場合、字幕をクリア
        if (currentTime < latestTime) {
          document.querySelectorAll('.lang-text').forEach(box => box.innerHTML = '');
          latestTime = 0;
        }
        
        eventsData.forEach(ev => {
          if (ev.start <= currentTime && ev.start > latestTime) {
            addEventToList(ev.text, ev.translated, ev.speaker);
            latestTime = ev.start;
          }
        });
      }, 500);
    } else if (event.data === YT.PlayerState.PAUSED) {
      clearInterval(checkTime);
    }
  }

  // 初期化処理
  async function init() {
    const video = getVideoFromUrl();
    console.log("URLから取得したvideo:", video);

    // JSONマップ読み込み
    const mapResponse = await fetch("json/subtitle_map.json");
    if (!mapResponse.ok) {
      console.error("subtitle_map.json が見つかりません", mapResponse.status);
      return;
    }
    const map = await mapResponse.json();
    const entry = map[video] || map["default"];

    const videoId = entry.videoId;
    const subtitlePath = entry.subtitle;

    // 字幕JSON読み込み
    try {
      const res = await fetch(subtitlePath);
      if (!res.ok) throw new Error(`字幕JSONが見つかりません: ${res.status}`);
      eventsData = await res.json(); // JSON配列として読み込む
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