import { Server } from "socket.io";
import express from "express";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let currentDrawer: string | null = null;
// Persist a simple event log to reconstruct the canvas for late joiners
// We reset this on clear; each event contains the originating user for path continuity
type BeginPathEvent = { type: "beginPath"; userId: string; x: number; y: number };
type DrawEvent = {
  type: "draw";
  userId: string;
  x: number;
  y: number;
  color: string;
  size: number;
};
type CanvasEvent = BeginPathEvent | DrawEvent;

const drawEvents: CanvasEvent[] = [];

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("beginPath", (data) => {
    const payload: BeginPathEvent = { type: "beginPath", userId: socket.id, x: data.x, y: data.y };
    drawEvents.push(payload);
    socket.broadcast.emit("beginPath", payload);
  });

  socket.on("draw", (data) => {
    const payload: DrawEvent = {
      type: "draw",
      userId: socket.id,
      x: data.x,
      y: data.y,
      color: data.color,
      size: data.size,
    };
    drawEvents.push(payload);
    socket.broadcast.emit("draw", payload);
  });

  socket.on("clear", () => {
    // Reset server-side state and inform everyone
    drawEvents.length = 0;
    socket.broadcast.emit("clear");
  });

  // Late joiners can request the current canvas state
  socket.on("requestCanvasState", () => {
    socket.emit("canvasState", drawEvents);
    if (currentDrawer) {
      socket.emit("drawGranted", currentDrawer);
    }
  });

  socket.on("requestDraw", () => {
    if (!currentDrawer) {
      console.log("User requesting draw rights:", socket.id);
      currentDrawer = socket.id;
      io.emit("drawGranted", socket.id);
    }
  });

  socket.on("releaseDraw", () => {
    if (currentDrawer === socket.id) {
      currentDrawer = null;
      io.emit("drawRevoked");
    }
  });
});

const PORT = process.env.PORT || 4001;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
