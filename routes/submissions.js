// backend/routes/submissions.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { sanitizeInput } = require('../utils/sanitizer');
const logger = require('../utils/logger');

router.post('/', async (req, res) => {
  try {
    const { type, title, description, location, isAnonymous, submittedBy, email } = req.body;
    
    const sanitized = {
      type: sanitizeInput(type),
      title: sanitizeInput(title),
      description: sanitizeInput(description),
      location: sanitizeInput(location),
      submittedBy: isAnonymous ? 'Anonymous' : sanitizeInput(submittedBy),
      email: isAnonymous ? null : sanitizeInput(email)
    };
    
    const result = await query(
      `INSERT INTO reports (type, title, description, location, source_type, status)
       VALUES ($1, $2, $3, $4, 'user', 'pending')
       RETURNING *`,
      [sanitized.type, sanitized.title, sanitized.description, sanitized.location]
    );
    
    const report = result.rows[0];
    
    await query(
      `INSERT INTO submissions (report_id, submitted_by, email, is_anonymous, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [report.id, sanitized.submittedBy, sanitized.email, isAnonymous, req.ip]
    );
    
    const io = req.app.get('io');
    io.emit('new:submission', report);
    
    res.status(201).json({ success: true, report });
  } catch (error) {
    logger.error('Submission error:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

module.exports = router;
