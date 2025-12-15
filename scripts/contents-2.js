'use strict';

// ----------------------------------------------------
// 単語帳リスト表示・操作ロジック (contents-2.js)
// ----------------------------------------------------

// ⚠️ 注意: wordbook および saveWordbook は main.js または contents-6.js で定義されている必要があります。
//      例: let wordbook = JSON.parse(localStorage.getItem('wordbook') || '[]');
//      例: function saveWordbook() { localStorage.setItem("wordbook", JSON.stringify(wordbook)); renderWordbook(); }


// 単語追加フォームから単語を単語帳に追加する関数
function addToWordbookFromForm() {
    if (!window.wordbook || !window.saveWordbook) {
        console.error("Wordbook environment (wordbook or saveWordbook) is missing.");
        return;
    }

    const inputEnglish = document.getElementById('input-english');
    const inputJapanese = document.getElementById('input-japanese');

    if (!inputEnglish || !inputJapanese) return;

    const enText = inputEnglish.value.trim();
    const jaText = inputJapanese.value.trim();

    if (!enText || !jaText) {
        alert("英語と日本語の両方を入力してください。");
        return;
    }

    // 既に存在するかのチェック (データ形式が混在していても対応)
    const exists = window.wordbook.some(w => {
        // wが文字列ならそのまま、オブジェクトならw.enを使用
        const existingText = (typeof w === 'string') ? w : w.en;
        return existingText.toLowerCase() === enText.toLowerCase();
    });

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
        const item = window.wordbook[index];

        // 文字列データだった場合、オブジェクトに変換して保存し直す
        if (typeof item === 'string') {
            // 日本語訳がない場合は空を設定
            window.wordbook[index] = { en: item, ja: '', learned: true };
        } else {
            item.learned = !item.learned;
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


// 単語帳リストを画面に描画する関数（contents-2.html専用の描画ロジック）
window.renderWordbook = function() {
    const list = document.getElementById("wordbook-list");

    if (!list || !window.wordbook) return;

    list.innerHTML = "";

    if (window.wordbook.length === 0) {
        list.innerHTML = `<li class="empty-list-message">まだ単語が登録されていません。</li>`;
        attachEventListeners(); // ← ここで必ず呼ぶ
        return;
    }

    window.wordbook.forEach((item, index) => {
        // データ正規化: 文字列データが来てもオブジェクトとして扱う
        let wordObj;
        if (typeof item === 'string') {
            wordObj = { en: item, ja: '', learned: false };
        } else {
            wordObj = item;
        }

        const li = document.createElement("li");
        li.className = "word-item";

        if (wordObj.learned) {
            li.classList.add("learned");
        }

        // 改行コードを <br> に変換
        const displayedEn = wordObj.en.replace(/\n/g, '<br>');

        // HTML構造の生成
        li.innerHTML = `
            <div class="word-text">
                <div class="word-header">
                    <span class="english">${displayedEn}</span>
                    <button class="speak-btn-word" data-text="${wordObj.en}" data-lang="en-US">🔊</button>
                </div>
                <span class="japanese">${wordObj.ja || ''}</span>
            </div>
            <div class="word-controls">
                <button class="learned-button" data-index="${index}">
                    ${wordObj.learned ? '✓ 完了' : '学習する'}
                </button>
                <button class="delete-button" data-index="${index}">
                    &times;
                </button>
            </div>`;

        list.appendChild(li);
    });

    attachEventListeners();
}

// ボタンにイベントリスナーを設定する関数
function attachEventListeners() {
    // 1. 削除ボタンのイベント
    document.querySelectorAll('.delete-button').forEach(button => {
        if (button._eventAttached) return;
        button._eventAttached = true;

        button.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            deleteWord(index);
        });
    });

    // 2. 読み上げボタンのイベント（修正: 削除ボタンのループの外に出しました）
    document.querySelectorAll('.speak-btn-word').forEach(button => {
        if (button._eventAttached) return;
        button._eventAttached = true;

        button.addEventListener('click', (e) => {
            e.stopPropagation(); // 親要素へのクリック伝播を防ぐ

            const text = e.currentTarget.dataset.text;
            const lang = e.currentTarget.dataset.lang;

            // main.jsで作った関数を呼ぶ
            if (window.speakText) {
                window.speakText(text, lang);
            }
        });
    });

    // 3. 記憶済みボタンのイベント
    document.querySelectorAll('.learned-button').forEach(button => {
        if (button._eventAttached) return;
        button._eventAttached = true;

        button.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            toggleLearned(index);
        });
    });

    // 4. 単語追加ボタンのイベント (フォーム用)
    const addButton = document.getElementById('add-word-button');
    if (addButton && !addButton._eventAttached) {
        addButton._eventAttached = true;
        addButton.onclick = addToWordbookFromForm;
    }
}

// ページロード時の初期化処理
document.addEventListener('DOMContentLoaded', () => {
    // 初回描画を実行
    if (window.renderWordbook) {
        window.renderWordbook();
    }
});
