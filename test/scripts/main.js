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