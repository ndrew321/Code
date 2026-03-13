const form = document.getElementById("calc-form");
const expressionInput = document.getElementById("expression");
const resultValue = document.getElementById("result-value");
const errorMessage = document.getElementById("error-message");
const keypad = document.querySelector(".keypad");
const historyList = document.getElementById("history-list");
const historyEmpty = document.getElementById("history-empty");
const clearAllBtn = document.getElementById("clear-all-history");

const HISTORY_KEY = "calc_history";
const HISTORY_MAX = 50;

function insertAtCursor(value) {
  const start = expressionInput.selectionStart ?? expressionInput.value.length;
  const end = expressionInput.selectionEnd ?? expressionInput.value.length;
  const nextValue =
    expressionInput.value.slice(0, start) + value + expressionInput.value.slice(end);

  expressionInput.value = nextValue;
  const caret = start + value.length;
  expressionInput.focus();
  expressionInput.setSelectionRange(caret, caret);
}

function updateResultDisplay(value) {
  resultValue.textContent = value;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(entries) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

function formatTimestamp(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderHistory() {
  const entries = loadHistory();
  historyList.innerHTML = "";

  if (entries.length === 0) {
    historyEmpty.hidden = false;
    return;
  }

  historyEmpty.hidden = true;
  entries.forEach((entry, index) => {
    const li = document.createElement("li");
    li.className = "history-item";
    li.innerHTML = `
      <button type="button" class="history-expr" data-expression="${escapeHtml(entry.expression)}" title="Reuse expression">
        <span class="history-expr-text">${escapeHtml(entry.expression)}</span>
        <span class="history-result">= ${escapeHtml(String(entry.result))}</span>
      </button>
      <div class="history-actions">
        <span class="history-time">${escapeHtml(formatTimestamp(entry.timestamp))}</span>
        <button type="button" class="history-copy" data-expression="${escapeHtml(entry.expression)}" title="Copy expression" aria-label="Copy expression">⧉</button>
        <button type="button" class="history-delete" data-index="${index}" title="Remove entry" aria-label="Remove entry">✕</button>
      </div>`;
    historyList.appendChild(li);
  });
}

function addToHistory(expression, result) {
  const entries = loadHistory();
  entries.unshift({ expression, result, timestamp: new Date().toISOString() });
  if (entries.length > HISTORY_MAX) {
    entries.length = HISTORY_MAX;
  }
  saveHistory(entries);
  renderHistory();
}

historyList.addEventListener("click", (event) => {
  const exprBtn = event.target.closest(".history-expr");
  if (exprBtn) {
    expressionInput.value = exprBtn.dataset.expression;
    expressionInput.focus();
    const len = expressionInput.value.length;
    expressionInput.setSelectionRange(len, len);
    return;
  }

  const copyBtn = event.target.closest(".history-copy");
  if (copyBtn) {
    navigator.clipboard.writeText(copyBtn.dataset.expression).then(() => {
      const original = copyBtn.textContent;
      copyBtn.textContent = "✓";
      setTimeout(() => { copyBtn.textContent = original; }, 1200);
    }).catch(() => {});
    return;
  }

  const deleteBtn = event.target.closest(".history-delete");
  if (deleteBtn) {
    const entries = loadHistory();
    entries.splice(Number(deleteBtn.dataset.index), 1);
    saveHistory(entries);
    renderHistory();
  }
});

clearAllBtn.addEventListener("click", () => {
  saveHistory([]);
  renderHistory();
});

keypad.addEventListener("click", (event) => {
  const key = event.target.closest("button");
  if (!key) {
    return;
  }

  const action = key.dataset.action;
  const value = key.dataset.value;

  if (action === "clear") {
    expressionInput.value = "";
    updateResultDisplay("0");
    errorMessage.textContent = "";
    expressionInput.focus();
    return;
  }

  if (action === "backspace") {
    const start = expressionInput.selectionStart ?? expressionInput.value.length;
    const end = expressionInput.selectionEnd ?? expressionInput.value.length;

    if (start !== end) {
      expressionInput.value =
        expressionInput.value.slice(0, start) + expressionInput.value.slice(end);
      expressionInput.setSelectionRange(start, start);
    } else if (start > 0) {
      expressionInput.value =
        expressionInput.value.slice(0, start - 1) + expressionInput.value.slice(end);
      expressionInput.setSelectionRange(start - 1, start - 1);
    }

    expressionInput.focus();
    return;
  }

  if (value) {
    insertAtCursor(value);
    errorMessage.textContent = "";
  }
});

expressionInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    expressionInput.value = "";
    updateResultDisplay("0");
    errorMessage.textContent = "";
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const expression = expressionInput.value.trim();
  if (!expression) {
    errorMessage.textContent = "Please enter an expression.";
    updateResultDisplay("0");
    return;
  }

  errorMessage.textContent = "";

  try {
    const response = await fetch("/api/calc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expression }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.detail || "Unable to calculate expression");
    }

    updateResultDisplay(String(payload.result));
    addToHistory(expression, payload.result);
  } catch (error) {
    updateResultDisplay("0");
    errorMessage.textContent = error.message;
  }
});

renderHistory();
