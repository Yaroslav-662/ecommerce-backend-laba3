import { io } from "socket.io-client";
import axios from "axios";

const socket = io("http://localhost:5000");

socket.emit("joinRoom", "orders");

socket.on("orderUpdated", (data) => {
  console.log("REAL-TIME ORDER UPDATE:", data);
  process.exit(0);
});

setTimeout(async () => {
  await axios.post("http://localhost:5000/api/orders", {
    user: "Tester",
    price: 999,
  });
}, 2000);
