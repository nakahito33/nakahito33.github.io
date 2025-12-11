'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // すべてのフォーム要素を取得
  const forms = document.querySelectorAll('form');

  // 各フォームにイベントリスナーを設定
  forms.forEach(form => {
    form.addEventListener('submit', (event) => {
      event.preventDefault(); // デフォルトのフォーム送信を停止

      // フォーム内の入力フィールドとエラーメッセージを取得
      const emailInput = form.querySelector('input[type="email"]');
      const passwordInput = form.querySelector('input[type="password"]');
      const emailError = emailInput.nextElementSibling;
      const passwordError = passwordInput.nextElementSibling;

      // エラーメッセージの表示をリセット
      emailError.style.display = 'none';
      passwordError.style.display = 'none';
      
      let isValid = true;

      // メールアドレスが空かチェック
      if (emailInput.value.trim() === '') {
        emailError.style.display = 'block';
        isValid = false;
      }
      
      // パスワードが空かチェック
      if (passwordInput.value.trim() === '') {
        passwordError.style.display = 'block';
        isValid = false;
      }

      // すべての入力が有効であれば、ページを遷移
      if (isValid) {
        window.location.href = 'index.html';
      }
    });
  });
});

// これいらなくなっちゃった
