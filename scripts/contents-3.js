'use strict';

// ----------------------------------------------------
// CineLingua コンテンツ3用 辞書機能ロジック (contents-3.js)
// ----------------------------------------------------

// 検索フォームと結果表示エリアのDOM要素を取得
const form = document.getElementById('dictionary-form');
const searchInput = document.getElementById('search-input');
const resultsDiv = document.getElementById('search-results');

/**
 * 検索結果データをHTMLとして整形し、DOMに挿入する関数。
 * @param {object} data - AIエージェントから返された辞書データ。
 */
function renderDictionaryResult(data) {
    // 検索単語と品詞をタイトルとして設定
    let html = `<h3>${data.word} <span class="part-of-speech">${data.partOfSpeech}</span></h3>`;
    
    // 定義
    html += '<dl><dt>定義 (Definition)</dt>';
    html += `<dd>${data.definition}</dd></dl>`;
    
    // 例文
    if (data.examples && data.examples.length > 0) {
        html += '<div class="example-sentences"><dt>例文 (Example Sentences)</dt><ul>';
        data.examples.forEach(ex => {
            html += `<li>${ex}</li>`;
        });
        html += '</ul></div>';
    }
    
    // 類義語・反意語
    html += '<div class="synonyms-antonyms">';
    if (data.synonyms && data.synonyms.length > 0) {
        html += `<p><strong>類義語:</strong> ${data.synonyms.join(', ')}</p>`;
    }
    if (data.antonyms && data.antonyms.length > 0) {
        html += `<p><strong>反意語:</strong> ${data.antonyms.join(', ')}</p>`;
    }
    html += '</div>';

    resultsDiv.innerHTML = html;
}

/**
 * AIエージェントに単語を問い合わせる非同期関数。
 * (※ 実際にはバックエンドAPIを叩く処理だが、ここでは模擬的に応答を生成する)
 * @param {string} word - 検索する英単語。
 * @returns {Promise<object>} - 辞書データのPromise。
 */
async function fetchDictionaryData(word) {
    // 検索結果を私のAIエージェント機能で生成
    let aiResponse = await generateDictionaryResponse(word);
    
    return aiResponse;
}

/**
 * AIエージェントの応答を生成するヘルパー関数
 */
async function generateDictionaryResponse(word) {
    // 検索単語を小文字に統一
    const lowerWord = word.toLowerCase().trim();

    // 実際のアプリケーションでは、ここで外部APIを呼び出します。
    // ここでは、私（Gemini）がそのAPIの応答をシミュレートします。
    
    // 1. デモ単語: everybody
    if (lowerWord === 'everybody') {
        return {
            word: "Everybody",
            definition: "すべての人。すべての者。一般的な意味で、グループ全体を指す。",
            partOfSpeech: "代名詞 (Pronoun)",
            examples: [
                "Everybody seems happy about the long weekend.",
                "Please make sure everybody has a copy of the report.",
                "Is everybody ready to start the presentation?"
            ],
            synonyms: ["Everyone", "All", "Each and every person"],
            antonyms: ["Nobody", "No one"]
        };
    } 
    // 2. デモ単語: welcome
    else if (lowerWord === 'welcome') {
         return {
            word: "Welcome",
            definition: "（動詞）誰かを歓迎する。（形容詞）歓迎される、喜ばれる。（間投詞）挨拶。",
            partOfSpeech: "動詞 / 形容詞 / 間投詞",
            examples: [
                "We welcome constructive criticism from our users. (動詞)",
                "The cool rain was a welcome relief after the long dry spell. (形容詞)",
                "Welcome to the CineLingua dictionary! (間投詞)"
            ],
            synonyms: ["Greet", "Receive", "Accept", "Pleasant"],
            antonyms: ["Reject", "Exclude", "Unwanted"]
        };
    } 
    // 3. その他の単語 (フォールバック)
    else {
         return {
            word: word,
            definition: "現在、デモ単語 ('everybody', 'welcome') 以外の検索は、情報が登録されていないため行えません。（デモ中）",
            partOfSpeech: "情報なし",
            examples: [],
            synonyms: [],
            antonyms: []
        };
    }
}


// DOM読み込み後にイベントリスナーを設定
document.addEventListener('DOMContentLoaded', () => {

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // フォームのデフォルト送信を防ぐ

            const word = searchInput.value.trim();
            if (!word) {
                resultsDiv.innerHTML = '<p class="initial-message">単語を入力してください。</p>';
                return;
            }

            // ローディングメッセージを表示
            resultsDiv.innerHTML = '<p class="initial-message">AIエージェントが辞書を検索中です...</p>';

            try {
                // AIエージェント（私）に問い合わせ
                const dictionaryData = await fetchDictionaryData(word);
                
                // 結果を整形して表示
                if (dictionaryData) {
                    renderDictionaryResult(dictionaryData);
                } else {
                    resultsDiv.innerHTML = '<p class="initial-message">検索結果が見つかりませんでした。</p>';
                }
            } catch (error) {
                console.error("辞書検索エラー:", error);
                resultsDiv.innerHTML = '<p class="initial-message">検索中にエラーが発生しました。時間を置いて再度お試しください。</p>';
            }
        });
    }

});