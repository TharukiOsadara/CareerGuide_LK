const express = require('express');
const controller = require('../controllers/studentController');

const router = express.Router();

router.get('/student-profile', controller.getStudentProfile);
router.get('/counsellors', controller.getCounsellors);
router.post('/academic-profile', controller.saveAcademicProfile);
router.get('/courses', controller.getCourses);
router.get('/courses/:id', controller.getCourseDetails);
router.post('/inquiries', controller.sendInquiry);
router.get('/notifications', controller.getNotifications);
router.put('/notifications/mark-read', controller.markNotificationsRead);

module.exports = router;
