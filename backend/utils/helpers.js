// Utility functions for the backend

exports.formatCurrency = (amount) => {
  return `PKR ${amount.toFixed(2)}`;
};

exports.generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
