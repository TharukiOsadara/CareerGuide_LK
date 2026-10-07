const express = require('express');
const { requireCounsellor } = require('../middleware/counsellorAuth');
const counsellor = require('../controllers/counsellor.controller');

const router = express.Router();
router.use(requireCounsellor);

router.get('/dashboard', counsellor.getDashboard);
router.get('/students', counsellor.listStudents);
router.get('/students/:studentId', counsellor.getStudentProfile);
router.get('/students/:studentId/guidance', counsellor.getGuidance);
router.post('/students/:studentId/guidance', counsellor.saveGuidance);
router.put('/students/:studentId/guidance', counsellor.updateGuidance);
router.delete('/students/:studentId/guidance', counsellor.deleteGuidance);
router.post('/students/:studentId/guidance/review', counsellor.markReviewed);
router.get('/settings', counsellor.getSettings);
router.put('/settings', counsellor.updateSettings);

module.exports = router;
