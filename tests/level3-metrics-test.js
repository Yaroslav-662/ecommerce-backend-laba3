import axios from "axios";

const URL = process.env.TEST_URL || "https://ecommerce-backend-laba3.onrender.com";

(async () => {
  const metrics = await axios.get(`${URL}/metrics`);
  console.log(metrics.data);
  process.exit(0);
})();
