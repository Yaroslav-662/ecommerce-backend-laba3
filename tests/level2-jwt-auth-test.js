import { io } from "socket.io-client";

const URL = process.env.TEST_URL;
const token = process.env.TEST_JWT;

const socket = io(URL, { auth: { token } });

socket.on("connect", () => console.log("Authorized:", socket.id));
socket.on("auth_error", (err) => console.log("AUTH ERROR:", err));

setTimeout(() => process.exit(0), 3000);
