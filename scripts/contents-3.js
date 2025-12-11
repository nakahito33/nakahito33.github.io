'use strict';

const form = document.getElementById('dictionary-form');
const searchInput = document.getElementById('search-input');
const resultsDiv = document.getElementById('search-results');

// 辞書データを保持する変数
let dictionaryData = null;

/**
 * データの読み込み
 */
async function loadDictionary() {
    try {
        const response = await fetch('json/words.json');
        if (!response.ok) throw new Error('辞書データが見つかりません');
        dictionaryData = await response.json();
    } catch (error) {
        console.error('読み込みエラー:', error);
    }
}

/**
 * 結果の表示ロジック (以前のものを流用)
 */
function renderResult(data) {
    let html = `<h3>${data.word} <span class="part-of-speech">${data.partOfSpeech}</span></h3>`;
    html += `<dl><dt>定義</dt><dd>${data.definition}</dd></dl>`;
    
    if (data.examples.length > 0) {
        html += '<div class="example-sentences"><dt>例文</dt><ul>';
        data.examples.forEach(ex => html += `<li>${ex}</li>`);
        html += '</ul></div>';
    }

    html += `<div class="synonyms-antonyms">
                <p><strong>類義語:</strong> ${data.synonyms.join(', ')}</p>
                <p><strong>反意語:</strong> ${data.antonyms.join(', ')}</p>
             </div>`;
    resultsDiv.innerHTML = html;
}

// 初期実行
loadDictionary();

// 検索イベント
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const word = searchInput.value.toLowerCase().trim();

    if (!dictionaryData) return;

    if (dictionaryData[word]) {
        renderResult(dictionaryData[word]);
    } else {
        resultsDiv.innerHTML = `<p class="initial-message">「${word}」は辞書に登録されていません。<br>現在はデモ用単語（everybody, welcome）のみ対応しています。</p>`;
    }
});