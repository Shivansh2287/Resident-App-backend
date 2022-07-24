const redis = require("redis");

const RedisClient = redis.createClient({
  host: "localhost",
  port: 6379,
  retry_strategy: () => 1000,
});

const connectRedis = async () => {
  RedisClient.on("error", (err) => console.log("Redis Client Error", err));
  await RedisClient.connect();
  await RedisClient.set("mamciata", 12412421);
  const value = await RedisClient.get("mamciata");
};
process.on("SIGINT", async () => {
  await RedisClient.quit();
  process.exit(0);
});
const storeValueRedis = async (key, value) => {
  await RedisClient.set(key, JSON.stringify(value));
};
const getValueRedis = async (key) => {
  const value = await RedisClient.get(key);
  return JSON.parse(value);
};
const removeValueRedis = async (key) => {
  await RedisClient.del(key);
};

module.exports = {
  connectRedis,
  RedisClient,
  storeValueRedis,
  getValueRedis,
  removeValueRedis,
};
