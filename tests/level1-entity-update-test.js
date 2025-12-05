import { io } from "socket.io-client";
import axios from "axios";

const URL = process.env.TEST_URL || "https://ecommerce-backend-laba3.onrender.com";
const socket = io(URL);

socket.emit("joinRoom", "orders");

socket.on("orderUpdated", (data) => {
  console.log("REAL-TIME ORDER UPDATE:", data);
  process.exit(0);
});

setTimeout(async () => {
  await axios.post(`${URL}/api/orders`, { user: "Tester", price: 999 });
}, 2000);
