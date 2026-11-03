export function notFound(req, res) {
  res.status(404).json({ message: 'API route not found' });
}

// Turns any error thrown in a route into a clean JSON reply
export function errorHandler(err, req, res, next) {
  // Mongoose validation: send the first message, plus one message per field for the form
  if (err.name === 'ValidationError') {
    const errors = Object.fromEntries(Object.entries(err.errors).map(([field, e]) => [field, e.message]));
    return res.status(400).json({ message: Object.values(errors)[0], errors });
  }
  if (err.name === 'CastError') return res.status(400).json({ message: `Invalid ${err.path}` });
  if (err.code === 11000) return res.status(409).json({ message: 'This already exists' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON' });
  if (err.status) return res.status(err.status).json({ message: err.message });

  console.error(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
}
