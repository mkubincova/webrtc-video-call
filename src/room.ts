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
const toggleMuteBtn = document.querySelector<HTMLButtonElement>("#toggleMute");
const toggleCameraBtn =
  document.querySelector<HTMLButtonElement>("#toggleCamera");
const leaveRoomBtn = document.querySelector<HTMLButtonElement>("#leaveRoom");
const messageForm = document.querySelector<HTMLFormElement>("#messageForm");
const sidebarToggleBtn =
  document.querySelector<HTMLButtonElement>("#sidebarToggle");
const sidebar = document.querySelector<HTMLDivElement>("#status");

if (
  !chatDiv ||
  !messageForm ||
  !systemMessagesDiv ||
  !messageInput ||
  !sendMessageBtn ||
  !leaveRoomBtn ||
  !startCallBtn ||
  !endCallBtn ||
  !toggleMuteBtn ||
  !toggleCameraBtn ||
  !sidebarToggleBtn ||
  !sidebar
) {
  throw new Error("Required DOM elements not found");
}

let signaling: SignalingClient;
let webrtc: WebRTCManager;

//  💬 Chat Utilities
function appendUserMessage(author: string, text: string, color = "#000") {
  const el = document.createElement("p");
  el.innerHTML = `<strong style="color:${color}">${author}:</strong> ${text}`;
  chatDiv!.appendChild(el);
  chatDiv!.scrollTop = chatDiv!.scrollHeight; // auto-scroll
}
function appendSystemMessage(
  text: string,
  type: "default" | "danger" | "info" = "default",
) {
  const el = document.createElement("p");
  if (type !== "default") {
    el.classList.add(`text-${type}`);
  }
  el.innerHTML = text;
  systemMessagesDiv!.appendChild(el);
  systemMessagesDiv!.scrollTop = systemMessagesDiv!.scrollHeight; // auto-scroll
}
function sendMessage() {
  const text = messageInput!.value.trim();
  if (!text) return;

  appendUserMessage("You", text, "#000");
  signaling.send("chat", { username, text, roomId });

  messageInput!.value = "";
}

// 🎛️ Sidebar Management
function initializeSidebar() {
  // Remove the inline display: none style first
  sidebar!.style.display = "";

  // On large screens (≥1024px): always visible, no toggle needed
  // On small screens (<1024px): hidden by default, toggle available
  if (window.innerWidth >= 1024) {
    // Large screens: always show sidebar, no collapsed class needed
    sidebar!.classList.remove("collapsed");
  } else {
    // Small screens: start hidden (collapsed)
    sidebar!.classList.add("collapsed");
  }
}

function initializeCallButtons() {
  // Ensure only start call button is visible initially
  startCallBtn!.hidden = false;
  endCallBtn!.hidden = true;
  startCallBtn!.disabled = true; // Will be enabled when room is ready
}

function toggleSidebar() {
  // Only works on small screens (<1024px)
  if (window.innerWidth >= 1024) {
    // On large screens, sidebar is always visible - no toggle needed
    return;
  }

  // Small screens: toggle collapsed state
  const isCollapsed = sidebar!.classList.contains("collapsed");
  if (isCollapsed) {
    sidebar!.classList.remove("collapsed");
  } else {
    sidebar!.classList.add("collapsed");
  }
}

// Handle window resize to maintain proper state
function handleResize() {
  initializeSidebar();
}

window.addEventListener("resize", handleResize);

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
  appendSystemMessage,
);

roomInfo.textContent = `Room: ${roomId}`;
document.title = `Room ${roomId} - Video Call`;

// Initialize sidebar state based on screen size
initializeSidebar();

// Initialize call button states
initializeCallButtons();

signaling.on("open", () => {
  signaling.send("join-room", { username, roomId });
});

signaling.on("close", () => {
  appendSystemMessage("Disconnected from server");
  leaveRoom();
});

signaling.on("message", (msg) => {
  switch (msg.type) {
    case "room-joined":
      webrtc.startLocalVideo().then(() => {
        // Initialize button states after video starts
        updateMuteButton(webrtc.isMicrophoneMuted());
        updateCameraButton(webrtc.isCameraOff());
      }); // Start local video capture
      appendSystemMessage(`Welcome to room "${roomId}"`);
      break;

    case "room-full":
      alert(
        `Room "${roomId}" is full! Maximum ${msg.payload.maxSize} users allowed.`,
      );
      leaveRoom();
      break;

    case "room-ready":
      appendSystemMessage(msg.payload.message);
      break;

    case "room-user-count":
      const icon = msg.payload.count > 1 ? "🟢" : "🟡";
      const className =
        msg.payload.count > 1 ? "badge-success" : "badge-warning";
      userCount.textContent = `${icon} ${msg.payload.count} user${
        msg.payload.count === 1 ? "" : "s"
      }`;
      userCount.className = `badge ${className}`;
      if (msg.payload.count > 1) {
        startCallBtn.disabled = false;
        sendMessageBtn.disabled = false;
      } else {
        startCallBtn.disabled = true;
        sendMessageBtn.disabled = true;
      }
      break;

    case "chat":
      appendUserMessage(msg.payload.username, msg.payload.text, "#3c2f55");
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
      startCallBtn.hidden = true;
      endCallBtn.hidden = false;
      break;

    case "call-ended":
      webrtc.endCall();
      startCallBtn.hidden = false;
      endCallBtn.hidden = true;
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

sidebarToggleBtn!.onclick = () => {
  toggleSidebar();
};

// Video call handlers
startCallBtn.onclick = () => {
  webrtc.createOffer();
  startCallBtn.hidden = true;
  endCallBtn.hidden = false;
  // Notify the other participant that call has started
  signaling.send("call-started", { username });
};

endCallBtn.onclick = () => {
  webrtc.endCall();
  signaling.send("call-ended", {});
  startCallBtn.hidden = false;
  endCallBtn.hidden = true;
};

// Media control handlers
function updateMuteButton(isMuted: boolean) {
  const textSpan = toggleMuteBtn!.querySelector(".text");
  if (textSpan) {
    textSpan.textContent = isMuted ? "Muted" : "Unmuted";
  }
}

function updateCameraButton(isCameraOff: boolean) {
  const textSpan = toggleCameraBtn!.querySelector(".text");
  if (textSpan) {
    textSpan.textContent = isCameraOff ? "Camera Off" : "Camera On";
  }
}

toggleMuteBtn!.onclick = () => {
  const isMuted = webrtc.toggleMicrophone();
  updateMuteButton(isMuted);
};

toggleCameraBtn!.onclick = () => {
  const isCameraOff = webrtc.toggleCamera();
  updateCameraButton(isCameraOff);
};

window.addEventListener("beforeunload", () => {
  webrtc?.cleanup();
});
