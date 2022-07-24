const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const cors = require("cors");
const createError = require("http-errors");
const morgan = require("morgan");
require("dotenv").config();
const path = require("path");
const PORT = process.env.PORT || 8012;
const { connectDB } = require("./init_mongodb");
const socketioJwt = require("socketio-jwt");
const { createFolders } = require("./helpers/index");
const util = require("util");
const {
  connectRedis,
  RedisClient,
  storeValueRedis,
  getValueRedis,
  removeValueRedis,
} = require("./init_redis");
createFolders();
connectDB();
connectRedis();

app.use(express.json({ limit: "50mb" }));
app.use("/assets", express.static(path.join(__dirname, "uploads", "avatars")));
app.use("/assets", express.static(path.join(__dirname, "uploads", "requests")));
app.use("/assets", express.static(path.join(__dirname, "assets", "images")));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));
app.use(morgan("dev"));
app.use(cors());

io.use(
  socketioJwt.authorize({
    secret: process.env.JWT_SECRET,
    handshake: true,
    auth_header_required: true,
  })
);

io.on("connection", (socket) => {
  console.log("a user connected", socket.id);
  storeValueRedis(socket.handshake.headers.app, {
    id: socket.id,
    user: socket.decoded_token,
    expo: socket.handshake.headers.app,
  });
  socket.on("disconnect", () => {
    removeValueRedis(socket.handshake.headers.app);
    console.log(`Client Disconnected`, socket.id);
  });
});

app.use((req, res, next) => {
  req.io = io;
  next();
});
app.use(require("./routes/auth"));
app.use(require("./routes/request"));
app.use(require("./routes/connection"));
app.get("/", async (req, res) => {
  res.status(200).json({
    error: false,
    status: true,
    message: "Neoface / Route",
  });
});

app.use(async (req, res, next) => {
  next(createError.NotFound());
});

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send({
    error: {
      status: err.status || 500,
      message: err.message,
    },
  });
});

http.listen(PORT, () => {
  console.log(`Server ${process.pid} Up on ${PORT}`);
});
