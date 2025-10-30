// backend/controllers/reportController.js
const { query } = require('../config/database');
const logger = require('../utils/logger');

async function getAllReports(req, res) {
  try {
    const { limit = 50, offset = 0, state, category, status = 'verified' } = req.query;
    
    let queryText = `
      SELECT * FROM reports 
      WHERE status = $1
    `;
    const params = [status];
    let paramCount = 1;
    
    if (state) {
      paramCount++;
      queryText += ` AND state = $${paramCount}`;
      params.push(state);
    }
    
    if (category) {
      paramCount++;
      queryText += ` AND category = $${paramCount}`;
      params.push(category);
    }
    
    queryText += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const result = await query(queryText, params);
    
    res.json({
      success: true,
      reports: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
}

async function getReportById(req, res) {
  try {
    const { id } = req.params;
    
    const result = await query(
      'SELECT * FROM reports WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Increment view count
    await query(
      'UPDATE reports SET view_count = view_count + 1 WHERE id = $1',
      [id]
    );
    
    res.json({ success: true, report: result.rows[0] });
  } catch (error) {
    logger.error('Get report error:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
}

async function createReport(req, res) {
  try {
    const { type, title, description, location, category } = req.body;
    
    const result = await query(
      `INSERT INTO reports (type, title, description, location, category, source_type, status)
       VALUES ($1, $2, $3, $4, $5, 'user', 'pending')
       RETURNING *`,
      [type, title, description, location, category]
    );
    
    const io = req.app.get('io');
    io.to(type).emit('update:feed', result.rows[0]);
    
    res.status(201).json({ success: true, report: result.rows[0] });
  } catch (error) {
    logger.error('Create report error:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
}

async function appreciateReport(req, res) {
  try {
    const { id } = req.params;
    const ipAddress = req.ip;
    
    // Check if already appreciated
    const existing = await query(
      'SELECT * FROM appreciations WHERE report_id = $1 AND ip_address = $2',
      [id, ipAddress]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already appreciated' });
    }
    
    // Add appreciation
    await query(
      'INSERT INTO appreciations (report_id, ip_address) VALUES ($1, $2)',
      [id, ipAddress]
    );
    
    // Update count
    const result = await query(
      'UPDATE reports SET appreciation_count = appreciation_count + 1 WHERE id = $1 RETURNING appreciation_count',
      [id]
    );
    
    const io = req.app.get('io');
    io.emit('appreciation:update', { reportId: id, count: result.rows[0].appreciation_count });
    
    res.json({ success: true, count: result.rows[0].appreciation_count });
  } catch (error) {
    logger.error('Appreciate error:', error);
    res.status(500).json({ error: 'Failed to appreciate' });
  }
}

async function getFeedByType(req, res) {
  try {
    const { type } = req.params;
    const { limit = 50 } = req.query;
    
    if (!['hero', 'corruption'].includes(type)) {
      return res.status(400).json({ error: 'Invalid feed type' });
    }
    
    const result = await query(
      `SELECT * FROM reports 
       WHERE type = $1 AND status = 'verified'
       ORDER BY created_at DESC 
       LIMIT $2`,
      [type, limit]
    );
    
    res.json({ success: true, reports: result.rows });
  } catch (error) {
    logger.error('Get feed error:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
}

module.exports = {
  getAllReports,
  getReportById,
  createReport,
  appreciateReport,
  getFeedByType
};
