import { io } from "socket.io-client";

const URL = process.env.TEST_URL || "https://ecommerce-backend-laba3.onrender.com";
const socket = io(URL);

socket.on("onlineUsers", (list) => {
  console.log("ONLINE USERS:", list);
});

setTimeout(() => process.exit(0), 5000);
