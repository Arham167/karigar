// TODO: Implement Google Maps API wrapper
const axios = require("axios");

const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

exports.getDistance = async (origin, destination) => {
  // Mock distance calculation
  return { distance: "5 km", duration: "15 mins" };
};
