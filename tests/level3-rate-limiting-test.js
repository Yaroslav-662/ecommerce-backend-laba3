import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

let count = 0;

const interval = setInterval(() => {
  socket.emit("spamEvent", { n: count++ });
}, 100);

socket.on("rate_limited", (msg) => {
  console.log("RATE LIMIT:", msg);
  clearInterval(interval);
  process.exit(0);
});
