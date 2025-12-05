import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

socket.on("redis-test", (msg) => {
  console.log("REDIS ADAPTER OK:", msg);
  process.exit(0);
});

setTimeout(() => {
  socket.emit("redis-test");
}, 2000);
