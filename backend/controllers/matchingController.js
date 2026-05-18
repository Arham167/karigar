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

// Geocode address strings into coordinates in Karachi if direct coordinates are missing in DB
function geocodeAddress(address) {
  if (!address || typeof address !== "string") {
    return { lat: 24.8607, lng: 67.0011 };
  }
  
  const normalized = address.toLowerCase().replace(/[^a-z0-9]/g, "");
  
  const KARACHI_COORDS = {
    northnazimabad: { lat: 24.9450, lng: 67.0350 },
    nazimabad: { lat: 24.9180, lng: 67.0280 },
    gulshaneiqbal: { lat: 24.9200, lng: 67.0900 },
    gulshan: { lat: 24.9200, lng: 67.0900 },
    johar: { lat: 24.9100, lng: 67.1250 },
    gulistanejohar: { lat: 24.9100, lng: 67.1250 },
    clifton: { lat: 24.8150, lng: 67.0330 },
    defence: { lat: 24.8250, lng: 67.0600 },
    dha: { lat: 24.8250, lng: 67.0600 },
    saddar: { lat: 24.8600, lng: 67.0100 },
    fbarea: { lat: 24.9350, lng: 67.0750 },
    federalbarea: { lat: 24.9350, lng: 67.0750 },
    bahria: { lat: 24.9850, lng: 67.2900 },
    bahriatown: { lat: 24.9850, lng: 67.2900 },
    korangi: { lat: 24.8450, lng: 67.1350 },
    gulberg: { lat: 24.9300, lng: 67.0800 }
  };
  
  for (const [key, coords] of Object.entries(KARACHI_COORDS)) {
    if (normalized.includes(key)) {
      return coords;
    }
  }
  
  return { lat: 24.8607, lng: 67.0011 };
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

    let searchLat = parseFloat(latitude);
    let searchLng = parseFloat(longitude);

    // Resolve specific Karachi area coordinates if parsed from the NLP request
    if (location && typeof location === "string") {
      const normalizedLoc = location.toLowerCase().replace(/[^a-z0-9]/g, "");
      
      const KARACHI_AREAS = {
        nazimabad: { lat: 24.9180, lng: 67.0280 },
        northnazimabad: { lat: 24.9450, lng: 67.0350 },
        gulshan: { lat: 24.9200, lng: 67.0900 },
        gulshaneiqbal: { lat: 24.9200, lng: 67.0900 },
        johar: { lat: 24.9100, lng: 67.1250 },
        gulistanejohar: { lat: 24.9100, lng: 67.1250 },
        clifton: { lat: 24.8150, lng: 67.0330 },
        defence: { lat: 24.8250, lng: 67.0600 },
        dha: { lat: 24.8250, lng: 67.0600 },
        saddar: { lat: 24.8600, lng: 67.0100 },
        fbarea: { lat: 24.9350, lng: 67.0750 },
        federalbarea: { lat: 24.9350, lng: 67.0750 },
        bahria: { lat: 24.9850, lng: 67.2900 },
        bahriatown: { lat: 24.9850, lng: 67.2900 },
        korangi: { lat: 24.8450, lng: 67.1350 },
        gulberg: { lat: 24.9300, lng: 67.0800 }
      };

      for (const [key, coords] of Object.entries(KARACHI_AREAS)) {
        if (normalizedLoc.includes(key) || key.includes(normalizedLoc)) {
          console.log(`[Matching Engine] Overriding matching reference point to "${location}" coordinates:`, coords);
          searchLat = coords.lat;
          searchLng = coords.lng;
          break;
        }
      }
    }

    if (!service) {
      return res.status(400).json({
        success: false,
        error: "Service type is required for matching."
      });
    }

    // 1. Fetch all providers from the database (handling fallback if provider_services relation is missing)
    let dbProviders = [];
    let dbError = null;

    try {
      const { data, error } = await supabase
        .from("providers")
        .select("*");
      dbProviders = data || [];
      dbError = error;
    } catch (err) {
      dbError = err;
      console.error("[Matching Engine] Exception while querying Supabase:", err);
    }

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
        return hasMatchingSpec;
      });

      console.log(`[Matching Engine] ${matchingProviders.length} database providers match specialization: ${service}`);

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
        const coords = geocodeAddress(provider.shop_address);
        const pLat = parseFloat(provider.lat || coords.lat);
        const pLng = parseFloat(provider.lng || coords.lng);

        let distance = null;
        if (searchLat && searchLng && pLat && pLng) {
          distance = calculateDistance(
            parseFloat(searchLat),
            parseFloat(searchLng),
            pLat,
            pLng
          );
        }

        return {
          id: provider.id,
          business_name: provider.business_name || "Professional Karigar",
          specialization: provider.specialization || service,
          profile_image_url: provider.profile_image_url || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?q=80&w=200",
          base_rating: parseFloat(provider.base_rating || 4.8),
          lat: pLat,
          lng: pLng,
          location: provider.shop_address || "Karachi",
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

      const baseLat = parseFloat(searchLat) || 24.8607;
      const baseLng = parseFloat(searchLng) || 67.0011;

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

    // To prevent overlapping markers on the map, we'll keep track of coordinates and add a tiny jitter if there are duplicates
    const assignedCoordinates = [];
    const topProviders = matchingProviders.slice(0, 5).map((provider, idx) => {
      let pLat = parseFloat(provider.lat);
      let pLng = parseFloat(provider.lng);

      // Check if this coordinate is already assigned to a provider in this batch
      const isDuplicate = assignedCoordinates.some(c => 
        Math.abs(c.lat - pLat) < 0.0002 && Math.abs(c.lng - pLng) < 0.0002
      );

      if (isDuplicate) {
        // Add a small jitter (approx 20-40 meters)
        const angle = (idx * 2 * Math.PI) / 5;
        const radius = 0.0003 + (idx * 0.00005); // jitter radius in degrees
        pLat += radius * Math.cos(angle);
        pLng += radius * Math.sin(angle);
        console.log(`[Matching Engine] Overlapping provider "${provider.business_name}" coordinate jittered to:`, pLat, pLng);
      }

      assignedCoordinates.push({ lat: pLat, lng: pLng });

      return {
        ...provider,
        lat: pLat,
        lng: pLng
      };
    });

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
