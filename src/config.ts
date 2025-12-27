const WEBSOCKET_URL = import.meta.env.PROD
  ? "wss://webrtc-video-call-production.up.railway.app" // Deployed server
  : "ws://localhost:8888";

export { WEBSOCKET_URL };
