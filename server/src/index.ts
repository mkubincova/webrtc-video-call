import { WebSocketServer, WebSocket } from "ws";
import pc from "picocolors";
import { config } from "dotenv";
import { createServer } from "http";

// Load environment variables
config();

type Message = {
  type: string; // e.g., 'offer', 'answer', 'ice'
  payload?: any;
};

type Client = {
  ws: WebSocket;
  username?: string;
  roomId?: string;
};

// Create a WebSocket server
const PORT = process.env.PORT || 8888;
const HOST = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";

// const server = createServer((req, res) => {
//   if (req.url === "/health") {
//     res.writeHead(200, { "Content-Type": "application/json" });
//     res.end(
//       JSON.stringify({ status: "ok", timestamp: new Date().toISOString() })
//     );
//   } else {
//     res.writeHead(404);
//     res.end("WebSocket server running");
//   }
// });

// const wss = new WebSocketServer({ server });
const wss = new WebSocketServer({ port: Number(PORT), host: HOST });

// Track clients by room
const rooms = new Map<string, Set<Client>>();
const clients = new Map<WebSocket, Client>();
const MAX_ROOM_SIZE = 2;

function broadcastToRoom(
  roomId: string,
  msg: Message,
  excludeClient?: WebSocket
) {
  const roomClients = rooms.get(roomId);
  if (!roomClients) return;

  for (const client of roomClients) {
    if (
      client.ws !== excludeClient &&
      client.ws.readyState === WebSocket.OPEN
    ) {
      client.ws.send(JSON.stringify(msg));
    }
  }
}

function joinRoom(client: Client, roomId: string, username: string) {
  // Leave current room if any
  if (client.roomId) {
    leaveRoom(client);
  }

  // Check if room is full
  const existingRoom = rooms.get(roomId);
  if (existingRoom && existingRoom.size >= MAX_ROOM_SIZE) {
    client.ws.send(
      JSON.stringify({
        type: "room-full",
        payload: { roomId, maxSize: MAX_ROOM_SIZE },
      })
    );
    console.log(pc.red(`${username} rejected from room ${roomId} - room full`));
    return;
  }

  client.roomId = roomId;
  client.username = username;

  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }

  rooms.get(roomId)!.add(client);

  // Notify client they joined
  client.ws.send(JSON.stringify({ type: "room-joined", payload: { roomId } }));

  // Broadcast user count to room
  const roomSize = rooms.get(roomId)!.size;
  broadcastToRoom(roomId, {
    type: "room-user-count",
    payload: { count: roomSize },
  });

  console.log(
    pc.green(`${username} joined room ${roomId}. Room size: ${roomSize}`)
  );
}

function leaveRoom(client: Client) {
  if (!client.roomId) return;

  const roomClients = rooms.get(client.roomId);
  if (roomClients) {
    roomClients.delete(client);

    // Broadcast updated user count
    broadcastToRoom(client.roomId, {
      type: "room-user-count",
      payload: { count: roomClients.size },
    });

    // Remove empty rooms
    if (roomClients.size === 0) {
      rooms.delete(client.roomId);
      console.log(pc.yellow(`Room ${client.roomId} deleted (empty)`));
    }
  }

  console.log(pc.yellow(`${client.username} left room ${client.roomId}`));
  client.roomId = undefined;
  client.username = undefined;
}

wss.on("connection", (ws) => {
  const client: Client = { ws };
  clients.set(ws, client);
  console.log(pc.green(`New client connected. Total: ${clients.size}`));

  ws.on("message", (data) => {
    try {
      const msg: Message = JSON.parse(data.toString());

      if (msg.type === "join-room") {
        joinRoom(client, msg.payload.roomId, msg.payload.username);
      } else if (client.roomId) {
        // Forward message to room members only
        broadcastToRoom(client.roomId, msg, ws);
      }
    } catch (err) {
      console.error(pc.red("Invalid message received:"), err);
    }
  });

  ws.on("close", () => {
    leaveRoom(client);
    clients.delete(ws);
    console.log(pc.yellow(`Client disconnected. Total: ${clients.size}`));
  });
});

// Start the server
// server.listen(
//   {
//     port: Number(PORT),
//     host: HOST,
//   },
//   () => {
console.log(
  `\n🚀 ${pc.bold("Signaling server running at:")} ${pc.cyan(
    `ws://${HOST}:${PORT}`
  )}\n`
);
// console.log(`📡 Health check available at: http://${HOST}:${PORT}/health`);
console.log("Waiting for clients to connect...");
//   }
// );
