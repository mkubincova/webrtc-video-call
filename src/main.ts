import { SignalingClient } from "./signaling";
import { WebRTCManager } from "./webrtc";

// DOM elements
const connectBtn = document.querySelector<HTMLButtonElement>("#connect");
const usernameInput = document.querySelector<HTMLInputElement>("#username");
const roomIdInput = document.querySelector<HTMLInputElement>("#roomId");
const chatDiv = document.querySelector<HTMLDivElement>("#chat");
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

if (
  !chatDiv ||
  !messageInput ||
  !sendMessageBtn ||
  !connectBtn ||
  !leaveRoomBtn ||
  !usernameInput ||
  !roomIdInput ||
  !startCallBtn ||
  !endCallBtn
) {
  throw new Error("Required DOM elements not found");
}

let username = "";
let roomId = "";
let signaling: SignalingClient;
let webrtc: WebRTCManager;

// Utility
function appendMessage(author: string, text: string, color = "#333") {
  const el = document.createElement("p");
  el.innerHTML = `<strong style="color:${color}">${author}:</strong> ${text}`;
  chatDiv!.appendChild(el);
  chatDiv!.scrollTop = chatDiv!.scrollHeight; // auto-scroll
}

function leaveRoom() {
  // Clean up WebRTC
  webrtc?.cleanup();

  // Close signaling connection
  if (signaling) {
    signaling.send("leave-room", { username, roomId });
  }

  // Reset UI state
  appendMessage("System", `Left room "${roomId}"`, "#d63031");
  roomInfo.textContent = "Not in a room";
  userCount.textContent = "👥 0 users";

  // Reset form controls
  connectBtn!.disabled = false;
  leaveRoomBtn!.disabled = true;
  usernameInput!.disabled = false;
  roomIdInput!.disabled = false;
  sendMessageBtn!.disabled = true;
  messageInput!.disabled = true;
  startCallBtn!.disabled = true;
  endCallBtn!.disabled = true;

  roomInfo.textContent = "Not in a room";
  webrtc?.cleanup();

  // Clear input values if desired
  messageInput!.value = "";

  // Reset variables
  username = "";
  roomId = "";
}

// Connect button handler
connectBtn.onclick = () => {
  const name = usernameInput.value.trim();
  const room = roomIdInput.value.trim();

  if (!name) return alert("Please enter a username!");
  if (!room) return alert("Please enter a room ID!");

  username = name;
  roomId = room;

  // Initialize signaling client
  signaling = new SignalingClient("ws://localhost:8888");

  // Initialize WebRTC manager
  webrtc = new WebRTCManager(signaling, localVideo, remoteVideo, appendMessage);

  signaling.on("open", () => {
    signaling.send("join-room", { username, roomId });
  });

  signaling.on("close", () => {
    appendMessage("System", "Disconnected from server", "#d63031");
    leaveRoom();
  });

  signaling.on("message", (msg) => {
    switch (msg.type) {
      case "room-joined":
        webrtc.startLocalVideo(); // Start local video capture
        appendMessage("System", `Joined room "${roomId}"`, "#6c5ce7");
        roomInfo.textContent = `Room: ${roomId}`;
        sendMessageBtn.disabled = false;
        messageInput.disabled = false;
        connectBtn.disabled = true;
        usernameInput.disabled = true;
        roomIdInput.disabled = true;
        startCallBtn.disabled = false;
        leaveRoomBtn.disabled = false;
        break;
      case "room-full":
        alert(
          `Room "${msg.payload.roomId}" is full! Maximum ${msg.payload.maxSize} users allowed.`
        );
        appendMessage(
          "System",
          `Room "${msg.payload.roomId}" is full (max ${msg.payload.maxSize} users)`,
          "#d63031"
        );
        break;
      case "room-ready":
        appendMessage("System", msg.payload.message, "#00b894");
        break;
      case "room-user-count":
        userCount.textContent = `👥 ${msg.payload.count} user${
          msg.payload.count === 1 ? "" : "s"
        }`;
        break;
      case "chat":
        appendMessage(msg.payload.username, msg.payload.text, "#0984e3");
        break;
      case "offer":
        webrtc.handleOffer(msg.payload.offer);
        startCallBtn.disabled = true;
        endCallBtn.disabled = false;
        break;
      case "answer":
        webrtc.handleAnswer(msg.payload.answer);
        break;
      case "ice-candidate":
        webrtc.handleIceCandidate(msg.payload.candidate);
        break;
      case "call-ended":
        webrtc.endCall();
        break;
      default:
        console.warn("Unknown message type:", msg.type);
    }
  });
};

// Messaging handlers
sendMessageBtn.onclick = () => {
  const text = messageInput.value.trim();
  if (!text) return;

  appendMessage("You", text, "#00b894");
  signaling.send("chat", { username, text, roomId });

  messageInput.value = "";
};

leaveRoomBtn.onclick = () => {
  leaveRoom();
};

// Video call handlers
startCallBtn.onclick = () => {
  webrtc.createOffer();
  startCallBtn.disabled = true;
  endCallBtn.disabled = false;
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
