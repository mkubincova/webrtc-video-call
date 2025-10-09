import { SignalingClient } from "./signaling";

// --- DOM elements ---
const connectBtn = document.querySelector<HTMLButtonElement>("#connect");
const usernameInput = document.querySelector<HTMLInputElement>("#username");
const chatDiv = document.querySelector<HTMLDivElement>("#chat");
const messageInput = document.querySelector<HTMLInputElement>("#message");
const sendMessageBtn =
  document.querySelector<HTMLButtonElement>("#sendMessage");
const statusDot = document.getElementById("statusDot") as HTMLSpanElement;
const statusText = document.getElementById("statusText") as HTMLSpanElement;

if (
  !chatDiv ||
  !messageInput ||
  !sendMessageBtn ||
  !connectBtn ||
  !usernameInput
) {
  throw new Error("Required DOM elements not found");
}

let username = "";
let signaling: SignalingClient;

// --- Utility ---
function appendMessage(author: string, text: string, color = "#333") {
  const el = document.createElement("p");
  el.innerHTML = `<strong style="color:${color}">${author}:</strong> ${text}`;
  chatDiv!.appendChild(el);
  chatDiv!.scrollTop = chatDiv!.scrollHeight; // auto-scroll
}
function updateStatus(state: "connecting" | "connected" | "disconnected") {
  if (state === "connecting") {
    statusDot.textContent = "🟠";
    statusText.textContent = "Connecting...";
    statusText.style.color = "orange";
  } else if (state === "connected") {
    statusDot.textContent = "🟢";
    statusText.textContent = "Connected";
    statusText.style.color = "green";
  } else {
    statusDot.textContent = "🔴";
    statusText.textContent = "Disconnected";
    statusText.style.color = "red";
  }
}

// --- Connect button handler ---
connectBtn.onclick = () => {
  const name = usernameInput.value.trim();
  if (!name) return alert("Please enter a username!");
  username = name;

  // Initialize signaling client
  updateStatus("connecting");
  signaling = new SignalingClient("ws://localhost:8888");

  signaling["ws"].onopen = () => {
    updateStatus("connected");
    appendMessage("System", `Connected as "${username}"`, "#6c5ce7");
    sendMessageBtn.disabled = false;
    messageInput.disabled = false;
    connectBtn.disabled = true;
    usernameInput.disabled = true;
  };

  signaling["ws"].onclose = () => {
    updateStatus("disconnected");
    appendMessage("System", `Disconnected from signaling server`, "#d63031");
    sendMessageBtn.disabled = true;
    messageInput.disabled = true;
  };

  // Listen for incoming messages
  signaling.onMessage((msg) => {
    if (msg.type === "chat") {
      appendMessage(msg.payload.username, msg.payload.text, "#0984e3");
    }
  });
};

// --- Send message ---
sendMessageBtn.onclick = () => {
  const text = messageInput.value.trim();
  if (!text) return;

  appendMessage("You", text, "#00b894");
  signaling.send("chat", { username, text });

  messageInput.value = "";
};
