const express = require('express');
const { requireParent, requireParentAndChild } = require('../middleware/parentAuth');
const parent = require('../controllers/parent.controller');

// Mounted at /api/parent. Express 5 forwards rejected promises to the error handler.
const router = express.Router();

router.get('/children', requireParent, parent.listChildren);

// Everything below is scoped to one linked child (parent + link checked in one query).
const child = express.Router({ mergeParams: true });
child.use(requireParentAndChild);

child.get('/dashboard', parent.getDashboard);
child.get('/progress', parent.getProgress);
child.get('/guidance', parent.getGuidance);
child.get('/report', parent.getReport);
child.get('/access-logs', parent.listAccessLogs);

// CRUD 1: counsellor inquiries (list/create per child)
child.get('/inquiries', parent.listInquiries);
child.post('/inquiries', parent.createInquiry);

// CRUD 2: privacy & data-sharing preferences
child.get('/privacy', parent.getPrivacy);
child.post('/privacy', parent.createPrivacy);
child.put('/privacy', parent.updatePrivacy);
child.delete('/privacy', parent.deletePrivacy);

router.use('/students/:studentId', child);

// CRUD 1: edit/delete a single inquiry (ownership checked in the controller)
router.put('/inquiries/:inquiryId', requireParent, parent.updateInquiry);
router.delete('/inquiries/:inquiryId', requireParent, parent.deleteInquiry);

// Errors from this router only; never leak database details to the client.
router.use((err, req, res, next) => {
  console.error('[parent api]', err);
  res.status(500).json({ error: 'Something went wrong. Please try again.', code: 'SERVER_ERROR' });
});

module.exports = router;
