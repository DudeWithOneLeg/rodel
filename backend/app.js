const express = require("express");
require("express-async-errors");
const morgan = require("morgan");
const cors = require("cors");
const csurf = require("csurf");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const routes = require("./routes");
const { ValidationError } = require("sequelize");
// const socketIo = require("socket.io");
const { ExpressPeerServer } = require("peer");
const http = require("http");

const { environment } = require("./config");
const isProduction = environment === "production";
const peers = {};
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
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: "/",
});
app.use('/peerjs', peerServer);
io.on("connection", (socket) => {
  console.log("A user connected", socket.id);
  socket.broadcast.emit("user-connected", { userId: socket.id });

  socket.on("join room", ({ room }) => {
    socket.join(room);
    console.log(room);
    console.log(`${socket.id} joined room: ${room}`);
  });

  socket.on('register', (peerId) => {
        peers[peerId] = socket.id;
    });

    socket.on('signal', ({ targetPeerId, payload }) => {
        if (peers[targetPeerId]) {
            io.to(peers[targetPeerId]).emit('signal', {
                peerId: socket.id,
                payload,
            });
        }
    });

  socket.on("send button press", (currentGamepad) => {
    // console.log("Received button press data:", currentGamepad);
    io.to(1).emit("receive button press", currentGamepad);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    for (let peerId in peers) {
            if (peers[peerId] === socket.id) {
                delete peers[peerId];
                break;
            }
    }
  });

  socket.on("offer", (data) => {
    console.log("offer");
    socket.broadcast.emit("offer", data);
  });

  socket.on("answer", (data) => {
    console.log("answer");
    socket.broadcast.emit("answer", data);
  });

  socket.on("ice-candidate", (data) => {
    console.log("ice");
    socket.broadcast.emit("ice-candidate", data);
  });
});

app.use(cookieParser());
app.use(morgan("dev"));
app.use(express.json());

// Set the _csrf token and create req.csrfToken method
// Security Middleware
if (!isProduction) {
  // enable cors only in development
  app.use(cors());
}

// helmet helps set a variety of headers to better secure your app
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
  // check if error is a Sequelize error:
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
