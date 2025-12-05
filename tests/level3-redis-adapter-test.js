import { io } from "socket.io-client";

const URL = process.env.TEST_URL;
const token = process.env.TEST_JWT;

const socket = io(URL, { auth: { token } });

socket.on("redis-test", (msg) => {
  console.log("REDIS ADAPTER OK:", msg);
  process.exit(0);
});

setTimeout(() => {
  socket.emit("redis-test");
}, 2000);
