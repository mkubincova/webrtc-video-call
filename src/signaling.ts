export type SignalMessage = {
  type: string;
  payload?: any;
};

type EventMap = {
  open: () => void;
  close: () => void;
  message: (msg: SignalMessage) => void;
  error: (err: Event) => void;
};

export class SignalingClient {
  private ws: WebSocket;
  private eventListeners: { [K in keyof EventMap]: EventMap[K][] } = {
    open: [],
    close: [],
    message: [],
    error: [],
  };

  constructor(serverUrl: string) {
    this.ws = new WebSocket(serverUrl);

    // 🟢 OPEN
    this.ws.addEventListener("open", () => {
      console.log("%c[signal] Connected ✅", "color: #00b894;");
      this.emit("open");
    });

    // 📩 MESSAGE
    this.ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data) as SignalMessage;
      console.log("%c[signal] Received:", "color: #0984e3;", msg);
      this.emit("message", msg);
    });

    // 🔴 CLOSE
    this.ws.addEventListener("close", () => {
      console.log("%c[signal] Disconnected ❌", "color: #d63031;");
      this.emit("close");
    });

    // ⚠️ ERROR
    this.ws.addEventListener("error", (err) => {
      console.error("[signal] Error:", err);
      this.emit("error", err);
    });
  }

  // ✅ Public API: add event listener
  on<K extends keyof EventMap>(event: K, cb: EventMap[K]) {
    this.eventListeners[event].push(cb);
  }

  // 🚀 Emit event internally
  private emit<K extends keyof EventMap>(
    event: K,
    payload?: Parameters<EventMap[K]>[0]
  ) {
    for (const cb of this.eventListeners[event]) {
      cb(payload as any);
    }
  }

  // ✉️ Send message
  send(type: string, payload?: any) {
    const message: SignalMessage = { type, payload };
    this.ws.send(JSON.stringify(message));
    console.log("%c[signal] Sent:", "color: #6c5ce7;", message);
  }
}
