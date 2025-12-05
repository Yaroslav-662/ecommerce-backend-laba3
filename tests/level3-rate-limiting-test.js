import { io } from "socket.io-client";

const URL = process.env.TEST_URL || "https://ecommerce-backend-laba3.onrender.com";
const socket = io(URL);

let count = 0;
const interval = setInterval(() => {
  socket.emit("spamEvent", { n: count++ });
}, 100);

socket.on("rate_limited", (msg) => {
  console.log("RATE LIMIT:", msg);
  clearInterval(interval);
  process.exit(0);
});
