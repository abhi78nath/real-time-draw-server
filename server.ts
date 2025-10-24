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

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("beginPath", (data) => {
    socket.broadcast.emit("beginPath", { ...data, userId: socket.id });
  });

  socket.on("draw", (data) => {
    socket.broadcast.emit("draw", { ...data, userId: socket.id });
  });

  socket.on("clear", () => {
    socket.broadcast.emit("clear");
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
