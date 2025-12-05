import { io } from "socket.io-client";

const URL = process.env.TEST_URL || "https://ecommerce-backend-laba3.onrender.com";
const socket = io(URL, { reconnectionAttempts: 5, reconnectionDelay: 500 });

socket.on("connect", () => console.log("Connected:", socket.id));
socket.on("reconnect_attempt", () => console.log("Trying reconnect..."));
socket.on("reconnect_failed", () => console.log("Reconnect failed"));

setTimeout(() => process.exit(0), 8000);
