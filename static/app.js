const form = document.getElementById("calc-form");
const expressionInput = document.getElementById("expression");
const resultValue = document.getElementById("result-value");
const errorMessage = document.getElementById("error-message");
const keypad = document.querySelector(".keypad");

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
  } catch (error) {
    updateResultDisplay("0");
    errorMessage.textContent = error.message;
  }
});
