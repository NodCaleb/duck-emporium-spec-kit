/**
 * Global Express error-handling middleware.
 * Converts any error thrown in a route into the standard API envelope.
 * Never exposes stack traces in the response body.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status ?? err.statusCode ?? 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ success: false, error: message });
}
