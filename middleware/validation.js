// backend/middleware/validation.js
const { sanitizeInput } = require('../utils/sanitizer');

function validateReport(req, res, next) {
  const { type, title, description } = req.body;
  
  if (!type || !['hero', 'corruption'].includes(type)) {
    return res.status(400).json({ error: 'Invalid report type' });
  }
  
  if (!title || title.trim().length < 10) {
    return res.status(400).json({ error: 'Title must be at least 10 characters' });
  }
  
  if (!description || description.trim().length < 50) {
    return res.status(400).json({ error: 'Description must be at least 50 characters' });
  }
  
  // Sanitize inputs
  req.body.title = sanitizeInput(title);
  req.body.description = sanitizeInput(description);
  
  next();
}

module.exports = {
  validateReport
};
