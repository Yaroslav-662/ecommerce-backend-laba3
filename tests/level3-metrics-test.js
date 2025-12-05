import axios from "axios";

(async () => {
  const metrics = await axios.get("http://localhost:5000/metrics");
  console.log(metrics.data);

  process.exit(0);
})();
