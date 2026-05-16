// TODO: Implement auth controller logic

exports.sendOTP = async (req, res) => {
  res.status(200).json({ message: "OTP sent (mock)" });
};

exports.verifyOTP = async (req, res) => {
  res.status(200).json({ message: "OTP verified (mock)", token: "mock-jwt-token" });
};
