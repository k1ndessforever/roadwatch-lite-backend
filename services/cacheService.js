// backend/services/cacheService.js
const NodeCache = require('node-cache');

const cache = new NodeCache({
  stdTTL: 600, // 10 minutes default
  checkperiod: 120,
  useClones: false
});

function get(key) {
  return cache.get(key);
}

function set(key, value, ttl = 600) {
  return cache.set(key, value, ttl);
}

function del(key) {
  return cache.del(key);
}

function flush() {
  return cache.flushAll();
}

module.exports = {
  get,
  set,
  del,
  flush
};
