// Turns thrown errors (Express 5 forwards async rejections) into JSON responses.
export const errorHandler = (err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ message: err.message });
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ message: err.message });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'value';
    return res.status(409).json({ message: `That ${field} is already in use` });
  }
  if (err.name === 'MulterError') return res.status(400).json({ message: err.message });

  console.error(err);
  res.status(500).json({ message: 'Something went wrong' });
};

export const httpError = (status, message) => Object.assign(new Error(message), { status });
