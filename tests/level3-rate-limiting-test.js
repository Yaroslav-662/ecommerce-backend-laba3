import { io } from "socket.io-client";

const URL = process.env.TEST_URL;
const token = process.env.TEST_JWT;

const socket = io(URL, { auth: { token } });

let count = 0;
const interval = setInterval(() => {
  socket.emit("spamEvent", { n: count++ });
}, 100);

socket.on("rate_limited", (msg) => {
  console.log("RATE LIMIT:", msg);
  clearInterval(interval);
  process.exit(0);
});
