'use strict';

// HTML要素の定義
const list = document.getElementById("wordbook-list");

// 単語追加フォームから単語を単語帳に追加する関数
function addToWordbookFromForm() {
    // main.jsから公開されたデータや関数が存在しない場合は処理を中断
    if (!window.wordbook || !window.saveWordbook) return;

    const inputEnglish = document.getElementById('input-english');
    const inputJapanese = document.getElementById('input-japanese');

    if (!inputEnglish || !inputJapanese) return;

    const enText = inputEnglish.value.trim();
    const jaText = inputJapanese.value.trim();

    if (!enText || !jaText) {
        alert("英語と日本語の両方を入力してください。");
        return;
    }

    // 既に存在するかのチェック
    const exists = window.wordbook.some(w => w.en && w.en.toLowerCase() === enText.toLowerCase());

    if (!exists) {
        const newWord = { en: enText, ja: jaText, learned: false };
        window.wordbook.push(newWord);
        window.saveWordbook(); // 保存と再描画のトリガー
        
        // 入力欄をクリア
        inputEnglish.value = '';
        inputJapanese.value = '';
    } else {
        alert(`「${enText}」は既に登録されています。`);
    }
}

// 記憶フラグを切り替える関数
function toggleLearned(index) {
    if (!window.wordbook || !window.saveWordbook) return;

    if (index >= 0 && index < window.wordbook.length) {
        const word = window.wordbook[index];
        // データ構造がオブジェクトであることを確認し、learnedフラグを切り替える
        if (typeof word === 'object' && word !== null) {
            word.learned = !word.learned;
        } else {
            // 旧来の文字列データの場合はオブジェクト構造に変換
            window.wordbook[index] = { en: word, ja: '(未定義)', learned: true };
        }
        window.saveWordbook();
    }
}

// 単語をリストから削除する関数
function deleteWord(index) {
    if (!window.wordbook || !window.saveWordbook) return;

    if (index >= 0 && index < window.wordbook.length) {
        window.wordbook.splice(index, 1);
        window.saveWordbook();
    }
}


// 単語帳リストを画面に描画する関数（main.jsのものを上書き）
window.renderWordbook = function() {
    if (!list || !window.wordbook) return;

    list.innerHTML = "";
    
    if (window.wordbook.length === 0) {
        list.innerHTML = `<li class="empty-list-message">まだ単語が登録されていません。</li>`;
        return;
    }

    window.wordbook.forEach((w, index) => {
        const li = document.createElement("li");
        li.className = "word-item";

        // 記憶フラグに基づいたクラス名を追加
        if (w.learned) {
            li.classList.add("learned");
        }
        
        // 単語の内容とコントロールボタンのHTML
        li.innerHTML = `
          <div class="word-text">
            <span class="english">${w.en || w}</span>
            <span class="japanese">${w.ja || ''}</span>
          </div>
          <div class="word-controls">
            <button class="learned-button" data-index="${index}">
              ${w.learned ? '✓ 記憶済み' : '☐ 未学習'}
            </button>
            <button class="delete-button" data-index="${index}">
              &times;
            </button>
          </div>
        `;
        list.appendChild(li);
    });

    // 描画後にボタンにイベントリスナーを再設定
    attachEventListeners();
}

// ボタンにイベントリスナーを設定する関数
function attachEventListeners() {
    // 削除ボタンのイベント
    document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            deleteWord(index);
        });
    });

    // 記憶済みボタンのイベント
    document.querySelectorAll('.learned-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            toggleLearned(index);
        });
    });
    
    // 単語追加ボタンのイベント (フォーム用)
    const addButton = document.getElementById('add-word-button');
    if (addButton) {
        addButton.onclick = addToWordbookFromForm;
    }
}

// ページロード時の初期化処理
document.addEventListener('DOMContentLoaded', () => {
    // 初回描画を実行
    // main.jsのDOM読み込み完了後に実行されることを想定しているため、これで動作する。
    if (window.renderWordbook) {
        window.renderWordbook();
    }
});