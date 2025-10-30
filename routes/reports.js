// backend/routes/reports.js
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { validateReport } = require('../middleware/validation');

router.get('/', reportController.getAllReports);
router.get('/:id', reportController.getReportById);
router.post('/', validateReport, reportController.createReport);
router.post('/:id/appreciate', reportController.appreciateReport);
router.get('/feed/:type', reportController.getFeedByType);

module.exports = router;
