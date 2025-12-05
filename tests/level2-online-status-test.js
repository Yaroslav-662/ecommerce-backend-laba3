import { io } from "socket.io-client";

const URL = process.env.TEST_URL;
const token = process.env.TEST_JWT;

const socket = io(URL, { auth: { token } });

socket.on("onlineUsers", (list) => {
  console.log("ONLINE USERS:", list);
});

setTimeout(() => process.exit(0), 5000);
