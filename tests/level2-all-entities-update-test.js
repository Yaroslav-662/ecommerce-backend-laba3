import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

socket.emit("joinRoom", "products");
socket.emit("joinRoom", "orders");
socket.emit("joinRoom", "users");

socket.on("productUpdated", (d) => console.log("PRODUCT:", d));
socket.on("orderUpdated", (d) => console.log("ORDER:", d));
socket.on("userUpdated", (d) => console.log("USER:", d));

setTimeout(() => process.exit(0), 8000);
