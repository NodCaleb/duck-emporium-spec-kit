import { timingSafeEqual } from 'crypto';

/**
 * Middleware that validates the X-Admin-Password request header against
 * the ADMIN_PASSWORD environment variable using a constant-time comparison
 * to prevent timing attacks.
 *
 * Responds with HTTP 401 if the header is missing, empty, or does not match.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function adminAuth(req, res, next) {
  const provided = req.headers['x-admin-password'];
  const expected = process.env.ADMIN_PASSWORD;

  if (!provided || provided.trim() === '' || !expected) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  let match = false;
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length === b.length) {
      match = timingSafeEqual(a, b);
    }
  } catch {
    match = false;
  }

  if (!match) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  next();
}
