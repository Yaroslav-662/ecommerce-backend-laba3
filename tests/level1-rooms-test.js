import { io } from "socket.io-client";

const URL = process.env.TEST_URL;
const token = process.env.TEST_JWT;

const socket = io(URL, { auth: { token } });

socket.on("connect", () => {
  console.log("Connected:", socket.id);
  socket.emit("joinRoom", "orders");
  console.log("Joined room: orders");
});

socket.on("notification", (msg) => {
  console.log("Room notification:", msg);
});

setTimeout(() => process.exit(0), 5000);
