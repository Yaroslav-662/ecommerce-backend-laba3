import { io } from "socket.io-client";

const URL = process.env.TEST_URL || "https://ecommerce-backend-laba3.onrender.com";
const socket = io(URL);

socket.on("redis-test", (msg) => {
  console.log("REDIS ADAPTER OK:", msg);
  process.exit(0);
});

setTimeout(() => {
  socket.emit("redis-test");
}, 2000);
