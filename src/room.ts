import { WEBSOCKET_URL } from "./config";
import { SignalingClient } from "./lib/signaling";
import { WebRTCManager } from "./lib/webrtc";
import type { MessageType } from "./lib/types";
import {
  appendSystemMessage,
  appendUserMessage,
  initializeRoomDOMElements,
  initializeSidebar,
  toggleSidebar,
  updateCameraButton,
  updateMuteButton,
  updateRemoteCameraState,
} from "./lib/utils";

/**
 * 🔗 Get URL parameters
 */
const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get("username")?.trim();
const roomId = urlParams.get("roomId")?.trim();

// Track the other user's name for better chat display
let otherUserName: string | null = null;

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

/**
 * 🏠 Initialize DOM elements
 */
const { chat, video, room } = initializeRoomDOMElements();

// Text
room.roomInfo.textContent = `Room: ${roomId}`;
document.title = `Room ${roomId} - Video Call`;

// Sidebar
initializeSidebar(room.sidebar);
window.addEventListener("resize", () => initializeSidebar(room.sidebar));

// Icons
if (typeof (window as any).lucide !== "undefined") {
  (window as any).lucide.createIcons();
}

// Buttons
chat.messageForm.onsubmit = (e) => {
  e.preventDefault();
  sendMessage();
};
chat.sendMessageBtn.onclick = (e) => {
  e.preventDefault();
  sendMessage();
};

room.leaveRoomBtn.onclick = () => {
  leaveRoom();
};
room.sidebarToggleBtn.onclick = () => {
  toggleSidebar(room.sidebar);
};

video.toggleMuteBtn.onclick = () => {
  const isMuted = webrtc.toggleMicrophone();
  updateMuteButton(isMuted, video.toggleMuteBtn);
};
video.toggleCameraBtn.onclick = () => {
  const isCameraOff = webrtc.toggleCamera();
  updateCameraButton(isCameraOff, video.toggleCameraBtn, video.localCameraOff);
};
video.startCallBtn.onclick = () => {
  webrtc.createOffer();
  video.startCallBtn.hidden = true;
  video.endCallBtn.hidden = false;
  signaling.send("call-started", { username });
};
video.endCallBtn.onclick = () => {
  webrtc.endCall();
  signaling.send("call-ended", {});
  video.startCallBtn.hidden = false;
  video.endCallBtn.hidden = true;
  updateRemoteCameraState(false, video.remoteCameraOff);
};

/**
 * 🚦 Signaling
 */
let signaling: SignalingClient = new SignalingClient(WEBSOCKET_URL);
let webrtc: WebRTCManager = new WebRTCManager(
  signaling,
  video.localVideo,
  video.remoteVideo,
  (text: string, type?: MessageType) =>
    appendSystemMessage(chat.systemMessagesDiv, text, type),
  (isCameraOff: boolean) =>
    updateRemoteCameraState(isCameraOff, video.remoteCameraOff),
);

signaling.on("open", () => {
  signaling.send("join-room", { username, roomId });
});

signaling.on("close", () => {
  appendSystemMessage(chat.systemMessagesDiv, "Disconnected from server");
  leaveRoom();
});

signaling.on("message", (msg) => {
  switch (msg.type) {
    case "room-joined":
      webrtc.startLocalVideo();
      appendSystemMessage(
        chat.systemMessagesDiv,
        `Welcome to room "${roomId}"`,
      );
      break;

    case "room-full":
      alert(
        `Room "${roomId}" is full! Maximum ${msg.payload.maxSize} users allowed.`,
      );
      leaveRoom();
      break;

    case "room-ready":
      appendSystemMessage(chat.systemMessagesDiv, msg.payload.message);
      break;

    case "user-joined":
      otherUserName = msg.payload.username;
      appendSystemMessage(
        chat.systemMessagesDiv,
        `<strong>${msg.payload.username}</strong> joined the room`,
        "success",
      );
      break;

    case "user-left":
      appendSystemMessage(
        chat.systemMessagesDiv,
        `<strong>${msg.payload.username}</strong> left the room`,
        "error",
      );
      // Clear the other user name if they left
      if (otherUserName === msg.payload.username) {
        otherUserName = null;
      }
      break;

    case "room-user-count":
      const className =
        msg.payload.count > 1 ? "badge-success" : "badge-warning";
      room.userCount.textContent = `${msg.payload.count} user${
        msg.payload.count === 1 ? "" : "s"
      }`;
      // Apply styling to the parent badge element
      const badgeElement = room.userCount.parentElement;
      if (badgeElement) {
        badgeElement.className = `badge ${className}`;
      }
      if (msg.payload.count > 1) {
        video.startCallBtn.disabled = false;
        chat.sendMessageBtn.disabled = false;
      } else {
        video.startCallBtn.disabled = true;
        chat.sendMessageBtn.disabled = true;
      }
      break;

    case "chat":
      appendUserMessage(
        chat.chatDiv,
        "other",
        msg.payload.text,
        msg.payload.username,
      );
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

    case "camera-state":
      webrtc.handleRemoteCameraState(msg.payload.isCameraOff);
      break;

    case "call-started":
      video.startCallBtn.hidden = true;
      video.endCallBtn.hidden = false;
      break;

    case "call-ended":
      webrtc.endCall();
      video.startCallBtn.hidden = false;
      video.endCallBtn.hidden = true;
      updateRemoteCameraState(false, video.remoteCameraOff);
      break;

    default:
      console.warn("Unknown message type:", msg.type);
  }
});

window.addEventListener("beforeunload", () => {
  webrtc?.cleanup();
});

function sendMessage() {
  const text = chat.messageInput.value.trim();
  if (!text) return;

  appendUserMessage(chat.chatDiv, "self", text);
  signaling.send("chat", { username, text, roomId });

  chat.messageInput.value = "";
}

function leaveRoom() {
  // Clean up WebRTC
  webrtc.cleanup();

  // Close signaling connection
  if (signaling) signaling.send("leave-room", { username, roomId });

  // Redirect to index page
  window.location.href = "/";
}
