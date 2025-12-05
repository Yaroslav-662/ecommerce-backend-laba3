import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

socket.on("onlineUsers", (list) => {
  console.log("ONLINE USERS:", list);
});

setTimeout(() => process.exit(0), 5000);
