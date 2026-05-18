import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions,
  Image,
  ActivityIndicator,
} from "react-native";
import {
  ArrowLeft,
  Heart,
  Star,
  MapPin,
  Clock,
  Briefcase,
  CheckCircle,
  Award,
  ThumbsUp,
  Wrench,
  ShieldCheck,
  Calendar,
  MessageSquare,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../utils/supabase";

const { width: SCREEN_W } = Dimensions.get("window");
const HERO_HEIGHT = 240; // Shorter banner to make content fit on screen without scrolling

// Standard premium dummy reviews for Karigars
const DUMMY_REVIEWS = [
  {
    id: 1,
    name: "Arham N.",
    rating: 5.0,
    comment: "Extremely professional! Arrived within 15 minutes, diagnosed the inverter compressor issue immediately and fixed it on the spot. Highly recommended!",
    date: "Today",
  },
  {
    id: 2,
    name: "Ayesha Khan",
    rating: 4.8,
    comment: "Very polite and efficient. He fixed our ceiling fan wiring cleanly and even checked the other switches for free. Reasonable rates.",
    date: "3 days ago",
  },
  {
    id: 3,
    name: "Mohammad Ali",
    rating: 5.0,
    comment: "Outstanding expertise in house wiring. Found a short circuit that three other technicians failed to locate. Professional work!",
    date: "1 week ago",
  },
];

// Standard premium services offered by Karigars
const DUMMY_SERVICES = [
  { name: "General Checkup & Diagnosis", price: "Rs. 500" },
  { name: "Inverter AC Service & Gas Fill", price: "Rs. 2,500" },
  { name: "Complete Ceiling Fan Installation", price: "Rs. 800" },
  { name: "Short Circuit & Board Repair", price: "Rs. 1,200" },
  { name: "Full Room House Rewiring", price: "Rs. 4,500" },
];

export default function KarigarSellerProfile({ provider, onClose, onBook, onChat }) {
  const [liked, setLiked] = useState(false);
  const [activeTab, setActiveTab] = useState("about");

  // Fallback data if provider object is missing (e.g. standalone test mode)
  const defaultProvider = {
    business_name: "Bilal Plumber (Plumber)",
    specialization: "Plumber",
    profile_image_url: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?q=80&w=200",
    base_rating: 4.8,
    location: "Gulshan-e-Iqbal, Karachi",
    distance: 3.08,
    available: true,
    on_time_score: 4.9,
  };

  const seller = provider || defaultProvider;

  // Split business name to separate professional name and category
  const displayBusinessName = seller.business_name || "Professional Karigar";
  const displaySpecialization = seller.specialization || "Expert Technician";
  
  // Extract clean first name
  const nameParts = displayBusinessName.split(" (");
  const displayName = nameParts[0];

  // Dynamic Quote Calculation based on specialization and distance
  const baseLabor = displaySpecialization.toLowerCase().includes("electric") ? 1200 : 1000;
  const distanceKm = parseFloat(seller.distance || 0);
  const travelFee = Math.round(distanceKm * 100); // Rs. 100 per km
  const platformFee = 200;
  const totalQuote = baseLabor + travelFee + platformFee;

  // State for available slots and selected slot
  const [dbSlots, setDbSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Fetch slots from DB or generate high-fidelity fallback slots
  useEffect(() => {
    const fetchSlots = async () => {
      // Prioritize live slots passed from our Google Sheet CRM matching engine!
      if (seller.available_slots && seller.available_slots.length > 0) {
        setDbSlots(seller.available_slots);
        setSelectedSlot(seller.available_slots[0]);
        return;
      }

      if (!seller.id || String(seller.id).startsWith("mock-")) {
        // Generates 4 premium slot options for today for mock providers
        const mockSlots = ["10:30 AM", "01:00 PM", "03:30 PM", "06:00 PM"];
        setDbSlots(mockSlots);
        setSelectedSlot(mockSlots[1]); // Default select second slot
        return;
      }
      
      setLoadingSlots(true);
      try {
        const { data, error } = await supabase
          .from("booking_slots")
          .select("start_time, end_time")
          .eq("provider_id", seller.id)
          .eq("status", "available")
          .gte("start_time", new Date().toISOString())
          .order("start_time", { ascending: true })
          .limit(4);

        if (data && data.length > 0) {
          const formatted = data.map(slot => {
            const time = new Date(slot.start_time);
            return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          });
          setDbSlots(formatted);
          setSelectedSlot(formatted[0]);
        } else {
          // Fallback slots if no active available slots are stored in Supabase
          const fallbackSlots = ["09:30 AM", "12:00 PM", "02:30 PM", "05:00 PM"];
          setDbSlots(fallbackSlots);
          setSelectedSlot(fallbackSlots[1]);
        }
      } catch (err) {
        console.log("Error fetching booking slots:", err);
        const fallbackSlots = ["09:30 AM", "12:00 PM", "02:30 PM", "05:00 PM"];
        setDbSlots(fallbackSlots);
        setSelectedSlot(fallbackSlots[1]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [seller.id]);

  // Determine specialization tags
  const getSpecTags = () => {
    const spec = displaySpecialization.toLowerCase();
    if (spec.includes("plumb")) {
      return ["Leak Repair", "Drain Clean", "Pipe Fitting", "Tap Install"];
    } else if (spec.includes("elect")) {
      return ["House Wiring", "Fan Repair", "Short Circuit", "Board Install"];
    } else if (spec.includes("ac") || spec.includes("cooling")) {
      return ["AC Gas Refill", "Split Service", "Compressor Fix", "Leak Detection"];
    } else {
      return ["Expert Repair", "Quick Install", "Fault Diagnosis", "Maintenance"];
    }
  };

  const specTags = getSpecTags();

  const handleHeartPress = () => {
    setLiked(!liked);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Hero Image & Gradient Overlay ── */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=600" }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0.1)", "rgba(0,0,0,0.85)"]}
            style={styles.heroGradient}
          />

          {/* Floating Actions on Hero Banner */}
          <SafeAreaView style={styles.heroHeader}>
            <TouchableOpacity 
              style={styles.circleHeaderButton} 
              activeOpacity={0.8}
              onPress={onClose}
            >
              <ArrowLeft size={22} color="white" />
            </TouchableOpacity>

            <Text style={styles.headerLogo}>Karigar Profile</Text>

            <TouchableOpacity 
              style={styles.circleHeaderButton} 
              activeOpacity={0.8}
              onPress={handleHeartPress}
            >
              <Heart size={22} color={liked ? "#EF4444" : "white"} fill={liked ? "#EF4444" : "transparent"} />
            </TouchableOpacity>
          </SafeAreaView>

          {/* Floating Bottom Card over Hero */}
          <View style={styles.heroOverlayContent}>
            <View style={styles.verifiedRow}>
              <Award size={14} color="#34D399" />
              <Text style={styles.verifiedText}>PLATINUM VERIFIED SELLER</Text>
            </View>
            <Text style={styles.businessNameText} numberOfLines={1}>
              {displayBusinessName}
            </Text>
            <View style={styles.quickStatsRow}>
              <View style={styles.statChip}>
                <Star size={13} color="#FBBF24" fill="#FBBF24" />
                <Text style={styles.statChipText}>{seller.base_rating || "4.8"}</Text>
              </View>
              <View style={styles.statDivider} />
              <Text style={styles.quickStatText}>{seller.distance ? `${seller.distance} km away` : "Nearby"}</Text>
              <View style={styles.statDivider} />
              <Text style={styles.quickStatText} numberOfLines={1}>{seller.location ? seller.location.split(',')[0] : "Karachi"}</Text>
            </View>
          </View>
        </View>

        {/* ── Profile Summary Card (Overlaps Banner) ── */}
        <View style={styles.overlapCard}>
          <View style={styles.profilePicWrapper}>
            <Image
              source={{ uri: seller.profile_image_url || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?q=80&w=200" }}
              style={styles.profilePic}
            />
            <View style={styles.onlineBadge} />
          </View>

          <View style={styles.primaryDetailsContainer}>
            <View style={styles.nameBadgeContainer}>
              <Text style={styles.sellerName} numberOfLines={1}>
                {displayName}
              </Text>
              <CheckCircle size={18} color="#065F46" fill="#ECFDF5" style={{ marginLeft: 6 }} />
            </View>
            <Text style={styles.occupationText}>{displaySpecialization}</Text>
            
            <View style={styles.contactActionsRow}>
              <View style={styles.experienceBadge}>
                <Briefcase size={12} color="#065F46" />
                <Text style={styles.experienceText}>5+ Years Exp</Text>
              </View>
              <View style={styles.jobsCompletedBadge}>
                <ThumbsUp size={12} color="#065F46" />
                <Text style={styles.jobsCompletedText}>82 Jobs Finished</Text>
              </View>
            </View>
          </View>
        </View>



        {/* ── Segmented Custom Tabs ── */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "about" && styles.tabButtonActive]}
            onPress={() => setActiveTab("about")}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, activeTab === "about" && styles.tabButtonTextActive]}>
              About
            </Text>
            {activeTab === "about" && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "services" && styles.tabButtonActive]}
            onPress={() => setActiveTab("services")}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, activeTab === "services" && styles.tabButtonTextActive]}>
              Services
            </Text>
            {activeTab === "services" && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "reviews" && styles.tabButtonActive]}
            onPress={() => setActiveTab("reviews")}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, activeTab === "reviews" && styles.tabButtonTextActive]}>
              Reviews ({DUMMY_REVIEWS.length})
            </Text>
            {activeTab === "reviews" && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
        </View>

        {/* ── Tab Content Views ── */}
        <View style={styles.tabContentContainer}>
          {/* ABOUT TAB - COMPACT SCREEN-FITTING DASHBOARD */}
          {activeTab === "about" && (
            <View style={styles.tabPane}>
              {/* Rating & On-time Score Widgets Side-by-Side */}
              <View style={styles.statsCardsRow}>
                <View style={styles.statScoreCard}>
                  <View style={styles.scoreHeader}>
                    <Star size={16} color="#FBBF24" fill="#FBBF24" />
                    <Text style={styles.scoreTitle}>Rating & Reviews</Text>
                  </View>
                  <Text style={styles.scoreVal}>{seller.base_rating || "4.8"}</Text>
                  <Text style={styles.scoreSub}>Excellent (82 Jobs)</Text>
                </View>

                <View style={styles.statScoreCard}>
                  <View style={styles.scoreHeader}>
                    <Clock size={16} color="#059669" />
                    <Text style={styles.scoreTitle}>On-Time Score</Text>
                  </View>
                  <Text style={[styles.scoreVal, { color: "#059669" }]}>
                    {seller.on_time_score ? `${Math.round(parseFloat(seller.on_time_score) * 20)}%` : "98%"}
                  </Text>
                  <Text style={styles.scoreSub}>Highly Punctual</Text>
                </View>
              </View>

              {/* Specialization Tags */}
              <Text style={styles.dashboardSectionTitle}>Specialization Tags</Text>
              <View style={styles.tagsChipContainer}>
                {specTags.map((tag, index) => (
                  <View key={index} style={styles.specTagChip}>
                    <Text style={styles.specTagText}>{tag}</Text>
                  </View>
                ))}
              </View>

              {/* Available Slots (Interactive From DB / Falling back cleanly) */}
              <Text style={styles.dashboardSectionTitle}>Available Slots (DB Verified)</Text>
              {loadingSlots ? (
                <View style={styles.slotsLoader}>
                  <ActivityIndicator size="small" color="#065F46" />
                </View>
              ) : (
                <View style={styles.slotsRow}>
                  {dbSlots.map((slot, index) => {
                    const isSelected = selectedSlot === slot;
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[styles.slotChipButton, isSelected && styles.slotChipButtonActive]}
                        activeOpacity={0.855}
                        onPress={() => setSelectedSlot(slot)}
                      >
                        <Calendar size={12} color={isSelected ? "white" : "#6B7280"} style={{ marginRight: 5 }} />
                        <Text style={[styles.slotChipText, isSelected && styles.slotChipTextActive]}>
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Dynamic Price Quote breakdown receipt */}
              <Text style={styles.dashboardSectionTitle}>Dynamic Price Quote Breakdown</Text>
              <View style={styles.receiptContainer}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Base Labor Charge ({displaySpecialization})</Text>
                  <Text style={styles.receiptVal}>Rs. {baseLabor.toLocaleString()}</Text>
                </View>
                
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Travel Fee ({distanceKm ? `${distanceKm} km` : "Nearby"})</Text>
                  <Text style={styles.receiptVal}>Rs. {travelFee.toLocaleString()}</Text>
                </View>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Platform Trust & Safety Fee</Text>
                  <Text style={styles.receiptVal}>Rs. {platformFee.toLocaleString()}</Text>
                </View>

                <View style={styles.receiptDivider} />

                <View style={[styles.receiptRow, { marginTop: 6 }]}>
                  <Text style={styles.receiptTotalLabel}>Final Price Quote</Text>
                  <Text style={styles.receiptTotalVal}>Rs. {totalQuote.toLocaleString()}</Text>
                </View>
              </View>
            </View>
          )}

          {/* SERVICES TAB */}
          {activeTab === "services" && (
            <View style={styles.tabPane}>
              <Text style={styles.sectionHeading}>Standard Service Offerings</Text>
              <Text style={styles.sectionSub}>All prices listed are estimated labor costs. Final price is agreed prior to starting work.</Text>
              
              {DUMMY_SERVICES.map((srv, idx) => (
                <View key={idx} style={styles.serviceItemCard}>
                  <View style={styles.serviceIconContainer}>
                    <Briefcase size={18} color="#065F46" />
                  </View>
                  <View style={styles.serviceDetails}>
                    <Text style={styles.serviceName}>{srv.name}</Text>
                    <Text style={styles.serviceEstimate}>Labor Estimate</Text>
                  </View>
                  <Text style={styles.servicePrice}>{srv.price}</Text>
                </View>
              ))}
            </View>
          )}

          {/* REVIEWS TAB */}
          {activeTab === "reviews" && (
            <View style={styles.tabPane}>
              <View style={styles.reviewsSummaryCard}>
                <Text style={styles.summaryScoreText}>{seller.base_rating || "4.8"}</Text>
                <View style={styles.summaryStarsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={14} color="#FBBF24" fill="#FBBF24" style={{ marginRight: 2 }} />
                  ))}
                </View>
                <Text style={styles.summaryCountText}>Based on 82 completed jobs</Text>
              </View>

              <Text style={styles.sectionHeading}>Recent Customer Feedback</Text>
              {DUMMY_REVIEWS.map((rev) => (
                <View key={rev.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewUserBg}>
                      <Text style={styles.reviewUserText}>{rev.name[0]}</Text>
                    </View>
                    <View style={styles.reviewUserInfo}>
                      <Text style={styles.reviewUserName}>{rev.name}</Text>
                      <View style={styles.reviewStarsRow}>
                        <Star size={11} color="#FBBF24" fill="#FBBF24" />
                        <Text style={styles.reviewScore}>{rev.rating.toFixed(1)}</Text>
                        <Text style={styles.reviewDate}>• {rev.date}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>{rev.comment}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 130 }} />
      </ScrollView>

      <View style={styles.footerSticky}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Estimated Dynamic Quote</Text>
          <Text style={styles.priceValue}>Rs. {totalQuote.toLocaleString()}</Text>
        </View>

        <View style={styles.footerActions}>
          <TouchableOpacity 
            style={styles.hireCtaButton} 
            activeOpacity={0.8}
            onPress={() => onChat({ ...seller, selectedSlot, dynamicPrice: totalQuote })}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MessageSquare size={18} color="white" />
              <Text style={styles.hireCtaText}>Chat to Book</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  // Hero Section
  heroContainer: {
    height: HERO_HEIGHT,
    position: "relative",
    backgroundColor: "#032F23",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroHeader: {
    position: "absolute",
    top: Platform.OS === "ios" ? 10 : 30,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  circleHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  headerLogo: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: "white",
    letterSpacing: -0.5,
  },
  heroOverlayContent: {
    position: "absolute",
    bottom: 20,
    left: 24,
    right: 24,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  verifiedText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
    color: "#34D399",
    letterSpacing: 1.2,
  },
  businessNameText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 24,
    color: "white",
    marginBottom: 6,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 3,
  },
  quickStatsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251, 191, 36, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  statChipText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    color: "#FBBF24",
  },
  statDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.45)",
    marginHorizontal: 8,
  },
  quickStatText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: "#E5E7EB",
  },
  // Overlapping Info Box
  overlapCard: {
    marginHorizontal: 20,
    marginTop: -16,
    backgroundColor: "white",
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    zIndex: 20,
  },
  profilePicWrapper: {
    position: "relative",
    marginRight: 14,
  },
  profilePic: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    borderColor: "white",
    backgroundColor: "#F3F4F6",
  },
  onlineBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "white",
  },
  primaryDetailsContainer: {
    flex: 1,
    justifyContent: "center",
  },
  nameBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  sellerName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
    color: "#111827",
  },
  occupationText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6,
  },
  contactActionsRow: {
    flexDirection: "row",
    gap: 6,
  },
  experienceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  experienceText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
    color: "#065F46",
  },
  jobsCompletedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  jobsCompletedText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
    color: "#065F46",
  },
  // Tab Buttons Layout
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    position: "relative",
  },
  tabButtonActive: {},
  tabButtonText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#6B7280",
  },
  tabButtonTextActive: {
    fontFamily: "DMSans_700Bold",
    color: "#065F46",
  },
  activeTabIndicator: {
    position: "absolute",
    bottom: -1,
    height: 2.5,
    backgroundColor: "#065F46",
    width: "45%",
    borderTopLeftRadius: 2.5,
    borderTopRightRadius: 2.5,
  },
  // Tab Panel contents
  tabContentContainer: {
    paddingHorizontal: 20,
    marginTop: 15,
  },
  tabPane: {},
  sectionHeading: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    color: "#111827",
    marginBottom: 8,
  },
  sectionSub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 12,
  },
  // Dashboard Elements Styles
  dashboardSectionTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: "#374151",
    marginTop: 16,
    marginBottom: 10,
  },
  statsCardsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statScoreCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  scoreHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  scoreTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    color: "#6B7280",
  },
  scoreVal: {
    fontFamily: "DMSans_700Bold",
    fontSize: 22,
    color: "#D97706",
    marginBottom: 2,
  },
  scoreSub: {
    fontFamily: "DMSans_500Medium",
    fontSize: 10,
    color: "#9CA3AF",
  },
  tagsChipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  specTagChip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  specTagText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: "#4B5563",
  },
  slotsRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  slotChipButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: 10,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  slotChipButtonActive: {
    backgroundColor: "#065F46",
    borderColor: "#065F46",
  },
  slotChipText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    color: "#4B5563",
  },
  slotChipTextActive: {
    color: "white",
  },
  slotsLoader: {
    paddingVertical: 10,
    alignItems: "center",
  },
  receiptContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    padding: 14,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  receiptLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: "#6B7280",
  },
  receiptVal: {
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
    color: "#111827",
  },
  receiptDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 6,
  },
  receiptTotalLabel: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    color: "#111827",
  },
  receiptTotalVal: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: "#065F46",
  },
  // Services Tab List
  serviceItemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  serviceIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  serviceDetails: {
    flex: 1,
  },
  serviceName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    color: "#111827",
    marginBottom: 2,
  },
  serviceEstimate: {
    fontFamily: "DMSans_500Medium",
    fontSize: 10,
    color: "#9CA3AF",
  },
  servicePrice: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: "#065F46",
  },
  // Reviews Tab List
  reviewsSummaryCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  summaryScoreText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 32,
    color: "#111827",
    lineHeight: 36,
    marginBottom: 4,
  },
  summaryStarsRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  summaryCountText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: "#6B7280",
  },
  reviewCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewUserBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  reviewUserText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    color: "#065F46",
  },
  reviewUserInfo: {
    flex: 1,
  },
  reviewUserName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
    color: "#111827",
    marginBottom: 1,
  },
  reviewStarsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  reviewScore: {
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
    color: "#D97706",
    marginLeft: 2,
  },
  reviewDate: {
    fontFamily: "DMSans_500Medium",
    fontSize: 10,
    color: "#9CA3AF",
    marginLeft: 4,
  },
  reviewComment: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#4B5563",
    lineHeight: 16,
  },
  // Sticky Footer
  footerSticky: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === "ios" ? 30 : 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 15,
  },
  priceContainer: {
    justifyContent: "center",
  },
  priceLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
  },
  priceValue: {
    fontFamily: "DMSans_700Bold",
    fontSize: 20,
    color: "#065F46",
  },
  footerActions: {
    flex: 1.8,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
    gap: 8,
  },
  chatIconButton: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  hireCtaButton: {
    flex: 1,
    height: 52,
    backgroundColor: "#065F46",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#065F46",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  hireCtaText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    color: "white",
  },
});
