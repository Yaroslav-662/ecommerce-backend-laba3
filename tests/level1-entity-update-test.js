import { io } from "socket.io-client";
import axios from "axios";

const URL = process.env.TEST_URL;
const token = process.env.TEST_JWT;

const socket = io(URL, { auth: { token } });

socket.emit("joinRoom", "orders");

socket.on("orderUpdated", (data) => {
  console.log("REAL-TIME ORDER UPDATE:", data);
  process.exit(0);
});

setTimeout(async () => {
  await axios.post(
    `${URL}/api/orders`,
    { user: "Tester", price: 999 },
    { headers: { Authorization: token } }
  );
}, 2000);
