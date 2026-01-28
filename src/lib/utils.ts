/*
 ═══════════════════════════════════════════════════════════════════════════════
                            🛠️ Utility functions
 ═══════════════════════════════════════════════════════════════════════════════
*/

import type { MessageAuthor, MessageType, RoomDOMElements } from "./types";

/**
 * Initialize and validate all DOM elements for the room page
 * @returns Object containing all validated DOM elements
 * @throws Error if any required elements are missing
 */
export function initializeRoomDOMElements(): RoomDOMElements {
  // Chat & Messaging Elements
  const chatDiv = document.querySelector<HTMLDivElement>("#chat");
  const systemMessagesDiv =
    document.querySelector<HTMLDivElement>("#systemMessages");
  const messageInput = document.querySelector<HTMLInputElement>("#message");
  const sendMessageBtn =
    document.querySelector<HTMLButtonElement>("#sendMessage");
  const messageForm = document.querySelector<HTMLFormElement>("#messageForm");

  // Room Info & Navigation Elements
  const userCount = document.querySelector<HTMLSpanElement>("#userCount");
  const roomInfo = document.querySelector<HTMLSpanElement>("#roomInfo");
  const leaveRoomBtn = document.querySelector<HTMLButtonElement>("#leaveRoom");
  const sidebar = document.querySelector<HTMLDivElement>("#sidebar");
  const sidebarToggleBtn =
    document.querySelector<HTMLButtonElement>("#sidebarToggle");

  // Video & Media Control Elements
  const localVideo = document.querySelector<HTMLVideoElement>("#localVideo");
  const remoteVideo = document.querySelector<HTMLVideoElement>("#remoteVideo");
  const localCameraOff =
    document.querySelector<HTMLDivElement>("#localCameraOff");
  const remoteCameraOff =
    document.querySelector<HTMLDivElement>("#remoteCameraOff");
  const startCallBtn = document.querySelector<HTMLButtonElement>("#startCall");
  const endCallBtn = document.querySelector<HTMLButtonElement>("#endCall");
  const toggleMuteBtn =
    document.querySelector<HTMLButtonElement>("#toggleMute");
  const toggleCameraBtn =
    document.querySelector<HTMLButtonElement>("#toggleCamera");

  // Validate all elements exist
  const requiredElements = [
    chatDiv,
    systemMessagesDiv,
    messageInput,
    sendMessageBtn,
    messageForm,
    userCount,
    roomInfo,
    leaveRoomBtn,
    sidebar,
    sidebarToggleBtn,
    localVideo,
    remoteVideo,
    localCameraOff,
    remoteCameraOff,
    startCallBtn,
    endCallBtn,
    toggleMuteBtn,
    toggleCameraBtn,
  ];

  if (requiredElements.some((element) => !element)) {
    const missingElements = requiredElements
      .map((element, index) => {
        const elementNames = [
          "chatDiv",
          "systemMessagesDiv",
          "messageInput",
          "sendMessageBtn",
          "messageForm",
          "userCount",
          "roomInfo",
          "leaveRoomBtn",
          "sidebar",
          "sidebarToggleBtn",
          "localVideo",
          "remoteVideo",
          "localCameraOff",
          "remoteCameraOff",
          "startCallBtn",
          "endCallBtn",
          "toggleMuteBtn",
          "toggleCameraBtn",
        ];
        return !element ? elementNames[index] : null;
      })
      .filter(Boolean);

    throw new Error(
      `Required DOM elements not found: ${missingElements.join(", ")}`,
    );
  }

  // Return organized DOM elements
  return {
    chat: {
      chatDiv: chatDiv!,
      systemMessagesDiv: systemMessagesDiv!,
      messageInput: messageInput!,
      sendMessageBtn: sendMessageBtn!,
      messageForm: messageForm!,
    },
    room: {
      userCount: userCount!,
      roomInfo: roomInfo!,
      leaveRoomBtn: leaveRoomBtn!,
      sidebar: sidebar!,
      sidebarToggleBtn: sidebarToggleBtn!,
    },
    video: {
      localVideo: localVideo!,
      remoteVideo: remoteVideo!,
      localCameraOff: localCameraOff!,
      remoteCameraOff: remoteCameraOff!,
      startCallBtn: startCallBtn!,
      endCallBtn: endCallBtn!,
      toggleMuteBtn: toggleMuteBtn!,
      toggleCameraBtn: toggleCameraBtn!,
    },
  };
}

export function initializeSidebar(sidebar: HTMLDivElement) {
  if (window.innerWidth >= 1024) {
    // Large screens: always show sidebar, no collapsed class needed
    sidebar.classList.remove("collapsed");
  } else {
    // Small screens: start hidden (collapsed)
    sidebar.classList.add("collapsed");
  }
}

export function toggleSidebar(sidebar: HTMLDivElement) {
  const isCollapsed = sidebar.classList.contains("collapsed");
  if (isCollapsed) {
    sidebar.classList.remove("collapsed");
  } else {
    sidebar.classList.add("collapsed");
  }
}

export function updateMuteButton(isMuted: boolean, button: HTMLButtonElement) {
  const textSpan = button.querySelector(".text");
  const iconSpan = button.querySelector(".icon");
  if (textSpan) {
    textSpan.textContent = isMuted ? "Muted" : "Unmuted";
  }
  if (iconSpan) {
    iconSpan.setAttribute("data-lucide", isMuted ? "mic-off" : "mic");
    // Refresh the icon
    if (typeof (window as any).lucide !== "undefined") {
      (window as any).lucide.createIcons();
    }
  }
}

export function updateCameraButton(
  isCameraOff: boolean,
  button: HTMLButtonElement,
  overlay: HTMLDivElement,
) {
  const textSpan = button.querySelector(".text");
  const iconSpan = button.querySelector(".icon");
  if (textSpan) {
    textSpan.textContent = isCameraOff ? "Camera Off" : "Camera On";
  }
  if (iconSpan) {
    iconSpan.setAttribute("data-lucide", isCameraOff ? "video-off" : "video");
    // Refresh the icon
    if (typeof (window as any).lucide !== "undefined") {
      (window as any).lucide.createIcons();
    }
  }

  // Show/hide camera overlay for local video
  if (isCameraOff) {
    overlay.classList.remove("camera-hidden");
  } else {
    overlay.classList.add("camera-hidden");
  }
}

export function updateRemoteCameraState(
  isCameraOff: boolean,
  overlay: HTMLDivElement,
) {
  // Show/hide camera overlay for remote video
  if (isCameraOff) {
    overlay.classList.remove("camera-hidden");
  } else {
    overlay.classList.add("camera-hidden");
  }
}

export function appendUserMessage(
  container: HTMLDivElement,
  authorType: MessageAuthor,
  text: string,
  authorName?: string,
) {
  const el = document.createElement("div");

  el.classList.add(`message-${authorType}`);

  // Create message content
  if (authorType === "self") {
    el.innerHTML = `<div class="message-content">${text}</div>`;
  } else {
    const displayName = authorName || "Other user";
    el.innerHTML = `
      <div class="message-author">${displayName}</div>
      <div class="message-content">${text}</div>
    `;
  }

  container.appendChild(el);
  container.scrollTop = container.scrollHeight; // auto-scroll
}

export function appendSystemMessage(
  container: HTMLDivElement,
  text: string,
  type: MessageType = "default",
) {
  const el = document.createElement("p");
  if (type !== "default") {
    el.classList.add(`text-${type}`);
  }
  el.innerHTML = text;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight; // auto-scroll
}
