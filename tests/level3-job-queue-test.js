import { io } from "socket.io-client";

const URL = process.env.TEST_URL;
const token = process.env.TEST_JWT;

const socket = io(URL, { auth: { token } });

socket.on("job_done", (msg) => {
  console.log("JOB PROCESSED:", msg);
  process.exit(0);
});

setTimeout(() => {
  socket.emit("createJob", { task: "sendEmail" });
}, 2000);
