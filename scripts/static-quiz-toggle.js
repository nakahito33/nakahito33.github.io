'use strict';

/**
 * クイズセクションの答え表示/非表示を切り替えるロジック
 */
function attachQuizAnswerToggle() {
    // すべての「答え」ボタンを取得
    const answerButtons = document.querySelectorAll('.answer-button');

    answerButtons.forEach(button => {
        // ボタンにクリックイベントを設定
        button.addEventListener('click', function() {
            // 1. クリックされたボタンの親コンテナ (.answer-container) を取得
            const container = this.closest('.answer-container');
            
            if (!container) return;

            // 2. 同じコンテナ内の答えのテキスト要素 (.answer-text) を取得
            const answerText = container.querySelector('.answer-text');

            if (!answerText) return;

            // 3. answer-text の 'hidden' クラスをトグルする
            answerText.classList.toggle('hidden');

            // 4. ボタンのテキストも変更し、状態を分かりやすくする
            if (answerText.classList.contains('hidden')) {
                this.textContent = '答えを表示';
            } else {
                this.textContent = '答えを非表示';
            }
        });
    });
}

// ページロード時に実行
document.addEventListener('DOMContentLoaded', attachQuizAnswerToggle);