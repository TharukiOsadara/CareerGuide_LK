const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireCounsellor } = require('../middleware/counsellorAuth');
const { validateStudentId, validateStudentFilters } = require('../middleware/counsellorValidation');
const counsellor = require('../controllers/counsellor.controller');

const router = express.Router();
router.use((req, res, next) => {
  if (req.headers.authorization) {
    return authenticate(req, res, () => requireCounsellor(req, res, next));
  }
  return requireCounsellor(req, res, next);
});

router.get('/dashboard', validateStudentFilters, counsellor.getDashboard);
router.get('/students', validateStudentFilters, counsellor.listStudents);
router.get('/students/:studentId', validateStudentId, counsellor.getStudentProfile);
router.get('/students/:studentId/guidance', validateStudentId, counsellor.getGuidance);
router.post('/students/:studentId/guidance', validateStudentId, counsellor.saveGuidance);
router.put('/students/:studentId/guidance', validateStudentId, counsellor.updateGuidance);
router.delete('/students/:studentId/guidance', validateStudentId, counsellor.deleteGuidance);
router.post('/students/:studentId/guidance/review', validateStudentId, counsellor.markReviewed);
router.get('/guidance', counsellor.listGuidance);
router.get('/inquiries', counsellor.listInquiries);
router.post('/inquiries/parent/:id/read', counsellor.markParentInquiryRead);
router.post('/inquiries/:type/:id/reply', counsellor.replyToInquiry);
router.put('/inquiries/:type/:id/reply', counsellor.replyToInquiry);
router.delete('/inquiries/:type/:id', counsellor.deleteInquiry);
router.get('/settings', counsellor.getSettings);
router.post('/settings', counsellor.createSettings);
router.put('/settings', counsellor.updateSettings);
router.delete('/settings', counsellor.deleteSettings);
router.get('/my-courses', counsellor.listMyCourses);
router.post('/my-courses', counsellor.addMyCourse);
router.delete('/my-courses/:courseId', counsellor.removeMyCourse);

router.use((req, res) => {
  res.status(404).json({ error: 'Counsellor endpoint not found', code: 'NOT_FOUND' });
});

router.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error('[counsellor api]', err);
  res.status(500).json({ error: 'Something went wrong. Please try again.', code: 'SERVER_ERROR' });
});

module.exports = router;
