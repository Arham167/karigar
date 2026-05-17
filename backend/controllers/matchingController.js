const supabase = require("../utils/supabase");

// Haversine formula to calculate distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return parseFloat(d.toFixed(2));
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * POST /api/providers/match
 * Body: {
 *   service: "Plumber",
 *   time: "5 PM",
 *   resolvedTimestamp: "2026-05-18T17:00:00.000Z",
 *   location: "Gulshan",
 *   latitude: 24.8607,
 *   longitude: 67.0011
 * }
 */
exports.matchProviders = async (req, res) => {
  try {
    const { service, time, resolvedTimestamp, location, latitude, longitude } = req.body;

    console.log("[Matching Engine] Received request to match providers for:", {
      service,
      time,
      resolvedTimestamp,
      location,
      latitude,
      longitude
    });

    if (!service) {
      return res.status(400).json({
        success: false,
        error: "Service type is required for matching."
      });
    }

    // 1. Fetch all providers and their offered services
    const { data: dbProviders, error: dbError } = await supabase
      .from("providers")
      .select(`
        *,
        provider_services (
          service_type,
          base_rate
        )
      `);

    if (dbError) {
      console.error("[Matching Engine] Error fetching providers from Supabase:", dbError);
    }

    let matchingProviders = [];

    if (dbProviders && dbProviders.length > 0) {
      console.log(`[Matching Engine] Found ${dbProviders.length} providers in database. Filtering...`);

      // 2. Filter providers by service matching (case-insensitive)
      matchingProviders = dbProviders.filter(provider => {
        const hasMatchingSpec = provider.specialization && 
          provider.specialization.toLowerCase().includes(service.toLowerCase());

        const hasMatchingService = provider.provider_services && 
          provider.provider_services.some(ps => 
            ps.service_type.toLowerCase().includes(service.toLowerCase())
          );

        return hasMatchingSpec || hasMatchingService;
      });

      console.log(`[Matching Engine] ${matchingProviders.length} providers offer service: ${service}`);

      // If no providers offer this service, fall back to showing other top providers so the map is never empty
      if (matchingProviders.length === 0) {
        console.log("[Matching Engine] No direct service matches. Broadening search to all providers...");
        matchingProviders = dbProviders;
      }

      // 3. Check availability if a time is specified
      if (resolvedTimestamp && matchingProviders.length > 0) {
        const providerIds = matchingProviders.map(p => p.id);
        const reqTime = new Date(resolvedTimestamp);
        
        // Define a 2-hour window around the requested time
        const startTime = new Date(reqTime.getTime() - 2 * 60 * 60 * 1000).toISOString();
        const endTime = new Date(reqTime.getTime() + 2 * 60 * 60 * 1000).toISOString();

        // Fetch booked slots that overlap with this window
        const { data: bookedSlots, error: slotError } = await supabase
          .from("booking_slots")
          .select("provider_id, start_time, end_time")
          .eq("status", "booked")
          .in("provider_id", providerIds)
          .or(`start_time.gte.${startTime},end_time.lte.${endTime}`);

        if (slotError) {
          console.error("[Matching Engine] Error fetching booking slots:", slotError);
        }

        const bookedProviderIds = new Set((bookedSlots || []).map(slot => slot.provider_id));

        // Mark providers as available or unavailable
        matchingProviders = matchingProviders.map(provider => ({
          ...provider,
          available: !bookedProviderIds.has(provider.id)
        }));
      } else {
        // Assume available if no time is checked
        matchingProviders = matchingProviders.map(provider => ({
          ...provider,
          available: true
        }));
      }

      // 4. Calculate distances and assign standard field names
      matchingProviders = matchingProviders.map(provider => {
        let distance = null;
        if (latitude && longitude && provider.lat && provider.lng) {
          distance = calculateDistance(
            parseFloat(latitude),
            parseFloat(longitude),
            parseFloat(provider.lat),
            parseFloat(provider.lng)
          );
        }

        return {
          id: provider.id,
          business_name: provider.business_name || "Professional Karigar",
          specialization: provider.specialization || service,
          profile_image_url: provider.profile_image_url || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?q=80&w=200",
          base_rating: parseFloat(provider.base_rating || 5.0),
          lat: parseFloat(provider.lat),
          lng: parseFloat(provider.lng),
          location: provider.location || "Karachi",
          distance: distance,
          available: provider.available !== undefined ? provider.available : true
        };
      });

      // 5. Rank: Availability (available first), Proximity (closest first), Rating (highest rating first)
      matchingProviders.sort((a, b) => {
        // Available first
        if (a.available !== b.available) {
          return a.available ? -1 : 1;
        }

        // Distance next (closest first)
        if (a.distance !== null && b.distance !== null) {
          if (a.distance !== b.distance) {
            return a.distance - b.distance;
          }
        } else if (a.distance !== null) {
          return -1; // Prioritize the one with computed distance
        } else if (b.distance !== null) {
          return 1;
        }

        // Rating last (highest first)
        return b.base_rating - a.base_rating;
      });
    }

    // 6. Fallback/Seed Premium Mock Data if database has fewer than 5 providers, or if db is empty
    if (matchingProviders.length < 5) {
      console.log("[Matching Engine] Insufficient database providers found. Generating dynamic premium mock data...");
      
      const avatars = [
        "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?q=80&w=200",
        "https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=200",
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200",
        "https://images.unsplash.com/photo-1620122303020-43ec4b6cf7f8?q=80&w=200"
      ];

      const names = [
        "Ahmed K.",
        "Ali P.",
        "Sajid Elect.",
        "Zain Repairs",
        "Kashif Fixer"
      ];

      const ratings = [4.8, 4.7, 4.9, 4.6, 4.5];

      const baseLat = parseFloat(latitude) || 24.8607;
      const baseLng = parseFloat(longitude) || 67.0011;

      // Coordinate offsets to scatter pins realistically on the map
      const offsets = [
        { lat: 0.0035, lng: -0.0042 },
        { lat: -0.0048, lng: 0.0031 },
        { lat: 0.0062, lng: 0.0053 },
        { lat: -0.0021, lng: -0.0064 },
        { lat: 0.0078, lng: -0.0019 }
      ];

      const generatedMocks = names.map((name, index) => {
        const pLat = baseLat + offsets[index].lat;
        const pLng = baseLng + offsets[index].lng;
        const dist = calculateDistance(baseLat, baseLng, pLat, pLng) || 0.5 + index * 0.3;

        return {
          id: `mock-${index + 1}`,
          business_name: `${name} (${service})`,
          specialization: service,
          profile_image_url: avatars[index],
          base_rating: ratings[index],
          lat: pLat,
          lng: pLng,
          location: location || "Gulshan",
          distance: dist,
          available: true
        };
      });

      // Merge database providers with generated mocks, avoiding ID collisions, keeping the limit to 5
      const existingIds = new Set(matchingProviders.map(p => p.id));
      for (const mock of generatedMocks) {
        if (matchingProviders.length >= 5) break;
        if (!existingIds.has(mock.id)) {
          matchingProviders.push(mock);
        }
      }
    }

    // Limit to top 5 popups
    const topProviders = matchingProviders.slice(0, 5);

    console.log(`[Matching Engine] Returning top ${topProviders.length} providers:`, topProviders.map(p => p.business_name));

    return res.status(200).json({
      success: true,
      service,
      time,
      location,
      providers: topProviders
    });

  } catch (error) {
    console.error("[Matching Engine] Error in matchProviders:", error);
    return res.status(500).json({
      success: false,
      error: "An internal server error occurred while matching providers."
    });
  }
};
