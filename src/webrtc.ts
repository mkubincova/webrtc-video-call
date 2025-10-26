/*
 ═══════════════════════════════════════════════════════════════════════════════
                            🎥 WebRTC Video Call Manager
 ═══════════════════════════════════════════════════════════════════════════════
  Handles peer connections, media streams, and video calling functionality for real-time communication between users in rooms.
 
  Features:
  • Peer-to-peer video/audio streaming
  • ICE candidate exchange
  • Offer/Answer signaling
  • Connection state management
 ═══════════════════════════════════════════════════════════════════════════════
*/

import { SignalingClient } from "./signaling";

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private signaling: SignalingClient;
  private localVideo: HTMLVideoElement;
  private remoteVideo: HTMLVideoElement;
  private onMessage: (author: string, text: string, color?: string) => void;
  private remoteStreamConnected = false;

  private rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  constructor(
    signaling: SignalingClient,
    localVideo: HTMLVideoElement,
    remoteVideo: HTMLVideoElement,
    onMessage: (author: string, text: string, color?: string) => void
  ) {
    this.signaling = signaling;
    this.localVideo = localVideo;
    this.remoteVideo = remoteVideo;
    this.onMessage = onMessage;
  }

  async startLocalVideo(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      this.localVideo.srcObject = this.localStream;
      this.localVideo.muted = true;
      this.onMessage(
        "System",
        "Camera and microphone access granted",
        "#00b894"
      );
    } catch (error) {
      console.error("Error accessing media devices:", error);
      this.onMessage("System", "Failed to access camera/microphone", "#d63031");
    }
  }

  private createPeerConnection(): void {
    this.pc = new RTCPeerConnection(this.rtcConfig);

    // Add local stream tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.pc!.addTrack(track, this.localStream!);
      });
    }

    // Handle remote stream
    this.pc.ontrack = (event) => {
      console.log("Received remote track");
      this.remoteVideo.srcObject = event.streams[0];

      if (!this.remoteStreamConnected) {
        this.remoteStreamConnected = true;
        this.onMessage("System", "Remote video connected", "#00b894");
      }
    };

    // Handle ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate");
        this.signaling.send("ice-candidate", { candidate: event.candidate });
      }
    };

    // Handle connection state changes
    this.pc.onconnectionstatechange = () => {
      console.log("Connection state:", this.pc!.connectionState);
      if (this.pc!.connectionState === "connected") {
        this.onMessage("System", "WebRTC connection established", "#00b894");
      } else if (
        this.pc!.connectionState === "disconnected" ||
        this.pc!.connectionState === "failed"
      ) {
        this.onMessage("System", "WebRTC connection lost", "#d63031");
        this.cleanup();
      }
    };
  }

  async createOffer(): Promise<void> {
    if (!this.pc) {
      this.createPeerConnection();
    }
    if (!this.pc) return;

    try {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.signaling.send("offer", { offer });
      this.onMessage("System", "Call offer sent", "#6c5ce7");
    } catch (error) {
      console.error("Error creating offer:", error);
      this.onMessage("System", "Failed to create call offer", "#d63031");
    }
  }

  async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) {
      this.createPeerConnection();
    }
    if (!this.pc) return;

    try {
      await this.pc.setRemoteDescription(offer);
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.signaling.send("answer", { answer });
      this.onMessage("System", "Call offer received, answer sent", "#6c5ce7");
    } catch (error) {
      console.error("Error handling offer:", error);
      this.onMessage("System", "Failed to handle call offer", "#d63031");
    }
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.pc) return;

    try {
      await this.pc.setRemoteDescription(answer);
      this.onMessage("System", "Call answer received", "#6c5ce7");
    } catch (error) {
      console.error("Error handling answer:", error);
      this.onMessage("System", "Failed to handle call answer", "#d63031");
    }
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.pc) return;

    try {
      await this.pc.addIceCandidate(candidate);
      console.log("Added ICE candidate");
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  }

  endCall() {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    if (this.remoteVideo.srcObject) {
      this.remoteVideo.srcObject = null;
    }

    this.remoteStreamConnected = false;
    this.onMessage("System", "Call ended", "#d63031");
  }

  cleanup(): void {
    // Close peer connection
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    // Cleanup media streams
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.localVideo.srcObject) {
      this.localVideo.srcObject = null;
    }
    if (this.remoteVideo.srcObject) {
      this.remoteVideo.srcObject = null;
    }

    // Reset remote stream flag
    this.remoteStreamConnected = false;
  }
}
