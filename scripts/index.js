'use strict';

const swiper = new Swiper(".swiper", {
  centeredSlides: true, 
  loop: true, 
  loopAdditionalSlides: 2,
  
  // スライド間の隙間を20pxにする
  spaceBetween: 20,

  speed: 1500, 
  slidesPerView: 3.5, 
  autoplay: { 
    delay: 1000, 
    disableOnInteraction: false, 
  },
  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },
  navigation: {
    nextEl: ".swiper-button-next",
    prevEl: ".swiper-button-prev",
  },
});