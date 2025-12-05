import axios from "axios";

const URL = process.env.TEST_URL;
const token = process.env.TEST_JWT;

(async () => {
  console.time("no-cache");
  await axios.get(`${URL}/api/products?nocache=1`, { headers: { Authorization: token } });
  console.timeEnd("no-cache");

  console.time("cache");
  await axios.get(`${URL}/api/products`, { headers: { Authorization: token } });
  console.timeEnd("cache");

  process.exit(0);
})();
