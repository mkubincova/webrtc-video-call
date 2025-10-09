import { WebSocketServer, WebSocket } from "ws";
import pc from "picocolors";

type Message = {
  type: string; // e.g., 'offer', 'answer', 'ice'
  payload?: any;
};

// Create a WebSocket server
const PORT = 8888;
const wss = new WebSocketServer({ port: PORT });

// Track all connected clients
const clients = new Set<WebSocket>();

wss.on("connection", (ws) => {
  console.log("New client connected");
  clients.add(ws);

  ws.on("message", (data) => {
    try {
      const msg: Message = JSON.parse(data.toString());

      // Forward this message to all *other* connected clients
      for (const client of clients) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(msg));
        }
      }
    } catch (err) {
      console.error("Invalid message received:", err);
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    console.log("Client disconnected");
  });
});

console.log(
  `\n🚀 ${pc.bold("Signaling server running at:")} ${pc.cyan(
    `ws://localhost:${PORT}`
  )}\n`
);
console.log("Waiting for clients to connect...");
