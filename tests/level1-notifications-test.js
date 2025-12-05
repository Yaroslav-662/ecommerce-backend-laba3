import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

socket.emit("joinRoom", "orders");

socket.on("notification", (msg) => {
  console.log("Notification received:", msg);
  process.exit(0);
});

setTimeout(() => {
  socket.emit("sendNotification", {
    room: "orders",
    message: "Test notification!",
  });
}, 2000);
