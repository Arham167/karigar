import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import {
  Menu,
  ArrowRight,
  Home,
  ClipboardList,
  User,
  LogOut,
  MapPin,
  Star,
  CheckCircle,
  Clock,
  Compass,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Wrench,
  MessageSquare,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../utils/supabase";
import { useAuthStore } from "../store/authStore";
import KarigarSellerProfile from "./KarigarSellerProfile";
import { syncBookingsAndManageReminders } from "../utils/notificationManager";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";

const { width, height } = Dimensions.get("window");

// Hardcode public tunnel for development to bypass environment variable caching issues
const BASE_URL = 'https://karigar-arham-nomans-projects.vercel.app';


// Custom Map Style for a clean, premium emerald-tinged theme
const customMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#f5f5f5" }]
  },
  {
    "elementType": "labels.icon",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#616161" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#f5f5f5" }]
  },
  {
    "featureType": "landscape.natural",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#e2ebd9" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#d6e9d0" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#d2ebfa" }]
  }
];

// Pulsing Marker Component for nearby Karigars
const PulsingMarker = ({ provider, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 2.2,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Marker
      coordinate={{ latitude: provider.latitude, longitude: provider.longitude }}
      onPress={onPress}
    >
      <View style={styles.markerContainer}>
        {/* Pulsing ring */}
        <Animated.View
          style={[
            styles.pulsingRing,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        />
        {/* Core Dot */}
        <View style={styles.markerDot} />
        
        {/* Tiny Tooltip */}
        <View style={styles.markerTooltip}>
          <Text style={styles.markerTooltipText}>★ {provider.rating}</Text>
        </View>
      </View>
    </Marker>
  );
};

export default function MapScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  // State Declarations
  const [activeTab, setActiveTab] = useState("home");
  const [jobDescription, setJobDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState(null);

  // Dynamic Provider Matching States
  const [matchedProviders, setMatchedProviders] = useState([]);
  const [showMatches, setShowMatches] = useState(false);
  const [matchedService, setMatchedService] = useState("");
  const [matchedTime, setMatchedTime] = useState("");
  const [matchedLocation, setMatchedLocation] = useState("");
  const [matchedTimestamp, setMatchedTimestamp] = useState(null);

  // User Profile States
  const [profileImage, setProfileImage] = useState("https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop");
  const [userName, setUserName] = useState("Karigar User");
  const [userCnic, setUserCnic] = useState("");

  // Location & Map States
  const [location, setLocation] = useState(null);
  const [region, setRegion] = useState({
    latitude: 24.8607, // Default Karachi (Gulshan Area fallback)
    longitude: 67.0011,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  });
  const [providers, setProviders] = useState([]);
  const [loadingLocation, setLoadingLocation] = useState(true);



  // Scanning Animation States
  const [isScanning, setIsScanning] = useState(false);
  const radarScale = useRef(new Animated.Value(0)).current;
  const radarOpacity = useRef(new Animated.Value(1)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  const translateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, height * 0.65],
  });

  // Requests List States
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Selected Provider Profile Modal States
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Polling for incoming chat notifications (Buyer side)
  const [lastNotificationCheck, setLastNotificationCheck] = useState(new Date().toISOString());
  const [inAppNotification, setInAppNotification] = useState(null);

  useEffect(() => {
    const checkNotificationInterval = setInterval(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch buyer's bookings
        const { data: userBookings } = await supabase
          .from("bookings")
          .select("id, service_type, seller_id, buyer_id, price, status, requested_time, confirmed_time")
          .eq("buyer_id", user.id);

        if (userBookings && userBookings.length > 0) {
          syncBookingsAndManageReminders(userBookings);
        }

        if (!userBookings || userBookings.length === 0) return;

        const bookingIds = userBookings.map(b => b.id);

        // Fetch any messages for these bookings sent by other users after lastNotificationCheck
        const { data: newMsgs } = await supabase
          .from("chats")
          .select("id, booking_id, sender_id, message, timestamp")
          .in("booking_id", bookingIds)
          .neq("sender_id", user.id)
          .gt("timestamp", lastNotificationCheck)
          .order("timestamp", { ascending: false });

        if (newMsgs && newMsgs.length > 0) {
          const latestMsg = newMsgs[0];
          const matchingBooking = userBookings.find(b => b.id === latestMsg.booking_id);

          setLastNotificationCheck(latestMsg.timestamp);
          setInAppNotification({
            id: latestMsg.id,
            bookingId: latestMsg.booking_id,
            title: "New Message from Karigar",
            message: latestMsg.message,
            booking: matchingBooking
          });

          // Dismiss after 4 seconds
          setTimeout(() => {
            setInAppNotification(prev => prev?.id === latestMsg.id ? null : prev);
          }, 4000);
        }
      } catch (err) {
        console.log("Error in chat notifications poll:", err);
      }
    }, 4500);

    return () => clearInterval(checkNotificationInterval);
  }, [lastNotificationCheck]);

  // Custom Alert Popup State
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: "",
    message: "",
    icon: "info", // "success" | "error" | "warning" | "info" | "question" | "details"
    buttons: [],
  });

  const showCustomAlert = (title, message, buttons = null, icon = "info") => {
    setCustomAlert({
      visible: true,
      title,
      message,
      icon,
      buttons: buttons || [{ text: "OK", onPress: () => {} }],
    });
  };

  const closeCustomAlert = () => {
    setCustomAlert(prev => ({ ...prev, visible: false }));
  };

  const handleAlertButtonPress = (onPress) => {
    closeCustomAlert();
    if (onPress) {
      setTimeout(() => {
        onPress();
      }, 100);
    }
  };

  // Load Profile and Location on Mount
  useEffect(() => {
    loadUserProfile();
    requestLocationAndLoadProviders();
  }, []);

  // Fetch Bookings when entering Requests Tab
  useEffect(() => {
    if (activeTab === "requests") {
      fetchBookings();
    }
  }, [activeTab]);



  // Radar Scanning Animation
  useEffect(() => {
    if (isScanning) {
      radarScale.setValue(0);
      radarOpacity.setValue(1);
      scanLineAnim.setValue(0);
      Animated.loop(
        Animated.parallel([
          Animated.timing(radarScale, {
            toValue: 4,
            duration: 2200,
            useNativeDriver: true,
          }),
          Animated.timing(radarOpacity, {
            toValue: 0,
            duration: 2200,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      radarScale.setValue(0);
      radarOpacity.setValue(1);
      scanLineAnim.setValue(0);
    }
  }, [isScanning]);

  const loadUserProfile = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (user && !userError) {
        const { data, error } = await supabase
          .from("profiles")
          .select("name, profile_image_url, cnic")
          .eq("id", user.id)
          .single();
        
        if (data && !error) {
          if (data.name) setUserName(data.name);
          if (data.profile_image_url) setProfileImage(data.profile_image_url);
          if (data.cnic) setUserCnic(data.cnic);
        }
      }
    } catch (err) {
      console.log("Error loading user profile:", err);
    }
  };

  const requestLocationAndLoadProviders = async () => {
    try {
      setLoadingLocation(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showCustomAlert(
          "Location Permission Denied",
          "We will use a default location. To see professionals near you, please enable location permissions in settings.",
          [{ text: "OK", onPress: () => {} }],
          "warning"
        );
        setLoadingLocation(false);
        return;
      }

      // Prevent hanging on refresh by trying last known position first
      let currentLoc = await Location.getLastKnownPositionAsync();
      if (!currentLoc) {
        // Fallback to current position with balanced accuracy to avoid GPS timeout hangs
        currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }

      if (currentLoc) {
        setLocation(currentLoc);
        const newRegion = {
          latitude: currentLoc.coords.latitude,
          longitude: currentLoc.coords.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        };
        setRegion(newRegion);
      }
    } catch (error) {
      console.log("Error getting current location:", error);
    } finally {
      setLoadingLocation(false);
    }
  };

  const centerOnUserLocation = async () => {
    try {
      let currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(currentLoc);
      
      const newRegion = {
        latitude: currentLoc.coords.latitude,
        longitude: currentLoc.coords.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      };
      
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      console.log("Error centering location:", error);
      showCustomAlert(
        "Location Error", 
        "Could not fetch your current coordinates. Please ensure GPS is enabled.",
        [{ text: "OK", onPress: () => {} }],
        "error"
      );
    }
  };

  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (user && !userError) {
        const { data, error } = await supabase
          .from("bookings")
          .select("*")
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        
        // Fetch provider profiles to get names
        const bookingsWithProviders = [...(data || [])];
        const validBookings = bookingsWithProviders.filter(b => b.seller_id !== null);
        const sellerIds = validBookings.map(b => b.seller_id);
        
        if (sellerIds.length > 0) {
          const { data: providersList } = await supabase
            .from("providers")
            .select("id, business_name, profile_image_url, specialization")
            .in("id", sellerIds);
            
          const providerMap = {};
          if (providersList) {
            providersList.forEach(p => {
              providerMap[p.id] = p;
            });
          }
          
          validBookings.forEach(b => {
            if (b.seller_id && providerMap[b.seller_id]) {
              b.provider = providerMap[b.seller_id];
            }
          });
        }
        
        setBookings(validBookings);
        syncBookingsAndManageReminders(validBookings);
      }
    } catch (err) {
      console.log("Error loading bookings:", err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleRequestKarigar = async () => {
    if (!jobDescription.trim()) {
      showCustomAlert(
        "Request Details Required", 
        "Please describe what service you need before continuing.",
        [{ text: "Got It", onPress: () => {} }],
        "warning"
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        showCustomAlert(
          "Session Expired", 
          "Please log in again.",
          [{ text: "Log In", onPress: () => navigation.navigate("Auth") }],
          "error"
        );
        return;
      }

      console.log(`[Frontend] Querying intent parser at: ${BASE_URL}/api/intent/parse`);
      
      // Call the dynamic backend intent parsing API
      const response = await fetch(`${BASE_URL}/api/intent/parse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Bypass-Tunnel-Reminder": "true",
        },
        body: JSON.stringify({ text: jobDescription }),
      });

      if (!response.ok) {
        throw new Error("Failed to connect to the parsing engine. Please check your internet connection.");
      }

      const parseResult = await response.json();
      
      if (!parseResult.success) {
        throw new Error(parseResult.error || "Failed to analyze your request.");
      }

      const { service, time, location: parsedLocation } = parseResult;

      // Validate that service, time, and location are not null
      const missingDetails = [];
      if (!service || !service.value) {
        missingDetails.push("Service Type (e.g. Plumber, Electrician, AC Repair)");
      }
      if (!time || !time.value) {
        missingDetails.push("Requested Time (e.g. today at 5 PM, tomorrow, urgently)");
      }
      if (!parsedLocation || !parsedLocation.value) {
        missingDetails.push("Location (e.g. Gulshan, Clifton, Johar)");
      }

      if (missingDetails.length > 0) {
        showCustomAlert(
          "Details Required 🛠️",
          `To match you with the best Karigar, please specify the following in your request:\n\n${missingDetails.map(detail => `• ${detail}`).join("\n")}\n\nExample: "I need a plumber at 5 PM in Gulshan."`,
          [{ text: "Edit Request", style: "cancel", onPress: () => {} }],
          "details"
        );
        setIsSubmitting(false);
        return;
      }

      // Add or update pending booking in Supabase with parsed entities
      let bookingError = null;
      if (currentRequestId) {
        const { error } = await supabase.from("bookings").update({
          service_type: service.value,
          location: parsedLocation.value,
          requested_time: time.resolvedTimestamp || new Date().toISOString(),
        }).eq("id", currentRequestId);
        bookingError = error;
      } else {
        const { data: newBooking, error } = await supabase.from("bookings").insert([
          {
            buyer_id: user.id,
            service_type: service.value,
            location: parsedLocation.value,
            requested_time: time.resolvedTimestamp || new Date().toISOString(),
            price: 1500, // Est base rate
            status: "pending",
          },
        ]).select().single();
        bookingError = error;
        if (newBooking) setCurrentRequestId(newBooking.id);
      }

      if (bookingError) throw bookingError;

      // Start the scanning animation
      setIsScanning(true);
      setShowMatches(false);
      setMatchedProviders([]);

      // Now fetch matching providers from the matching API
      console.log(`[Frontend] Fetching matching providers at: ${BASE_URL}/api/providers/match`);
      
      const userLat = location ? location.coords.latitude : region.latitude;
      const userLng = location ? location.coords.longitude : region.longitude;

      const matchResponse = await fetch(`${BASE_URL}/api/providers/match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Bypass-Tunnel-Reminder": "true",
        },
        body: JSON.stringify({
          service: service.value,
          time: time.value,
          resolvedTimestamp: time.resolvedTimestamp || new Date().toISOString(),
          location: parsedLocation.value,
          latitude: userLat,
          longitude: userLng
        }),
      });

      if (!matchResponse.ok) {
        throw new Error("Failed to fetch matching providers.");
      }

      const matchResult = await matchResponse.json();
      if (!matchResult.success) {
        throw new Error(matchResult.error || "Failed to parse matching providers.");
      }

      const matches = matchResult.providers || [];
      
      // Delay to let the scanning animation play out for a premium effect
      setTimeout(() => {
        setIsScanning(false);
        setMatchedProviders(matches);
        setMatchedService(service.value);
        setMatchedTime(time.value);
        setMatchedLocation(parsedLocation.value);
        setMatchedTimestamp(time.resolvedTimestamp || new Date().toISOString());
        setShowMatches(true);

        // Zoom the map to fit user and markers
        if (mapRef.current && matches.length > 0) {
          const coords = matches.map(p => ({
            latitude: p.lat,
            longitude: p.lng
          }));
          
          // Add user's coordinates
          coords.push({
            latitude: userLat,
            longitude: userLng
          });

          mapRef.current.fitToCoordinates(coords, {
            edgePadding: { top: 120, right: 60, bottom: 280, left: 60 },
            animated: true
          });
        }

        showCustomAlert(
          "Sellers Matched! 🚀",
          `We've parsed your request and found 5 matching ${service.value}s nearby who are available for ${time.value}! Check the map to see their ratings and locations.`,
          [{ text: "View Matches", onPress: () => {} }],
          "success"
        );
      }, 2500);

    } catch (error) {
      setIsScanning(false);
      showCustomAlert(
        "Error placing request", 
        error.message,
        [{ text: "OK", onPress: () => {} }],
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };



  const handleCloseMatches = () => {
    setShowMatches(false);
    setMatchedProviders([]);
    setJobDescription("");
    setCurrentRequestId(null);
  };

  const handleEditRequest = () => {
    setShowMatches(false);
    // Note: We deliberately do NOT clear jobDescription or currentRequestId here,
    // so the user can modify their prompt and update the same booking.
  };

  const handleBookProvider = (provider) => {
    const bookingTime = provider.selectedSlot || matchedTime || "12:00 PM";
    const finalPrice = provider.dynamicPrice || 1500;

    showCustomAlert(
      "Confirm Booking 🛠️",
      `Would you like to book "${provider.business_name}" for ${matchedService} at ${bookingTime} for a dynamic quote of Rs. ${finalPrice.toLocaleString()}?`,
      [
        { text: "Cancel", style: "cancel", onPress: () => {} },
        {
          text: "Book Now",
          onPress: async () => {
            try {
              setIsSubmitting(true);
              const { data: { user } } = await supabase.auth.getUser();
              
              let requestedTimeISO = matchedTimestamp || new Date().toISOString();
              if (bookingTime) {
                const match = bookingTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
                if (match) {
                  let h = parseInt(match[1], 10);
                  let m = parseInt(match[2], 10);
                  const ampm = match[3].toUpperCase();
                  if (ampm === 'PM' && h < 12) h += 12;
                  if (ampm === 'AM' && h === 12) h = 0;
                  const d = new Date();
                  d.setHours(h, m, 0, 0);
                  requestedTimeISO = d.toISOString();
                }
              }

              const response = await fetch(`${BASE_URL}/api/bookings/confirm`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Bypass-Tunnel-Reminder": "true"
                },
                body: JSON.stringify({
                  buyerId: user.id,
                  sellerId: provider.id && String(provider.id).startsWith("mock-") ? null : provider.id,
                  serviceType: matchedService,
                  location: matchedLocation,
                  requestedTime: requestedTimeISO,
                  price: finalPrice
                })
              });

              if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Failed to confirm booking on server.");
              }

              const resData = await response.json();
              if (resData.success && resData.booking) {
                syncBookingsAndManageReminders([resData.booking]);
              }

              showCustomAlert(
                "Booking Confirmed! 🎉",
                `${provider.business_name} has accepted your request. They are preparing to arrive!`,
                [{ text: "Awesome", onPress: () => {
                  handleCloseMatches();
                  setActiveTab("requests");
                }}],
                "success"
              );
            } catch (err) {
              showCustomAlert("Booking Error", err.message, [{ text: "OK" }], "error");
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ],
      "question"
    );
  };

  const handleInitiateChat = async (provider) => {
    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showCustomAlert("Authentication Required", "Please log in to chat with the seller.", [{ text: "OK" }], "warning");
        return;
      }

      const isMock = !provider.id || provider.id.startsWith("mock-");
      
      if (isMock) {
        // Navigate directly to KarigarChat screen with mock booking details (fully simulated offline)
        navigation.navigate("KarigarChat", {
          bookingId: `mock-booking-id-${provider.id}`,
          booking: {
            id: `mock-booking-id-${provider.id}`,
            price: provider.dynamicPrice || 1200,
            service_type: provider.specialization || "Expert Services",
            location: provider.location || "Karachi"
          },
          provider: provider,
          role: "buyer",
          dynamicQuote: provider.dynamicPrice || 1200,
          buyerName: userName || "Arham N."
        });
        return;
      }

      // Real provider: Check if a pending booking already exists for this buyer and provider
      const providerId = provider.id;
      let booking = null;
      
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("buyer_id", user.id)
        .eq("seller_id", providerId)
        .eq("status", "pending")
        .limit(1);
        
      if (data && data.length > 0) {
        booking = data[0];
      }

      const dynamicPrice = provider.dynamicPrice || 1200;
      const serviceType = matchedService || provider.specialization || "Expert Services";
      const locationStr = matchedLocation || provider.location || "Karachi";
      
      let requestedTimeISO = matchedTimestamp || new Date().toISOString();
      if (provider.selectedSlot) {
        // Extract just the start time if it's a range like "09:00 AM - 11:00 AM"
        const cleanSlot = provider.selectedSlot.split(' - ')[0].trim();
        const match = cleanSlot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (match) {
          let h = parseInt(match[1], 10);
          let m = parseInt(match[2], 10);
          const ampm = match[3].toUpperCase();
          if (ampm === 'PM' && h < 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;
          const d = new Date();
          d.setHours(h, m, 0, 0);
          requestedTimeISO = d.toISOString();
        }
      }

      // If no pending booking exists, create one
      if (!booking) {
        const { data: newBooking, error: insertError } = await supabase
          .from("bookings")
          .insert([
            {
              buyer_id: user.id,
              seller_id: providerId,
              service_type: serviceType,
              location: locationStr,
              price: dynamicPrice,
              status: "pending",
              requested_time: requestedTimeISO
            }
          ])
          .select()
          .single();

        if (insertError) {
          console.log("Error creating booking:", insertError);
          setIsSubmitting(false);
          return;
        }
        booking = newBooking;
      } else {
        // Update existing pending booking with the latest search parameters!
        const { data: updatedBooking, error: updateError } = await supabase
          .from("bookings")
          .update({
            service_type: serviceType,
            location: locationStr,
            price: dynamicPrice,
            requested_time: requestedTimeISO
          })
          .eq("id", booking.id)
          .select()
          .single();
          
        if (!updateError && updatedBooking) {
          booking = updatedBooking;
        }
      }

      // Navigate to KarigarChat screen with real booking details
      navigation.navigate("KarigarChat", {
        bookingId: booking.id,
        booking: booking,
        provider: provider,
        role: "buyer",
        dynamicQuote: booking.price,
        buyerName: userName || "Arham N."
      });

    } catch (err) {
      console.log("Error initiating chat, using mock:", err);
      // Fallback for mock/offline testing
      navigation.navigate("KarigarChat", {
        bookingId: "mock-booking-id-" + provider.id,
        booking: {
          id: "mock-booking-id-" + provider.id,
          price: provider.dynamicPrice || 1200,
          service_type: provider.specialization || "AC Service",
          location: provider.location || "Karachi"
        },
        provider: provider,
        role: "buyer",
        dynamicQuote: provider.dynamicPrice || 1200,
        buyerName: userName || "Arham N."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    showCustomAlert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel", onPress: () => {} },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            useAuthStore.getState().clearAuth();
            navigation.reset({
              index: 0,
              routes: [{ name: "Auth" }],
            });
          },
        },
      ],
      "question"
    );
  };

  // Custom Alert Modal JSX
  const CustomAlertModal = () => {
    if (!customAlert.visible) return null;

    const renderAlertIcon = () => {
      switch (customAlert.icon) {
        case "success":
          return (
            <View style={[styles.alertIconWrapper, { backgroundColor: "#ECFDF5" }]}>
              <CheckCircle size={38} color="#10B981" />
            </View>
          );
        case "error":
          return (
            <View style={[styles.alertIconWrapper, { backgroundColor: "#FEF2F2" }]}>
              <AlertCircle size={38} color="#EF4444" />
            </View>
          );
        case "warning":
          return (
            <View style={[styles.alertIconWrapper, { backgroundColor: "#FFFBEB" }]}>
              <AlertTriangle size={38} color="#FBBF24" />
            </View>
          );
        case "details":
          return (
            <View style={[styles.alertIconWrapper, { backgroundColor: "#ECFDF5" }]}>
              <Wrench size={38} color="#065F46" />
            </View>
          );
        case "question":
          return (
            <View style={[styles.alertIconWrapper, { backgroundColor: "#F3F4F6" }]}>
              <HelpCircle size={38} color="#4B5563" />
            </View>
          );
        case "info":
        default:
          return (
            <View style={[styles.alertIconWrapper, { backgroundColor: "#EFF6FF" }]}>
              <AlertCircle size={38} color="#3B82F6" />
            </View>
          );
      }
    };

    return (
      <Modal
        transparent={true}
        visible={customAlert.visible}
        animationType="fade"
        onRequestClose={closeCustomAlert}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            {renderAlertIcon()}
            <Text style={styles.alertTitle}>{customAlert.title}</Text>
            <Text style={styles.alertMessage}>{customAlert.message}</Text>
            
            <View style={styles.alertButtonsContainer}>
              {customAlert.buttons.map((btn, index) => {
                const isDestructive = btn.style === "destructive";
                const isCancel = btn.style === "cancel" || btn.style === "secondary";
                
                let btnStyle = styles.alertButtonPrimary;
                let btnTextStyle = styles.alertButtonTextPrimary;
                
                if (isDestructive) {
                  btnStyle = styles.alertButtonDestructive;
                  btnTextStyle = styles.alertButtonTextPrimary;
                } else if (isCancel) {
                  btnStyle = styles.alertButtonCancel;
                  btnTextStyle = styles.alertButtonTextCancel;
                }
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      btnStyle,
                      customAlert.buttons.length === 2 ? { flex: 1 } : { width: "100%" }
                    ]}
                    onPress={() => handleAlertButtonPress(btn.onPress)}
                    activeOpacity={0.8}
                  >
                    <Text style={btnTextStyle}>{btn.text}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#065F46" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Gorgeous In-App Notification Toast */}
      {inAppNotification && (
        <TouchableOpacity
          style={styles.notificationToast}
          activeOpacity={0.9}
          onPress={() => {
            const booking = inAppNotification.booking;
            setInAppNotification(null);
            navigation.navigate("KarigarChat", {
              bookingId: booking.id,
              booking: booking,
              role: "buyer",
              dynamicQuote: booking.price || 1200,
              buyerName: userName || "Arham N."
            });
          }}
        >
          <View style={styles.toastHeader}>
            <MessageSquare size={16} color="#059669" style={{ marginRight: 6 }} />
            <Text style={styles.toastTitle}>{inAppNotification.title}</Text>
            <Text style={styles.toastTime}>Just Now</Text>
          </View>
          <Text style={styles.toastMessage} numberOfLines={1}>
            {inAppNotification.message}
          </Text>
        </TouchableOpacity>
      )}

      {/* Dynamic Tab Views */}
      {activeTab === "home" && (
        <View style={styles.mapTabContainer}>
          {/* Solid Top Header */}
          <View style={[styles.solidHeader, { paddingTop: Math.max(insets.top, 12) }]}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <TouchableOpacity style={styles.menuButton} activeOpacity={0.8}>
                  <Menu size={28} color="#065F46" />
                </TouchableOpacity>
                <Text style={styles.brandTitle}>Karigar</Text>
              </View>

              <TouchableOpacity 
                style={styles.profileBtn}
                onPress={() => setActiveTab("profile")}
                activeOpacity={0.8}
              >
                <Image source={{ uri: profileImage }} style={styles.profileAvatar} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Map Section Wrapper */}
          <View style={styles.mapWrapper}>
            {loadingLocation ? (
              <View style={styles.mapLoading}>
                <ActivityIndicator size="large" color="#065F46" />
                <Text style={styles.loadingText}>Fetching live coordinates...</Text>
              </View>
            ) : (
              <>
                <MapView
                  ref={mapRef}
                  style={StyleSheet.absoluteFillObject}
                  initialRegion={region}
                  showsUserLocation={true}
                  showsMyLocationButton={false}
                  customMapStyle={customMapStyle}
                  onPress={() => Keyboard.dismiss()}
                >
                  {/* Matches Markers */}
                  {!isScanning && showMatches && matchedProviders.map((provider) => (
                    <Marker
                      key={provider.id}
                      coordinate={{ latitude: provider.lat, longitude: provider.lng }}
                      onPress={() => {
                        setSelectedProvider(provider);
                        setShowProfileModal(true);
                      }}
                    >
                      <View style={styles.premiumPopupMarker}>
                        <View style={styles.popupCard}>
                          <Image source={{ uri: provider.profile_image_url }} style={styles.popupImage} />
                          <View style={styles.popupInfo}>
                            <Text style={styles.popupName} numberOfLines={1}>{provider.business_name.split(' (')[0]}</Text>
                            <View style={styles.popupRatingContainer}>
                              <Star size={12} color="#FBBF24" fill="#FBBF24" />
                              <Text style={styles.popupRating}>{provider.base_rating}</Text>
                              <Text style={styles.popupDistance}>• {provider.distance ? `${provider.distance} km` : "Nearby"}</Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.popupArrow} />
                      </View>
                    </Marker>
                  ))}
                </MapView>

                {/* Absolute Full Screen Radar Sweep Scanner Overlay */}
                {isScanning && (
                  <View style={styles.fullScreenScannerContainer}>
                    {/* Concentric Expanding Circular Waves */}
                    <Animated.View
                      style={[
                        styles.fullScreenRadarRing,
                        {
                          transform: [
                            { scale: radarScale.interpolate({ inputRange: [0, 4], outputRange: [0.1, 7] }) }
                          ],
                          opacity: radarOpacity,
                        },
                      ]}
                    />
                    
                    {/* Sweeping Laser Beam Scan Line */}
                    <Animated.View
                      style={[
                        styles.scanLine,
                        {
                          transform: [{ translateY }],
                        },
                      ]}
                    />
                  </View>
                )}

                {/* Banner to inform tap booking */}
                {showMatches && (
                  <View style={styles.tapToBookBannerContainer}>
                    <View style={styles.tapToBookBanner}>
                      <Text style={styles.tapToBookText}>
                        📍 Tap any card on the map to book them instantly!
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity 
                          style={styles.editRequestBtn}
                          onPress={handleEditRequest}
                        >
                          <Text style={styles.editRequestText}>Edit Request</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.closeBannerBtn}
                          onPress={handleCloseMatches}
                        >
                          <Text style={styles.closeBannerText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
                
                {/* Custom My-Location Centering Button */}
                <TouchableOpacity
                  style={styles.myLocationFloatingButton}
                  activeOpacity={0.8}
                  onPress={centerOnUserLocation}
                >
                  <Compass size={24} color="#065F46" />
                </TouchableOpacity>
              </>
            )}

            {/* Request Card Overlay */}
            {!isScanning && !showMatches && (
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "padding"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 140 : 0}
                style={styles.requestCardContainer}
              >
                <ScrollView
                  style={[styles.requestCard, { maxHeight: 310 }]}
                  contentContainerStyle={{ padding: 24 }}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Describe your job</Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      placeholder="e.g. I need a plumber to fix a leaking tap in Gulshan."
                      placeholderTextColor="#9CA3AF"
                      multiline={false}
                      style={styles.textArea}
                      value={jobDescription}
                      onChangeText={setJobDescription}
                      returnKeyType="send"
                      onSubmitEditing={handleRequestKarigar}
                      blurOnSubmit={false}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.requestCta}
                    activeOpacity={0.8}
                    onPress={handleRequestKarigar}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Text style={styles.ctaText}>Request a Karigar</Text>
                        <ArrowRight size={26} color="white" />
                      </>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </KeyboardAvoidingView>
            )}
          </View>
        </View>
      )}

      {/* Requests Tab */}
      {/* Requests/Chats Tab */}
      {activeTab === "requests" && (
        <View style={[styles.tabContent, { paddingTop: Math.max(insets.top, 20) }]}>
          <Text style={styles.tabHeading}>My Chats</Text>
          <Text style={styles.tabSubheading}>Continue secure negotiations with your Karigars</Text>

          {loadingBookings ? (
            <View style={styles.tabLoader}>
              <ActivityIndicator size="large" color="#065F46" />
            </View>
          ) : bookings.length === 0 ? (
            <ScrollView contentContainerStyle={styles.emptyContainer} showsVerticalScrollIndicator={false}>
              <Image 
                source={{ uri: "https://images.unsplash.com/photo-1579208575657-c595a05383b7?q=80&w=400" }} 
                style={styles.emptyImage}
              />
              <Text style={styles.emptyText}>No Active Chats</Text>
              <Text style={styles.emptySubtext}>When you start a chat with a Karigar, it will show up here in real time!</Text>
              <TouchableOpacity 
                style={styles.emptyCta}
                onPress={() => setActiveTab("home")}
              >
                <Text style={styles.emptyCtaText}>Find a Karigar Now</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
              {bookings.map((booking) => {
                const sellerName = booking.provider?.business_name || "Expert Karigar";
                const sellerAvatar = booking.provider?.profile_image_url || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?q=80&w=200";
                const sellerSpec = booking.provider?.specialization || booking.service_type;

                return (
                  <View key={booking.id} style={styles.bookingCard}>
                    <View style={styles.bookingCardHeader}>
                      <Image source={{ uri: sellerAvatar }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#F3F4F6", marginRight: 12 }} />
                      <View style={styles.bookingHeaderInfo}>
                        <Text style={styles.bookingTitle}>{sellerName}</Text>
                        <Text style={styles.bookingTime}>
                          {sellerSpec} • {new Date(booking.created_at || booking.requested_time).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={[
                        styles.statusBadge, 
                        booking.status === "pending" ? styles.statusPending : styles.statusSuccess
                      ]}>
                        <Text style={[
                          styles.statusText, 
                          booking.status === "pending" ? styles.statusTextPending : styles.statusTextSuccess
                        ]}>
                          {booking.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.bookingBody}>
                      <View style={styles.bodyRow}>
                        <Clock size={16} color="#6B7280" style={{ marginRight: 6 }} />
                        <Text style={styles.bodyRowText}>Agreed Quote: Rs. {booking.price}</Text>
                      </View>
                      <View style={styles.bodyRow}>
                        <MapPin size={16} color="#6B7280" style={{ marginRight: 6 }} />
                        <Text style={styles.bodyRowText} numberOfLines={1}>{booking.location}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={{
                        backgroundColor: "#ECFDF5",
                        borderColor: "#A7F3D0",
                        borderWidth: 1,
                        borderRadius: 12,
                        paddingVertical: 10,
                        alignItems: "center",
                        marginTop: 12,
                        flexDirection: "row",
                        justifyContent: "center",
                        gap: 6
                      }}
                      activeOpacity={0.8}
                      onPress={() => {
                        navigation.navigate("KarigarChat", {
                          bookingId: booking.id,
                          booking: booking,
                          provider: booking.provider || {
                            id: booking.seller_id || "mock-1",
                            business_name: sellerName,
                            specialization: sellerSpec,
                            profile_image_url: sellerAvatar
                          },
                          role: "buyer",
                          dynamicQuote: booking.price,
                          buyerName: userName || "Arham N."
                        });
                      }}
                    >
                      <MessageSquare size={16} color="#065F46" />
                      <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 13, color: "#065F46" }}>Open Chat Inbox</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <ScrollView style={[styles.tabContent, { paddingTop: Math.max(insets.top, 20) }]} contentContainerStyle={{ paddingBottom: 120 }}>
          <Text style={styles.tabHeading}>My Profile</Text>
          <Text style={styles.tabSubheading}>Manage your personal credentials & preferences</Text>

          {/* Profile Card */}
          <View style={styles.profileViewCard}>
            <View style={styles.profileHeaderBox}>
              <View style={styles.profileBorder}>
                <Image source={{ uri: profileImage }} style={styles.profileLargeAvatar} />
              </View>
              <Text style={styles.profileName}>{userName}</Text>
              <View style={styles.roleLabel}>
                <Text style={styles.roleLabelText}>BUYER PROFILE</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.profileDetailsList}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Verification CNIC</Text>
                <Text style={styles.detailValue}>{userCnic || "Not Set Yet"}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Account Type</Text>
                <Text style={styles.detailValue}>Customer (Hiring)</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Platform Rating</Text>
                <View style={styles.ratingRow}>
                  <Star size={16} color="#FBBF24" fill="#FBBF24" />
                  <Text style={styles.ratingText}>5.0 (Excellent)</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Settings Options */}
          <View style={styles.settingsSection}>
            <TouchableOpacity 
              style={styles.signOutButton} 
              activeOpacity={0.8}
              onPress={handleSignOut}
            >
              <LogOut size={24} color="#EF4444" />
              <Text style={styles.signOutButtonText}>Sign Out of Karigar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}



      {/* Premium Bottom Navigation Tab Bar */}
      <View style={[styles.bottomNavigation, { paddingBottom: Math.max(insets.bottom, 15) }]}>
        <View style={styles.navBar}>
          {/* Home Tab */}
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.8}
            onPress={() => setActiveTab("home")}
          >
            <View style={[styles.navIconBox, activeTab === "home" && styles.activeIconBox]}>
              <Home size={26} color={activeTab === "home" ? "#10B981" : "#4B5563"} strokeWidth={activeTab === "home" ? 2.4 : 2.0} />
            </View>
            <Text style={[styles.navLabel, activeTab === "home" && styles.activeNavLabel]}>Home</Text>
          </TouchableOpacity>

          {/* Requests/Chats Tab */}
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.8}
            onPress={() => setActiveTab("requests")}
          >
            <View style={[styles.navIconBox, activeTab === "requests" && styles.activeIconBox]}>
              <MessageSquare size={26} color={activeTab === "requests" ? "#10B981" : "#4B5563"} strokeWidth={activeTab === "requests" ? 2.4 : 2.0} />
            </View>
            <Text style={[styles.navLabel, activeTab === "requests" && styles.activeNavLabel]}>My Chats</Text>
          </TouchableOpacity>

          {/* Profile Tab */}
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.8}
            onPress={() => setActiveTab("profile")}
          >
            <View style={[styles.navIconBox, activeTab === "profile" && styles.activeIconBox]}>
              <User size={26} color={activeTab === "profile" ? "#10B981" : "#4B5563"} strokeWidth={activeTab === "profile" ? 2.4 : 2.0} />
            </View>
            <Text style={[styles.navLabel, activeTab === "profile" && styles.activeNavLabel]}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Seller Profile Modal Popup */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#F7F9F8" }}>
          <KarigarSellerProfile
            provider={selectedProvider}
            userRequestedTime={matchedTime}
            userRequestedTimestamp={matchedTimestamp}
            onClose={() => setShowProfileModal(false)}
            onBook={(provider) => {
              setShowProfileModal(false);
              // Delay slightly to allow modal to close smoothly before alert pops
              setTimeout(() => {
                handleBookProvider(provider);
              }, 300);
            }}
            onChat={(provider) => {
              setShowProfileModal(false);
              setTimeout(() => {
                handleInitiateChat(provider);
              }, 300);
            }}
          />
        </View>
      </Modal>

      {/* Custom Premium Alert Popups */}
      <CustomAlertModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F8F7",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F6F8F7",
  },
  mapTabContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  solidHeader: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
    zIndex: 30,
  },
  mapWrapper: {
    flex: 1,
    position: "relative",
  },
  mapLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
  },
  loadingText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 16,
    color: "#374151",
    marginTop: 12,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  menuButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },
  brandTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 32,
    color: "#065F46",
    letterSpacing: -1,
  },
  profileBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: "white",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  profileAvatar: {
    width: "100%",
    height: "100%",
  },
  // Request Card
  requestCardContainer: {
    position: "absolute",
    bottom: 110,
    left: 20,
    right: 20,
    zIndex: 20,
  },
  requestCard: {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 22,
    color: "#111827",
  },
  inputContainer: {
    position: "relative",
    height: 130,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    marginBottom: 20,
    overflow: "hidden",
  },
  textArea: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontSize: 18,
    fontFamily: "DMSans_400Regular",
    color: "#111827",
    textAlignVertical: "top",
  },
  myLocationFloatingButton: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 20,
  },
  requestCta: {
    backgroundColor: "#065F46",
    height: 64,
    borderRadius: 24,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    shadowColor: "#065F46",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 5,
  },
  ctaText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 20,
    color: "white",
  },
  // Pulsing Marker Styles
  markerContainer: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  pulsingRing: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(34, 197, 94, 0.4)",
  },
  markerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#22C55E",
    borderWidth: 3,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  markerTooltip: {
    backgroundColor: "white",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  markerTooltipText: {
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    color: "#374151",
  },
  // Tab Layouts general
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tabHeading: {
    fontFamily: "DMSans_700Bold",
    fontSize: 34,
    color: "#111827",
    marginBottom: 6,
  },
  tabSubheading: {
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 25,
  },
  tabLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // Bookings List Styles
  listContainer: {
    paddingBottom: 120,
    gap: 15,
  },
  bookingCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  bookingCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  bookingIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  bookingHeaderInfo: {
    flex: 1,
  },
  bookingTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
    color: "#111827",
    marginBottom: 4,
  },
  bookingTime: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: "#FFFBEB",
  },
  statusSuccess: {
    backgroundColor: "#ECFDF5",
  },
  statusText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  statusTextPending: {
    color: "#D97706",
  },
  statusTextSuccess: {
    color: "#059669",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 15,
  },
  bookingBody: {
    gap: 10,
  },
  bodyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bodyRowText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#4B5563",
  },
  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 100,
  },
  emptyImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 25,
  },
  emptyText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 22,
    color: "#111827",
    marginBottom: 10,
  },
  emptySubtext: {
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 30,
    marginBottom: 30,
  },
  emptyCta: {
    backgroundColor: "#065F46",
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderRadius: 20,
  },
  emptyCtaText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: "white",
  },
  // Profile View Card
  profileViewCard: {
    backgroundColor: "white",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 30,
  },
  profileHeaderBox: {
    alignItems: "center",
    paddingVertical: 10,
  },
  profileBorder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#065F46",
    padding: 3,
    backgroundColor: "white",
    marginBottom: 15,
  },
  profileLargeAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 57,
  },
  profileName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 24,
    color: "#111827",
    marginBottom: 8,
  },
  roleLabel: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleLabelText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
    color: "#065F46",
    letterSpacing: 0.5,
  },
  profileDetailsList: {
    gap: 20,
    paddingVertical: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    color: "#6B7280",
  },
  detailValue: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: "#111827",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: "#D97706",
  },
  settingsSection: {
    gap: 15,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    borderRadius: 24,
    height: 64,
  },
  signOutButtonText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: "#EF4444",
  },

  // Premium Bottom Tab Bar
  bottomNavigation: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 15,
    zIndex: 30,
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 72,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    width: width / 3.5,
  },
  navIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  activeIconBox: {
    backgroundColor: "#ECFDF5",
  },
  navLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#4B5563",
  },
  activeNavLabel: {
    color: "#10B981",
    fontFamily: "DMSans_700Bold",
  },
  // Custom Alert Styles
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  alertContainer: {
    backgroundColor: "white",
    borderRadius: 32,
    width: "100%",
    maxWidth: 340,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  alertIconWrapper: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  alertTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 20,
    color: "#111827",
    textAlign: "center",
    marginBottom: 10,
  },
  alertMessage: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  alertButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },
  alertButtonPrimary: {
    backgroundColor: "#065F46",
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  alertButtonTextPrimary: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    color: "white",
  },
  alertButtonDestructive: {
    backgroundColor: "#EF4444",
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  alertButtonCancel: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  alertButtonTextCancel: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    color: "#4B5563",
  },
  // Radar Animation Styles
  fullScreenScannerContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6, 95, 70, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  fullScreenRadarRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2.5,
    borderColor: "#10B981",
    backgroundColor: "rgba(16, 185, 129, 0.05)",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: "#10B981",
    opacity: 0.85,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  // Custom Map popup styles
  premiumPopupMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  popupCard: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 10,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#065F46",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    width: 165,
  },
  popupImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 8,
    backgroundColor: "#E5E7EB",
  },
  popupInfo: {
    flex: 1,
    justifyContent: "center",
  },
  popupName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    color: "#111827",
    marginBottom: 2,
  },
  popupRatingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  popupRating: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    color: "#D97706",
    marginLeft: 3,
  },
  popupDistance: {
    fontFamily: "DMSans_500Medium",
    fontSize: 10,
    color: "#6B7280",
    marginLeft: 4,
  },
  popupArrow: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#065F46",
    alignSelf: "center",
    marginTop: -2,
  },
  // Tap to Book Banner styles
  tapToBookBannerContainer: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    zIndex: 20,
  },
  tapToBookBanner: {
    flexDirection: "row",
    backgroundColor: "rgba(6, 95, 70, 0.95)",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  tapToBookText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    color: "white",
    flex: 1,
  },
  closeBannerBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  closeBannerText: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
  },
  notificationToast: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    left: 16,
    right: 16,
    backgroundColor: "white",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "#065F46",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 999,
  },
  toastHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  toastTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
    color: "#1F2937",
    marginLeft: 6,
    flex: 1,
  },
  toastTime: {
    fontFamily: "DMSans_500Medium",
    fontSize: 10,
    color: "#9CA3AF",
  },
  toastMessage: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 16,
  },
});
