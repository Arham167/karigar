// TODO: Implement JWT verification logic
module.exports = (req, res, next) => {
  // Mock auth check
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }
  next();
};
