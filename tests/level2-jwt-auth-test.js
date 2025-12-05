import { io } from "socket.io-client";

const URL = process.env.TEST_URL || "https://ecommerce-backend-laba3.onrender.com";
const token = process.env.TEST_JWT || "PASTE_YOUR_JWT_HERE";

const socket = io(URL, { auth: { token } });

socket.on("connect", () => console.log("Authorized:", socket.id));
socket.on("auth_error", (err) => console.log("AUTH ERROR:", err));

setTimeout(() => process.exit(0), 3000);
