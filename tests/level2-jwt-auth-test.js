import { io } from "socket.io-client";

const token = "PASTE_YOUR_JWT_HERE";

const socket = io("http://localhost:5000", {
  auth: { token }
});

socket.on("connect", () => console.log("Authorized:", socket.id));

socket.on("auth_error", (err) => console.log("AUTH ERROR:", err));

setTimeout(() => process.exit(0), 3000);
