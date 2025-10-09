export type SignalMessage = {
  type: string;
  payload?: any;
};

type Listener = (msg: SignalMessage) => void;

export class SignalingClient {
  private ws: WebSocket;
  private listeners: Listener[] = [];

  constructor(serverUrl: string) {
    this.ws = new WebSocket(serverUrl);

    this.ws.onopen = () => {
      console.log("%c[signal] Connected ✅", "color: #00b894;");
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as SignalMessage;
      console.log("%c[signal] Received:", "color: #0984e3;", msg);
      this.listeners.forEach((cb) => cb(msg));
    };

    this.ws.onclose = () => {
      console.log("%c[signal] Disconnected ❌", "color: #d63031;");
    };

    this.ws.onerror = (err) => {
      console.error("[signal] Error:", err);
    };
  }

  onMessage(cb: Listener) {
    this.listeners.push(cb);
  }

  send(type: string, payload?: any) {
    const message: SignalMessage = { type, payload };
    this.ws.send(JSON.stringify(message));
    console.log("%c[signal] Sent:", "color: #6c5ce7;", message);
  }
}
