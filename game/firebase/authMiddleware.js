const decodeToken = async (req, res, next) => {
  const token = req.headers.authorization.split(' ')[1];
  try {
    const decodeValue = await admin.auth().verifyIdToken(token);
    if (decodeValue) {
      req.user = decodeValue;
      return next();
    }
    return res.status(401).json({ message: 'Unauthorized' });
  } catch (e) {
    return res.status(500).json({ message: 'Internal Error' });
  }
};

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  } else {
    await decodeToken(req, res, next);
  }
};

module.exports = authMiddleware;