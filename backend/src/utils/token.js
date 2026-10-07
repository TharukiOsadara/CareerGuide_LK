const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

const signToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

// Trim Neon z-score style numerics and shape the user object sent to clients.
const publicUser = (u) => ({
  id: u.id,
  fullName: u.full_name,
  email: u.email,
  role: u.role,
  alStream: u.al_stream,
  zScore: u.z_score === null || u.z_score === undefined ? null : Number(u.z_score),
  status: u.status,
  adminApproved: u.admin_approved,
  isSuperAdmin: u.is_super_admin,
  profileCompletion: u.profile_completion,
  avatarInitials: u.avatar_initials,
  lastLoginAt: u.last_login_at,
});

module.exports = { signToken, verifyToken, publicUser };
