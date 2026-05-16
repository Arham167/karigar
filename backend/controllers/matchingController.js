// TODO: Implement provider matching logic

exports.matchProviders = async (req, res) => {
  res.status(200).json({
    recommendedProviders: [],
    criteria: {}
  });
};
