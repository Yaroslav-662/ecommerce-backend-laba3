import { io } from "socket.io-client";

const URL = process.env.TEST_URL;
const token = process.env.TEST_JWT;
const userId = process.env.TEST_USER_ID;

const socket = io(URL, { auth: { token } });

socket.on("personal", (msg) => {
  console.log("PERSONAL NOTIFICATION:", msg);
  process.exit(0);
});

setTimeout(() => {
  socket.emit("notifyUser", { toUserId: userId, message: "Hello personally!" });
}, 2000);
