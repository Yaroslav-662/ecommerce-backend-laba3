import mongoose from "mongoose";

(async () => {
  const start = Date.now();

  await mongoose.connect("mongodb://localhost:27017/test");

  const slowQueries = await mongoose.connection.db
    .collection("system.profile")
    .find({})
    .sort({ millis: -1 })
    .limit(5)
    .toArray();

  console.log("SLOWEST QUERIES:", slowQueries);
  process.exit(0);
})();
