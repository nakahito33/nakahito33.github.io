'use strict';

const wordbook = JSON.parse(localStorage.getItem("wordbook") || "[]");
const list = document.getElementById("wordbook-list");

if (wordbook.length === 0) {
    list.innerHTML = "<li>まだ単語が登録されていません。</li>";
} else {
    wordbook.forEach(w => {
        const li = document.createElement("li");
        li.textContent = w;
        list.appendChild(li);
    });
}