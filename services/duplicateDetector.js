// backend/services/duplicateDetector.js
const { query } = require('../config/database');
const cacheService = require('./cacheService');

async function check(contentHash) {
  // Check in-memory cache first
  const cached = cacheService.get(`duplicate:${contentHash}`);
  if (cached) {
    return true;
  }
  
  // Check database
  try {
    const result = await query(
      'SELECT content_hash FROM reports WHERE content_hash = $1',
      [contentHash]
    );
    
    if (result.rows.length > 0) {
      // Cache for 1 hour
      cacheService.set(`duplicate:${contentHash}`, true, 3600);
      return true;
    }
    
    // Store in content_cache
    await query(
      `INSERT INTO content_cache (content_hash) 
       VALUES ($1) 
       ON CONFLICT (content_hash) 
       DO UPDATE SET occurrence_count = content_cache.occurrence_count + 1`,
      [contentHash]
    );
    
    return false;
  } catch (error) {
    console.error('Duplicate check error:', error);
    return false;
  }
}

module.exports = {
  check
};
