import axios from "axios";

(async () => {
  console.time("no-cache");
  await axios.get("http://localhost:5000/api/products?nocache=1");
  console.timeEnd("no-cache");

  console.time("cache");
  await axios.get("http://localhost:5000/api/products");
  console.timeEnd("cache");

  process.exit(0);
})();
