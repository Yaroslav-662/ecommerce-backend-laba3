import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

socket.on("connect", () => {
  console.log("Connected:", socket.id);
});

socket.on("hello", (msg) => {
  console.log("Server hello:", msg);
});

socket.on("connect_error", (err) => {
  console.error("Connection error:", err.message);
});

setTimeout(() => process.exit(0), 3000);
