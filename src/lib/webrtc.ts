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
import type { MessageType } from "./types";

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private signaling: SignalingClient;
  private localVideo: HTMLVideoElement;
  private remoteVideo: HTMLVideoElement;
  private onMessage: (text: string, type?: MessageType) => void;
  private onRemoteCameraChange?: (isCameraOff: boolean) => void;
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
    onMessage: (text: string, type?: MessageType) => void,
    onRemoteCameraChange?: (isCameraOff: boolean) => void,
  ) {
    this.signaling = signaling;
    this.localVideo = localVideo;
    this.remoteVideo = remoteVideo;
    this.onMessage = onMessage;
    this.onRemoteCameraChange = onRemoteCameraChange;
  }

  async startLocalVideo(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      this.localVideo.srcObject = this.localStream;
      this.localVideo.muted = true;
      this.onMessage("Camera and microphone access granted", "success");
    } catch (error) {
      console.error("Error accessing media devices:", error);
      this.onMessage("Failed to access camera/microphone", "error");
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
      console.log(
        "Received remote track:",
        event.track.kind,
        "ID:",
        event.track.id,
      );
      this.remoteVideo.srcObject = event.streams[0];

      if (!this.remoteStreamConnected) {
        this.remoteStreamConnected = true;
        this.onMessage("Remote video connected", "info");
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
        this.onMessage("WebRTC connection established", "success");

        // Send initial camera state to the remote peer
        const videoTrack = this.localStream?.getVideoTracks()[0];
        if (videoTrack) {
          this.signaling.send("camera-state", {
            isCameraOff: !videoTrack.enabled,
          });
        }
      } else if (
        this.pc!.connectionState === "disconnected" ||
        this.pc!.connectionState === "failed"
      ) {
        this.onMessage("WebRTC connection lost", "error");
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
      this.onMessage("Call offer sent", "info");
    } catch (error) {
      console.error("Error creating offer:", error);
      this.onMessage("Failed to create call offer", "error");
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
      this.onMessage("Call offer received, answer sent", "info");
    } catch (error) {
      console.error("Error handling offer:", error);
      this.onMessage("Failed to handle call offer", "error");
    }
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.pc) return;

    try {
      await this.pc.setRemoteDescription(answer);
      this.onMessage("Call answer received", "info");
    } catch (error) {
      console.error("Error handling answer:", error);
      this.onMessage("Failed to handle call answer", "error");
    }
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.pc) return;

    try {
      await this.pc.addIceCandidate(candidate);
      console.log("Added ICE candidate", "info");
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

    // Clear remote camera overlay when call ends
    if (this.onRemoteCameraChange) {
      this.onRemoteCameraChange(false); // Hide overlay (camera is considered "on" when no call)
    }

    this.onMessage("Call ended", "error");
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

  toggleMicrophone(): boolean {
    if (!this.localStream) return false;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      this.onMessage(
        audioTrack.enabled ? "Microphone unmuted" : "Microphone muted",
      );
      return !audioTrack.enabled; // Return true if muted
    }
    return false;
  }

  toggleCamera(): boolean {
    if (!this.localStream) return false;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      this.onMessage(
        videoTrack.enabled ? "Camera turned on" : "Camera turned off",
      );

      // Send camera state to remote peer
      this.signaling.send("camera-state", {
        isCameraOff: !videoTrack.enabled,
      });

      return !videoTrack.enabled; // Return true if camera is off
    }
    return false;
  }

  isMicrophoneMuted(): boolean {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    return audioTrack ? !audioTrack.enabled : false;
  }

  isCameraOff(): boolean {
    if (!this.localStream) return false;
    const videoTrack = this.localStream.getVideoTracks()[0];
    return videoTrack ? !videoTrack.enabled : false;
  }

  // Handle remote camera state messages from signaling
  handleRemoteCameraState(isCameraOff: boolean): void {
    console.log("=== SIGNALING: Received remote camera state ===");
    console.log("Remote camera is OFF:", isCameraOff);
    console.log("Calling onRemoteCameraChange callback with:", isCameraOff);
    this.onRemoteCameraChange?.(isCameraOff);
  }
}
