const express = require('express');
const controller = require('../controllers/studentController');
const { verifyToken } = require('../utils/token');

// Optional login: a valid "Authorization: Bearer <token>" makes the handlers act as that user.
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    try { req.authUserId = Number(verifyToken(header.slice(7)).id) || undefined; } catch { /* ignore bad tokens */ }
  }
  next();
}

const router = express.Router();
router.use(optionalAuth);

router.get('/student-profile', controller.getStudentProfile);
router.get('/counsellors', controller.getCounsellors);
router.post('/academic-profile', controller.saveAcademicProfile);
router.get('/academic-profile/:userId', controller.getAcademicProfile);
router.delete('/academic-profile/:userId', controller.deleteAcademicProfile);
router.put('/user/profile', controller.updateUserProfile);
router.delete('/user/profile/:userId', controller.deleteUserProfile);
router.get('/courses', controller.getCourses);
router.get('/courses/:id', controller.getCourseDetails);
router.post('/inquiries', controller.sendInquiry);
router.get('/my-guidance', controller.getMyGuidance);
router.post('/aptitude-results', controller.saveAptitudeResults);
router.get('/course-selection', controller.getCourseSelection);
router.post('/course-selection', controller.setCourseSelection);
router.delete('/course-selection', controller.deleteCourseSelection);
router.get('/notifications', controller.getNotifications);
router.put('/notifications/mark-read', controller.markNotificationsRead);

module.exports = router;
