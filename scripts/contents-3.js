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
    // 検索単語に応じてAIエージェントが結果を生成
    let result = await google.search({queries: [`英語 ${word} の定義、品詞、例文3つ、類義語と反意語`]});
    
    // ここでGoogle Searchの結果を解析し、構造化されたデータに変換する処理を実装する必要があります。
    // 現状では、AIアシスタントである私自身が、直接構造化されたデータを生成します。

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

    // 実際のアプリケーションでは、ここで外部API (例: Google Gemini API) を呼び出します。
    // ここでは、私（Gemini）がそのAPIの応答をシミュレートします。
    
    // 例外的な単語の模擬データ (実際にはAIが生成)
    if (lowerWord === 'resilient') {
        return {
            word: "Resilient",
            definition: "困難、圧力、または予期せぬ変化から、すぐに立ち直る、回復力のある、弾力性のある。",
            partOfSpeech: "形容詞",
            examples: [
                "Despite the major setback, the team proved to be resilient and finished the project on time.",
                "The local economy is surprisingly resilient to global market fluctuations.",
                "Children are often more resilient than adults give them credit for."
            ],
            synonyms: ["Flexible", "Tough", "Hardy", "Buoyant"],
            antonyms: ["Fragile", "Vulnerable", "Weak"]
        };
    } else if (lowerWord === 'elucidate') {
         return {
            word: "Elucidate",
            definition: "何かをより明確に説明すること、特に複雑な問題を詳細に解き明かすこと。",
            partOfSpeech: "動詞",
            examples: [
                "The professor was asked to elucidate the core concepts of quantum physics.",
                "Could you please elucidate the process for filing a tax return?",
                "Historical documents can often elucidate the motivations of political leaders."
            ],
            synonyms: ["Clarify", "Explain", "Illuminate", "Explicate"],
            antonyms: ["Obscure", "Confuse", "Complicate"]
        };
    } else {
        // AIエージェントに直接問い合わせる（複雑な単語処理はAIに任せる）
        const query = `英単語 '${word}' の定義、品詞、例文2つ、類義語と反意語を日本語で簡潔に解説してください。`;
        const result = await google.search({queries: [query]});
        
        // 外部検索の結果は整形が必要ですが、ここではユーザーに返すために一旦整形をスキップします。
        // ※ 実際のアプリでは、ここで外部検索結果をパースし、renderDictionaryResultに渡せる形式に変換する必要があります。

        // 検索結果を直接表示する代替ロジック
         return {
            word: word,
            definition: result, // 検索結果の生テキストを定義として表示
            partOfSpeech: "N/A",
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