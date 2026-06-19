export function createError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

export function errorMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  res.status(statusCode).json({ success: false, error: message });
}

export function notFoundMiddleware(req, res) {
  res.status(404).json({ success: false, error: 'Not found' });
}
