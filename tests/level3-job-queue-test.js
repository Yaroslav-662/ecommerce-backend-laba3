import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

socket.on("job_done", (msg) => {
  console.log("JOB PROCESSED:", msg);
  process.exit(0);
});

setTimeout(() => {
  socket.emit("createJob", { task: "sendEmail" });
}, 2000);
