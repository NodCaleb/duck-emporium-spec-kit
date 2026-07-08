/**
 * Middleware that requires a non-empty X-Session-ID request header.
 * Responds with HTTP 400 if the header is absent or empty.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requireSession(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId || sessionId.trim() === '') {
    return res.status(400).json({ success: false, error: 'X-Session-ID header is required' });
  }
  next();
}
