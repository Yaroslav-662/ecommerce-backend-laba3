import axios from "axios";

const URL = process.env.TEST_URL;
const token = process.env.TEST_JWT;

(async () => {
  const metrics = await axios.get(`${URL}/metrics`, { headers: { Authorization: token } });
  console.log(metrics.data);
  process.exit(0);
})();
