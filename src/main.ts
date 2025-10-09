import { SignalingClient } from "./signaling";

// --- DOM elements ---
const connectBtn = document.querySelector<HTMLButtonElement>("#connect");
const usernameInput = document.querySelector<HTMLInputElement>("#username");
const chatDiv = document.querySelector<HTMLDivElement>("#chat");
const messageInput = document.querySelector<HTMLInputElement>("#message");
const sendMessageBtn =
  document.querySelector<HTMLButtonElement>("#sendMessage");
const userCount = document.getElementById("userCount") as HTMLSpanElement;
const localVideo = document.getElementById("localVideo") as HTMLVideoElement;
const remoteVideo = document.getElementById("remoteVideo") as HTMLVideoElement;
const startCallBtn = document.querySelector<HTMLButtonElement>("#startCall");
const endCallBtn = document.querySelector<HTMLButtonElement>("#endCall");

if (
  !chatDiv ||
  !messageInput ||
  !sendMessageBtn ||
  !connectBtn ||
  !usernameInput ||
  !startCallBtn ||
  !endCallBtn
) {
  throw new Error("Required DOM elements not found");
}

let username = "";
let signaling: SignalingClient;
let localStream: MediaStream;
// let remoteStream: MediaStream;
let pc: RTCPeerConnection | null = null;

// --- WebRTC Configuration ---
const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// --- Utility ---
function appendMessage(author: string, text: string, color = "#333") {
  const el = document.createElement("p");
  el.innerHTML = `<strong style="color:${color}">${author}:</strong> ${text}`;
  chatDiv!.appendChild(el);
  chatDiv!.scrollTop = chatDiv!.scrollHeight; // auto-scroll
}
// --- Create peer connection ---
function createPeerConnection() {
  pc = new RTCPeerConnection(rtcConfig);

  // Add local stream tracks to peer connection
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      pc!.addTrack(track, localStream);
    });
  }

  // Handle remote stream
  pc.ontrack = (event) => {
    console.log("Received remote track");
    remoteVideo.srcObject = event.streams[0];
    appendMessage("System", "Remote video connected", "#00b894");
  };

  // Handle ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("Sending ICE candidate");
      signaling.send("ice-candidate", { candidate: event.candidate });
    }
  };

  // Handle connection state changes
  pc.onconnectionstatechange = () => {
    console.log("Connection state:", pc!.connectionState);
    if (pc!.connectionState === "connected") {
      appendMessage("System", "WebRTC connection established", "#00b894");
    } else if (
      pc!.connectionState === "disconnected" ||
      pc!.connectionState === "failed"
    ) {
      appendMessage("System", "WebRTC connection lost", "#d63031");
    }
  };
}
async function startLocalVideo() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localVideo.srcObject = localStream;
    appendMessage("System", "Camera and microphone access granted", "#00b894");
    // Create peer connection after getting local stream
    createPeerConnection();
  } catch (error) {
    console.error("Error accessing media devices:", error);
    appendMessage("System", "Failed to access camera/microphone", "#d63031");
  }
}
// --- Call management functions ---
function endCall() {
  if (pc) {
    pc.close();
    pc = null;
  }

  if (remoteVideo.srcObject) {
    remoteVideo.srcObject = null;
  }

  startCallBtn && (startCallBtn.disabled = false);
  endCallBtn && (endCallBtn.disabled = true);
  appendMessage("System", "Call ended", "#d63031");
}

// --- WebRTC signaling functions ---
async function createOffer() {
  if (!pc) return;

  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    signaling.send("offer", { offer });
    appendMessage("System", "Call offer sent", "#6c5ce7");
  } catch (error) {
    console.error("Error creating offer:", error);
    appendMessage("System", "Failed to create call offer", "#d63031");
  }
}

async function handleOffer(offer: RTCSessionDescriptionInit) {
  if (!pc) return;

  try {
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    signaling.send("answer", { answer });
    appendMessage("System", "Call offer received, answer sent", "#6c5ce7");
  } catch (error) {
    console.error("Error handling offer:", error);
    appendMessage("System", "Failed to handle call offer", "#d63031");
  }
}

async function handleAnswer(answer: RTCSessionDescriptionInit) {
  if (!pc) return;

  try {
    await pc.setRemoteDescription(answer);
    appendMessage("System", "Call answer received", "#6c5ce7");
  } catch (error) {
    console.error("Error handling answer:", error);
    appendMessage("System", "Failed to handle call answer", "#d63031");
  }
}

async function handleIceCandidate(candidate: RTCIceCandidateInit) {
  if (!pc) return;

  try {
    await pc.addIceCandidate(candidate);
    console.log("Added ICE candidate");
  } catch (error) {
    console.error("Error adding ICE candidate:", error);
  }
}

// --- Connect button handler ---
connectBtn.onclick = () => {
  const name = usernameInput.value.trim();
  if (!name) return alert("Please enter a username!");
  username = name;

  // Start local video capture
  startLocalVideo();

  // Initialize signaling client
  signaling = new SignalingClient("ws://localhost:8888");

  signaling.on("open", () => {
    appendMessage("System", `Connected as "${username}"`, "#6c5ce7");
    sendMessageBtn.disabled = false;
    messageInput.disabled = false;
    connectBtn.disabled = true;
    usernameInput.disabled = true;
    startCallBtn.disabled = false;
  });

  signaling.on("close", () => {
    appendMessage("System", `Not connected to signaling server`, "#d63031");
    sendMessageBtn.disabled = true;
    messageInput.disabled = true;
    connectBtn.disabled = false;
    usernameInput.disabled = false;
    startCallBtn.disabled = true;
    endCallBtn.disabled = true;
  });

  signaling.on("message", (msg) => {
    if (msg.type === "chat") {
      appendMessage(msg.payload.username, msg.payload.text, "#0984e3");
    } else if (msg.type === "user_count") {
      userCount.textContent = `👥 ${msg.payload.count} user${
        msg.payload.count === 1 ? "" : "s"
      }`;
    } else if (msg.type === "offer") {
      handleOffer(msg.payload.offer);
    } else if (msg.type === "answer") {
      handleAnswer(msg.payload.answer);
    } else if (msg.type === "ice-candidate") {
      handleIceCandidate(msg.payload.candidate);
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
// --- Button handlers ---
startCallBtn.onclick = () => {
  createOffer();
  startCallBtn.disabled = true;
  endCallBtn.disabled = false;
};

endCallBtn.onclick = () => {
  endCall();
  signaling.send("call-ended", {});
};
