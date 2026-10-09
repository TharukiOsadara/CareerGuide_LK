const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireCounsellor } = require('../middleware/counsellorAuth');
const { validateStudentId, validateStudentFilters } = require('../middleware/counsellorValidation');
const counsellor = require('../controllers/counsellor.controller');
const counsellorStudentProfiles = require('../controllers/counsellorStudentProfiles.controller');
const counsellorDashboard = require('../controllers/counsellorDashboard.controller');

const router = express.Router();
router.use((req, res, next) => {
  if (req.headers.authorization) {
    return authenticate(req, res, () => requireCounsellor(req, res, next));
  }
  return requireCounsellor(req, res, next);
});

router.get('/dashboard', validateStudentFilters, counsellor.getDashboard);
router.get('/dashboard/overview', counsellorDashboard.getOverview);
router.get('/students', validateStudentFilters, counsellor.listStudents);
router.get('/courses', counsellor.listAssignedCourses);
router.get('/student-profiles/:studentId', validateStudentId, counsellorStudentProfiles.getStudentProfile);
router.put('/student-profiles/:studentId', validateStudentId, counsellorStudentProfiles.updateStudentProfile);
router.delete('/student-profiles/:studentId', validateStudentId, counsellorStudentProfiles.deactivateStudentProfile);
router.get('/students/:studentId', validateStudentId, counsellor.getStudentProfile);
router.get('/students/:studentId/guidance', validateStudentId, counsellor.getGuidance);
router.post('/students/:studentId/guidance', validateStudentId, counsellor.saveGuidance);
router.put('/students/:studentId/guidance', validateStudentId, counsellor.updateGuidance);
router.delete('/students/:studentId/guidance', validateStudentId, counsellor.deleteGuidance);
router.get('/guidance', counsellor.listGuidance);
router.get('/guidance/:guidanceId', counsellor.getGuidanceById);
router.delete('/guidance/:guidanceId', counsellor.deleteGuidanceById);
router.post('/students/:studentId/guidance/review', validateStudentId, counsellor.markReviewed);
router.get('/settings', counsellor.getSettings);
router.put('/settings', counsellor.updateSettings);
router.get('/profile', counsellor.getProfile);
router.put('/profile', counsellor.updateProfile);
router.put('/profile/password', counsellor.changePassword);
router.get('/inquiries', counsellor.listInquiries);
router.get('/inquiries/:inquiryId', counsellor.getInquiry);
router.put('/inquiries/:inquiryId/reply', counsellor.replyToInquiry);
router.delete('/inquiries/:inquiryId/reply', counsellor.deleteInquiryReply);
router.get('/notifications', counsellor.listNotifications);
router.post('/notifications/read-all', counsellor.markAllNotificationsRead);
router.get('/notifications/:notificationId', counsellor.getNotificationDetail);
router.post('/notifications/:notificationId/reply', counsellor.replyToNotification);
router.put('/notifications/:notificationId/replies/:replyId', counsellor.editNotificationReply);
router.delete('/notifications/:notificationId/replies/:replyId', counsellor.deleteNotificationReply);
router.post('/notifications/:notificationId/read', counsellor.markNotificationRead);
router.delete('/notifications/:notificationId', counsellor.deleteNotification);

router.use((req, res) => {
  res.status(404).json({ error: 'Counsellor endpoint not found', code: 'NOT_FOUND' });
});

router.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error('[counsellor api]', err);
  res.status(500).json({ error: 'Something went wrong. Please try again.', code: 'SERVER_ERROR' });
});

module.exports = router;
