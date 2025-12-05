import mongoose from "mongoose";

const DB_URI = process.env.TEST_DB_URI;

(async () => {
  const start = Date.now();

  await mongoose.connect(DB_URI);

  const slowQueries = await mongoose.connection.db
    .collection("system.profile")
    .find({})
    .sort({ millis: -1 })
    .limit(5)
    .toArray();

  console.log("SLOWEST QUERIES:", slowQueries);
  process.exit(0);
})();
