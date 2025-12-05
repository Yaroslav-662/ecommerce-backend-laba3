import { io } from "socket.io-client";

const token = "PASTE_JWT";
const userId = "USER123";

const socket = io("http://localhost:5000", { auth: { token } });

socket.on("personal", (msg) => {
  console.log("PERSONAL NOTIFICATION:", msg);
  process.exit(0);
});

setTimeout(() => {
  socket.emit("notifyUser", {
    toUserId: userId,
    message: "Hello personally!"
  });
}, 2000);
