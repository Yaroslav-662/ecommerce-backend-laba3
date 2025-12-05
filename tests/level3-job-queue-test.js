import { io } from "socket.io-client";

const URL = process.env.TEST_URL || "https://ecommerce-backend-laba3.onrender.com";
const socket = io(URL);

socket.on("job_done", (msg) => {
  console.log("JOB PROCESSED:", msg);
  process.exit(0);
});

setTimeout(() => {
  socket.emit("createJob", { task: "sendEmail" });
}, 2000);
