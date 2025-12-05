import axios from "axios";

const URL = process.env.TEST_URL || "https://ecommerce-backend-laba3.onrender.com";

(async () => {
  console.time("no-cache");
  await axios.get(`${URL}/api/products?nocache=1`);
  console.timeEnd("no-cache");

  console.time("cache");
  await axios.get(`${URL}/api/products`);
  console.timeEnd("cache");

  process.exit(0);
})();
