const { parseId, validateListFilters } = require('../validators/counsellor.validators');

function validationError(res, error) {
  return res.status(400).json({ error, code: 'VALIDATION' });
}

function validateStudentId(req, res, next) {
  const studentId = parseId(req.params.studentId);
  if (!studentId) return validationError(res, 'Invalid student id');
  req.params.studentId = String(studentId);
  next();
}

function validateStudentFilters(req, res, next) {
  const result = validateListFilters(req.query);
  if (result.error) return validationError(res, result.error);
  next();
}

module.exports = { validateStudentId, validateStudentFilters };
