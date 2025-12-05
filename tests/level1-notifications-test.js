import { io } from "socket.io-client";

const URL = process.env.TEST_URL;
const token = process.env.TEST_JWT;

const socket = io(URL, { auth: { token } });

socket.emit("joinRoom", "orders");

socket.on("notification", (msg) => {
  console.log("Notification received:", msg);
  process.exit(0);
});

setTimeout(() => {
  socket.emit("sendNotification", { room: "orders", message: "Test notification!" });
}, 2000);
