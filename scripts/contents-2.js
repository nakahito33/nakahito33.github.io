'use strict';

const swiper = new Swiper(".swiper", {
  centeredSlides: true, // 1枚目のスライドを中央にする
  loop: true, // ループさせる
  speed: 1500, // 少しゆっくり(デフォルトは300)
  slidesPerView: 3.5, // スライドの表示枚数
  autoplay: { // 自動再生
    delay: 1000, // 3秒後に次のスライド
    disableOnInteraction: false, // 矢印をクリックしても自動再生を止めない
  },
  // ページネーション
  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },
  // 前後の矢印
  navigation: {
    nextEl: ".swiper-button-next",
    prevEl: ".swiper-button-prev",
  },
});
