const WEBSOCKET_URL = import.meta.env.PROD
  ? "webrtc-video-call-production.up.railway.app" // Deployed server
  : "ws://localhost:8888";

export { WEBSOCKET_URL };
