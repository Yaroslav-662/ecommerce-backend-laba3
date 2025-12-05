import { io } from "socket.io-client";

const URL = process.env.TEST_URL || "https://ecommerce-backend-laba3.onrender.com";
const socket = io(URL);

socket.emit("joinRoom", "products");
socket.emit("joinRoom", "orders");
socket.emit("joinRoom", "users");

socket.on("productUpdated", (d) => console.log("PRODUCT:", d));
socket.on("orderUpdated", (d) => console.log("ORDER:", d));
socket.on("userUpdated", (d) => console.log("USER:", d));

setTimeout(() => process.exit(0), 8000);
