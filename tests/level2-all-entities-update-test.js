import { io } from "socket.io-client";

const URL = process.env.TEST_URL;
const token = process.env.TEST_JWT;

const socket = io(URL, { auth: { token } });

socket.emit("joinRoom", "products");
socket.emit("joinRoom", "orders");
socket.emit("joinRoom", "users");

socket.on("productUpdated", (d) => console.log("PRODUCT:", d));
socket.on("orderUpdated", (d) => console.log("ORDER:", d));
socket.on("userUpdated", (d) => console.log("USER:", d));

setTimeout(() => process.exit(0), 8000);
