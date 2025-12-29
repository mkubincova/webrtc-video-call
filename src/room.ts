import { WEBSOCKET_URL } from "./config";
import { SignalingClient } from "./signaling";
import { WebRTCManager } from "./webrtc";

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get("username")?.trim();
const roomId = urlParams.get("roomId")?.trim();

if (!username || !roomId) {
  alert("Invalid room access. Please join through the main page.");
  window.location.href = "/";
  throw new Error("No URL parameters found");
}

if (username.length < 2 || roomId.length < 3) {
  alert("Invalid username or room ID.");
  window.location.href = "/";
  throw new Error("Invalid parameters");
}

// DOM elements
const chatDiv = document.querySelector<HTMLDivElement>("#chat");
const systemMessagesDiv =
  document.querySelector<HTMLDivElement>("#systemMessages");
const messageInput = document.querySelector<HTMLInputElement>("#message");
const sendMessageBtn =
  document.querySelector<HTMLButtonElement>("#sendMessage");
const userCount = document.getElementById("userCount") as HTMLSpanElement;
const roomInfo = document.getElementById("roomInfo") as HTMLSpanElement;
const localVideo = document.getElementById("localVideo") as HTMLVideoElement;
const remoteVideo = document.getElementById("remoteVideo") as HTMLVideoElement;
const startCallBtn = document.querySelector<HTMLButtonElement>("#startCall");
const endCallBtn = document.querySelector<HTMLButtonElement>("#endCall");
const leaveRoomBtn = document.querySelector<HTMLButtonElement>("#leaveRoom");
const messageForm = document.querySelector<HTMLFormElement>("#messageForm");

if (
  !chatDiv ||
  !messageForm ||
  !systemMessagesDiv ||
  !messageInput ||
  !sendMessageBtn ||
  !leaveRoomBtn ||
  !startCallBtn ||
  !endCallBtn
) {
  throw new Error("Required DOM elements not found");
}

let signaling: SignalingClient;
let webrtc: WebRTCManager;

//  💬 Chat Utilities
function appendUserMessage(author: string, text: string, color = "#333") {
  const el = document.createElement("p");
  el.innerHTML = `<strong style="color:${color}">${author}:</strong> ${text}`;
  chatDiv!.appendChild(el);
  chatDiv!.scrollTop = chatDiv!.scrollHeight; // auto-scroll
}
function appendSystemMessage(text: string, color = "#333") {
  const el = document.createElement("p");
  el.innerHTML = `<p style="color:${color}">${text}</p>`;
  systemMessagesDiv!.appendChild(el);
  systemMessagesDiv!.scrollTop = systemMessagesDiv!.scrollHeight; // auto-scroll
}
function sendMessage() {
  const text = messageInput!.value.trim();
  if (!text) return;

  appendUserMessage("You", text, "#00b894");
  signaling.send("chat", { username, text, roomId });

  messageInput!.value = "";
}

// 🚪 Room Management
function leaveRoom() {
  // Clean up WebRTC
  webrtc.cleanup();

  // Close signaling connection
  if (signaling) signaling.send("leave-room", { username, roomId });

  // Redirect to index page
  window.location.href = "/";
}

// 🔗 Initialize Room
signaling = new SignalingClient(WEBSOCKET_URL);
webrtc = new WebRTCManager(
  signaling,
  localVideo,
  remoteVideo,
  appendSystemMessage
);

roomInfo.textContent = `Room: ${roomId}`;
document.title = `Room ${roomId} - Video Call`;

signaling.on("open", () => {
  signaling.send("join-room", { username, roomId });
});

signaling.on("close", () => {
  appendSystemMessage("Disconnected from server", "#d63031");
  leaveRoom();
});

signaling.on("message", (msg) => {
  switch (msg.type) {
    case "room-joined":
      webrtc.startLocalVideo(); // Start local video capture
      appendSystemMessage(`Welcome to room "${roomId}"`, "#6c5ce7");
      break;

    case "room-full":
      alert(
        `Room "${roomId}" is full! Maximum ${msg.payload.maxSize} users allowed.`
      );
      leaveRoom();
      break;

    case "room-ready":
      appendSystemMessage(msg.payload.message, "#00b894");
      break;

    case "room-user-count":
      userCount.textContent = `👥 ${msg.payload.count} user${
        msg.payload.count === 1 ? "" : "s"
      }`;
      if (msg.payload.count > 1) {
        startCallBtn.disabled = false;
        sendMessageBtn.disabled = false;
        // endCallBtn.disabled = true;
      } else {
        startCallBtn.disabled = true;
        sendMessageBtn.disabled = true;
      }
      break;

    case "chat":
      appendUserMessage(msg.payload.username, msg.payload.text, "#0984e3");
      break;

    case "offer":
      webrtc.handleOffer(msg.payload.offer);
      break;

    case "answer":
      webrtc.handleAnswer(msg.payload.answer);
      break;

    case "ice-candidate":
      webrtc.handleIceCandidate(msg.payload.candidate);
      break;

    case "call-started":
      // Enable end call button for the receiver
      startCallBtn.disabled = true;
      endCallBtn.disabled = false;
      appendSystemMessage("Call started", "#00b894");
      break;

    case "call-ended":
      webrtc.endCall();
      startCallBtn.disabled = false;
      endCallBtn.disabled = true;
      break;

    default:
      console.warn("Unknown message type:", msg.type);
  }
});

// Messaging handlers
// Handle form submission (Enter key)
messageForm.onsubmit = (e) => {
  e.preventDefault();
  sendMessage();
};

// Handle button click
sendMessageBtn.onclick = (e) => {
  e.preventDefault();
  sendMessage();
};

leaveRoomBtn.onclick = () => {
  leaveRoom();
};

// Video call handlers
startCallBtn.onclick = () => {
  webrtc.createOffer();
  startCallBtn.disabled = true;
  endCallBtn.disabled = false;
  // Notify the other participant that call has started
  signaling.send("call-started", { username });
};

endCallBtn.onclick = () => {
  webrtc.endCall();
  signaling.send("call-ended", {});
  startCallBtn.disabled = false;
  endCallBtn.disabled = true;
};

window.addEventListener("beforeunload", () => {
  webrtc?.cleanup();
});
