# WebRTC Video Call App

A peer-to-peer video calling application built with WebRTC, TypeScript, and WebSockets. Users can create or join video call rooms.

## Features

- Peer-to-peer video and audio calls using WebRTC
- WebSocket-based signaling server for connection establishment
- Room-based calls with shareable room IDs

## Architecture

### Frontend (Client)

- TypeScript with Vite build tool
- WebRTC for video/audio streaming
- WebSocket client for signaling
- HTML/CSS interface

### Backend (Server)

- Node.js with TypeScript
- WebSocket Server using ws library
- Message routing between clients
- Room management

## Technology Stack

- **Frontend**: TypeScript, Vite, WebRTC API, WebSockets
- **Backend**: Node.js, TypeScript, ws (WebSocket library)
- **Development**: ts-node-dev, Vite dev server

## Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager
- Modern web browser with WebRTC support

## Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/mkubincova/webrtc-video-call.git
cd video-call-app
```

### 2. Install Dependencies

```bash
# Install client dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

### 3. Start the Backend Server

```bash
cd server
npm run dev
```

Server runs on `http://localhost:8888`

### 4. Start the Frontend Development Server

```bash
# From the root directory
npm run dev
```

Client application available at `http://localhost:5173`

### 5. Access the Application

1. Navigate to `http://localhost:5173`
2. Enter username and room ID
3. Click "Join Room"
4. Share room ID with others to join the same call
