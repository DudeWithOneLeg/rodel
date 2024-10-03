const express = require("express");
require("express-async-errors");
const morgan = require("morgan");
const cors = require("cors");
const csurf = require("csurf");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const routes = require("./routes");
const { ValidationError } = require("sequelize");
const http = require("http");

const { environment } = require("./config");
const isProduction = environment === "production";
const app = express();
const server = http.createServer(app);
let io = isProduction
  ? require("socket.io")(server, {
    cors: {
      origin: "https://rodel.onrender.com",
      methods: ["GET", "POST"],
    },
  })
  : require("socket.io")(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`${socket.id} joined room: ${roomId}`);

    // Check the number of clients in the room
    const clientsInRoom = io.sockets.adapter.rooms.get(roomId);
    const numClients = clientsInRoom ? clientsInRoom.size : 0;

    // If more than one client is in the room, request the new client to create an offer
    if (numClients > 1) {
      socket.emit("create-offer");
      console.log("create-offer");
    }
  });

  socket.on("offer", ({ offer, roomId }) => {
    socket.to(roomId).emit("offer", offer);
    console.log("offer sent to room:", roomId);
  });

  socket.on("answer", ({ answer, roomId }) => {
    socket.to(roomId).emit("answer", answer);
    console.log("answer sent to room:", roomId);
  });

  socket.on("ice-candidate", ({ candidate, roomId }) => {
    socket.to(roomId).emit("ice-candidate", candidate);
    console.log("ice-candidate sent to room:", candidate);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
  });
});

app.use(cookieParser());
app.use(morgan("dev"));
app.use(express.json());

if (!isProduction) {
  app.use(cors());
}

app.use(
  helmet.crossOriginResourcePolicy({
    policy: "cross-origin",
  })
);
app.use(
  csurf({
    cookie: {
      secure: isProduction,
      sameSite: isProduction && "Lax",
      httpOnly: true,
    },
  })
);

app.use(routes);

app.use((_req, _res, next) => {
  const err = new Error("The requested resource couldn't be found.");
  err.title = "Resource Not Found";
  err.errors = { message: "The requested resource couldn't be found." };
  err.status = 404;
  next(err);
});

app.use((err, _req, _res, next) => {
  if (err instanceof ValidationError) {
    let errors = {};
    for (let error of err.errors) {
      errors[error.path] = error.message;
    }
    err.title = "Validation error";
    err.errors = errors;
  }
  next(err);
});

app.use((err, _req, res, _next) => {
  res.status(err.status || 500);
  console.error(err);
  res.json({
    title: err.title || "Server Error",
    message: err.message,
    errors: err.errors,
    stack: isProduction ? null : err.stack,
  });
});

module.exports = server;
