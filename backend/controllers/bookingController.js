// TODO: Implement booking controller logic

exports.createBooking = async (req, res) => {
  res.status(201).json({ message: "Booking created (mock)" });
};

exports.getUserBookings = async (req, res) => {
  res.status(200).json({ bookings: [] });
};
