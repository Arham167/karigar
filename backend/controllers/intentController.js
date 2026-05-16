// TODO: Implement intent parsing logic using Antigravity

exports.parseIntent = async (req, res) => {
  const { text } = req.body;
  // Mock response
  res.status(200).json({
    intent: "AC repair",
    entities: {
      location: "G-13",
      time: "tomorrow morning"
    },
    needsClarification: false
  });
};

exports.clarifyIntent = async (req, res) => {
  res.status(200).json({ message: "Intent clarified (mock)" });
};
