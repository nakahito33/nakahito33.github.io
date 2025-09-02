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
  let latestId = 0;
  let checkTime = null;

  // CSV読み込み
  fetch('csv/ALICE_IN_WONDERLAND.csv')
    .then(response => response.text())
    .then(text => {
      eventsData = parseCSV(text);
    });

  // CSVをパースして扱いやすいように変換
  function parseCSV(csvText) {
    const lines = csvText.trim().split("\n");
    const headers = lines[0].split(",");         // 1行目はヘッダー
    const data = lines.slice(1).map(line => {    // 2行目以降を処理
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      return {
        id: Number(values[0]),
        time: parseTimeToSeconds(values[1].replace(/^"|"$/g, "")),
        speaker: values[2],
        en_text: values[3].replace(/^"|"$/g, ""),
        ja_text: values[4].replace(/^"|"$/g, "")
      };
    });
    return data;
  }
  
  //秒数を変換
  function parseTimeToSeconds(timeStr) {
  const [hms, ms] = timeStr.split(',');
  const [hours, minutes, seconds] = hms.split(':').map(Number);

  return hours * 3600 + minutes * 60 + Number(seconds) + Number(ms) / 1000;
  }

  // 内容をリストに追加する関数
  function addEventToList(en_text, ja_text, speaker) {
    const enBox = document.querySelectorAll('.lang-text')[0];
    const jaBox = document.querySelectorAll('.lang-text')[1];

    const pEn = document.createElement('p');
    pEn.textContent = `${speaker}: ${en_text}`;
    if (enBox.firstChild) {
      enBox.insertBefore(pEn, enBox.firstChild);  // 先頭に追加
    } else {
      enBox.appendChild(pEn); // 最初の要素は普通に追加(この処理消すとデータが空になるためエラー発生)
    }

    const pJa = document.createElement('p');
    pJa.textContent = `${speaker}: ${ja_text}`;
     if (jaBox.firstChild) {
      jaBox.insertBefore(pJa, jaBox.firstChild);
    } else {
      jaBox.appendChild(pJa);
    }
  }

  // 再生状態の変化を検知
  function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
      checkTime = setInterval(() => {
        const currentTime = ytplayer.getCurrentTime();

        // JSONのイベントを確認
        eventsData.forEach(ev => {
          if (ev.time <= currentTime && ev.id > latestId) {
            addEventToList(ev.en_text, ev.ja_text, ev.speaker);
            latestId = ev.id;
          }
        });
      }, 500);

    } else if (event.data === YT.PlayerState.PAUSED) {
      clearInterval(checkTime);
    }
  }

  // iframeのセットアップ
  window.onYouTubeIframeAPIReady = function () {
    ytplayer = new YT.Player('player', {
      videoId: 'BPNZdXZ5_HA',             //ここ変更すると再生する動画が変えられる
      events: {
        onStateChange: onPlayerStateChange
      }
    });
  };

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