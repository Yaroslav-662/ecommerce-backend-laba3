import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  reconnectionAttempts: 5,
  reconnectionDelay: 500
});

socket.on("connect", () => console.log("Connected:", socket.id));
socket.on("reconnect_attempt", () => console.log("Trying reconnect..."));
socket.on("reconnect_failed", () => console.log("Reconnect failed"));

setTimeout(() => process.exit(0), 8000);
