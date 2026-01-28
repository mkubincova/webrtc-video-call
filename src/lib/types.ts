/*
 ═══════════════════════════════════════════════════════════════════════════════
                            🔧 Common Types & Interfaces
 ═══════════════════════════════════════════════════════════════════════════════
  Shared type definitions used across the video call application.
 ═══════════════════════════════════════════════════════════════════════════════
*/

/**
 * Message types for chat and system notifications
 */
export type MessageType = "default" | "error" | "success" | "info";
export type MessageAuthor = "self" | "other";

/**
 * DOM Elements Interface for the room page
 * Organizes all DOM elements by their functional area
 */
export interface RoomDOMElements {
  // Chat & Messaging
  chat: {
    chatDiv: HTMLDivElement;
    systemMessagesDiv: HTMLDivElement;
    messageInput: HTMLInputElement;
    sendMessageBtn: HTMLButtonElement;
    messageForm: HTMLFormElement;
  };

  // Room Info & Navigation
  room: {
    userCount: HTMLSpanElement;
    roomInfo: HTMLSpanElement;
    leaveRoomBtn: HTMLButtonElement;
    sidebar: HTMLDivElement;
    sidebarToggleBtn: HTMLButtonElement;
  };

  // Video & Media Controls
  video: {
    localVideo: HTMLVideoElement;
    remoteVideo: HTMLVideoElement;
    localCameraOff: HTMLDivElement;
    remoteCameraOff: HTMLDivElement;
    startCallBtn: HTMLButtonElement;
    endCallBtn: HTMLButtonElement;
    toggleMuteBtn: HTMLButtonElement;
    toggleCameraBtn: HTMLButtonElement;
  };
}
