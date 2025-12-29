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
  private onMessage: (text: string, color?: string) => void;
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
    onMessage: (text: string, color?: string) => void
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
      this.onMessage("Camera and microphone access granted", "#364a44");
    } catch (error) {
      console.error("Error accessing media devices:", error);
      this.onMessage("Failed to access camera/microphone");
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
        this.onMessage("Remote video connected");
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
        this.onMessage("WebRTC connection established", "#364a44");
      } else if (
        this.pc!.connectionState === "disconnected" ||
        this.pc!.connectionState === "failed"
      ) {
        this.onMessage("WebRTC connection lost");
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
      this.onMessage("Call offer sent");
    } catch (error) {
      console.error("Error creating offer:", error);
      this.onMessage("Failed to create call offer");
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
      this.onMessage("Call offer received, answer sent");
    } catch (error) {
      console.error("Error handling offer:", error);
      this.onMessage("Failed to handle call offer");
    }
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.pc) return;

    try {
      await this.pc.setRemoteDescription(answer);
      this.onMessage("Call answer received");
    } catch (error) {
      console.error("Error handling answer:", error);
      this.onMessage("Failed to handle call answer");
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
    this.onMessage("Call ended", "#910c19");
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
