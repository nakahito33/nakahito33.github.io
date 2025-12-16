'use strict';

// --------------------------------------------------------
// GAS経由 AI辞書 (contents-3.js)
// --------------------------------------------------------

// ★ここにステップ3でコピーしたGASのURLを貼る
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxZi5NGHgMVixSQg6Wwc9BufRbx_JkwhK8PcDkpebC4d5Q5iQevlzTwpttbEOzVv4q86w/exec"; 

const form = document.getElementById('dictionary-form');
const searchInput = document.getElementById('search-input');
const resultsDiv = document.getElementById('search-results');

// 結果表示用関数
function renderResult(data) {
    let html = `<h3>${data.word} <span class="part-of-speech">${data.partOfSpeech}</span></h3>`;
    html += `<dl><dt>定義</dt><dd>${data.definition}</dd></dl>`;
    
    if (data.examples && data.examples.length > 0) {
        html += '<div class="example-sentences"><dt>例文</dt><ul>';
        data.examples.forEach(ex => html += `<li>${ex}</li>`);
        html += '</ul></div>';
    }

    // 類義語・対義語がある場合のみ表示
    if (data.synonyms && data.synonyms.length > 0) {
        html += `<div class="synonyms-antonyms"><p><strong>類義語:</strong> ${data.synonyms.join(', ')}</p>`;
    }
    if (data.antonyms && data.antonyms.length > 0) {
        html += `<p><strong>反意語:</strong> ${data.antonyms.join(', ')}</p></div>`;
    }
    
    // 単語帳に追加ボタン（main.jsの機能と連携）
    html += `<div style="margin-top:20px;">
             <button onclick="addToWordbook('${data.word}')" style="padding:8px 16px; background:#ff8b5e; border:none; border-radius:4px; color:#fff; cursor:pointer;">
               + 単語帳に追加
             </button>
             </div>`;

    resultsDiv.innerHTML = html;
}

// 検索イベント
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const word = searchInput.value.trim();
    if (!word) return;

    // ローディング表示
    resultsDiv.innerHTML = `<div class="loading">AIが解説を生成中...<br><span>Generating definition for "${word}"...</span></div>`;

    try {
        // GASへデータを送信 (POST)
        // ※GASの仕様上、CORSエラーが出ないように 'text/plain' として送るのがコツです
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify({ word: word }) 
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        renderResult(data);

    } catch (error) {
        console.error('AI検索エラー:', error);
        resultsDiv.innerHTML = `<p class="error-message">検索に失敗しました。<br>時間をおいて再度お試しください。</p>`;
    }
});
