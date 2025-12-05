import { io } from "socket.io-client";

const URL = process.env.TEST_URL || "https://ecommerce-backend-laba3.onrender.com";
const socket = io(URL);

socket.on("connect", () => {
  console.log("Connected:", socket.id);
  socket.emit("joinRoom", "orders");
  console.log("Joined room: orders");
});

socket.on("notification", (msg) => {
  console.log("Room notification:", msg);
});

setTimeout(() => process.exit(0), 5000);
