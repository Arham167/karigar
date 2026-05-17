import React, { useState } from "react";
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
  Play,
  Pause,
  Award,
  ThumbsUp,
  Wrench,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_W } = Dimensions.get("window");
const HERO_HEIGHT = 280;

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

export default function KarigarSellerProfile({ provider, onClose, onBook }) {
  const [liked, setLiked] = useState(false);
  const [activeTab, setActiveTab] = useState("about");
  const [playing, setPlaying] = useState(false);

  // Fallback data if provider object is missing (e.g. standalone test mode)
  const defaultProvider = {
    business_name: "Ahmed Hassan (Electrician)",
    specialization: "Electrician",
    profile_image_url: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?q=80&w=200",
    base_rating: 4.9,
    location: "Gulshan-e-Iqbal, Karachi",
    distance: 0.8,
    available: true,
  };

  const seller = provider || defaultProvider;

  // Split business name to separate professional name and category
  const displayBusinessName = seller.business_name || "Professional Karigar";
  const displaySpecialization = seller.specialization || "Expert Technician";
  
  // Extract clean first name
  const nameParts = displayBusinessName.split(" (");
  const displayName = nameParts[0];

  const handleHeartPress = () => {
    setLiked(!liked);
  };

  const handlePlayBioPress = () => {
    setPlaying(!playing);
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
              <Award size={16} color="#34D399" />
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
              <Text style={styles.quickStatText}>{seller.location || "Karachi"}</Text>
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
            
            {/* Action Buttons: Phone & Chat simulations */}
            <View style={styles.contactActionsRow}>
              <View style={styles.experienceBadge}>
                <Briefcase size={14} color="#065F46" />
                <Text style={styles.experienceText}>5+ Years Exp</Text>
              </View>
              <View style={styles.jobsCompletedBadge}>
                <ThumbsUp size={14} color="#065F46" />
                <Text style={styles.jobsCompletedText}>82 Jobs Finished</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Dynamic AI Audio Bio Playback Card ── */}
        <View style={styles.audioBioContainer}>
          <View style={styles.audioIconBg}>
            <Play size={20} color="#065F46" fill="#065F46" />
          </View>
          <View style={styles.audioTextContent}>
            <Text style={styles.audioTitle}>Voice Introduction</Text>
            <Text style={styles.audioSubtitle}>Listen to {displayName}'s skills & guarantee</Text>
          </View>
          <TouchableOpacity 
            style={[styles.audioPlayButton, playing && styles.audioPlayButtonActive]} 
            onPress={handlePlayBioPress}
            activeOpacity={0.8}
          >
            {playing ? (
              <>
                <Pause size={16} color="white" fill="white" />
                <Text style={styles.audioPlayText}>Playing...</Text>
              </>
            ) : (
              <>
                <Play size={16} color="#065F46" fill="#065F46" />
                <Text style={[styles.audioPlayText, { color: "#065F46" }]}>Listen</Text>
              </>
            )}
          </TouchableOpacity>
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
          {/* ABOUT TAB */}
          {activeTab === "about" && (
            <View style={styles.tabPane}>
              <Text style={styles.sectionHeading}>Professional Biography</Text>
              <Text style={styles.bioText}>
                As a highly trained {displaySpecialization.toLowerCase()}, I specialize in premium installations, fast diagnoses, and safety-compliant repairs. With over five years of dedicated experience serving the Karachi region, I guarantee cleanliness, prompt arrival, and affordable transparent pricing. I work with high-quality copper wiring, premium diagnostic meters, and offer a 7-day guarantee on my labor.
              </Text>

              <Text style={styles.sectionHeading}>Skills & Expertises</Text>
              <View style={styles.skillsContainer}>
                {["House Wiring", "Fan Repair", "Inverter Expert", "Circuit Overloads", "Board Replacements", "Safety Check"].map((skill, index) => (
                  <View key={index} style={styles.skillChip}>
                    <Text style={styles.skillChipText}>{skill}</Text>
                  </View>
                ))}
              </View>

              {/* Working Hours / Verification Card */}
              <View style={styles.verificationBadgeCard}>
                <View style={styles.badgeRow}>
                  <CheckCircle size={20} color="#059669" />
                  <Text style={styles.badgeRowTitle}>Security & Safety Verified</Text>
                </View>
                <Text style={styles.badgeRowSub}>
                  CNIC registration and background check completed. 100% secure payment and dispute-free record.
                </Text>
                
                <View style={[styles.badgeRow, { marginTop: 12 }]}>
                  <Clock size={20} color="#059669" />
                  <Text style={styles.badgeRowTitle}>Available Hours</Text>
                </View>
                <Text style={styles.badgeRowSub}>
                  Monday - Saturday: 9:00 AM to 8:00 PM • Sunday: Closed
                </Text>
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
                    <Briefcase size={20} color="#065F46" />
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
                <Text style={styles.summaryScoreText}>{seller.base_rating || "4.9"}</Text>
                <View style={styles.summaryStarsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={16} color="#FBBF24" fill="#FBBF24" style={{ marginRight: 2 }} />
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
                        <Star size={12} color="#FBBF24" fill="#FBBF24" />
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

      {/* ── Sticky Checkout Action Footer ── */}
      <View style={styles.footerSticky}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Estimated Labor</Text>
          <Text style={styles.priceValue}>Rs. 1,500</Text>
        </View>

        <TouchableOpacity 
          style={styles.hireCtaButton} 
          activeOpacity={0.8}
          onPress={() => onBook(seller)}
        >
          <Text style={styles.hireCtaText}>Book {displayName} Now</Text>
        </TouchableOpacity>
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
    top: Platform.OS === "ios" ? 15 : 35,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  circleHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  headerLogo: {
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
    color: "white",
    letterSpacing: -0.5,
  },
  heroOverlayContent: {
    position: "absolute",
    bottom: 25,
    left: 24,
    right: 24,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  verifiedText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    color: "#34D399",
    letterSpacing: 1.5,
  },
  businessNameText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 26,
    color: "white",
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
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
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  statChipText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
    color: "#FBBF24",
  },
  statDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.45)",
    marginHorizontal: 10,
  },
  quickStatText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#E5E7EB",
  },
  // Overlapping Info Box
  overlapCard: {
    marginHorizontal: 20,
    marginTop: -20,
    backgroundColor: "white",
    borderRadius: 28,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    zIndex: 20,
  },
  profilePicWrapper: {
    position: "relative",
    marginRight: 16,
  },
  profilePic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "white",
    backgroundColor: "#F3F4F6",
  },
  onlineBadge: {
    position: "absolute",
    bottom: 3,
    right: 3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10B981",
    borderWidth: 2.5,
    borderColor: "white",
  },
  primaryDetailsContainer: {
    flex: 1,
    justifyContent: "center",
  },
  nameBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  sellerName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 20,
    color: "#111827",
  },
  occupationText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 10,
  },
  contactActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  experienceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  experienceText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    color: "#065F46",
  },
  jobsCompletedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  jobsCompletedText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    color: "#065F46",
  },
  // Audio Bio
  audioBioContainer: {
    marginHorizontal: 20,
    marginTop: 15,
    backgroundColor: "#E6F4EA",
    borderWidth: 1,
    borderColor: "#CEEBD6",
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  audioIconBg: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  audioTextContent: {
    flex: 1,
  },
  audioTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: "#065F46",
    marginBottom: 2,
  },
  audioSubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "#3B7A57",
  },
  audioPlayButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "#B7E1C1",
  },
  audioPlayButtonActive: {
    backgroundColor: "#065F46",
    borderColor: "#065F46",
  },
  audioPlayText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
    color: "white",
  },
  // Tab Buttons Layout
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 25,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    position: "relative",
  },
  tabButtonActive: {},
  tabButtonText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: "#6B7280",
  },
  tabButtonTextActive: {
    fontFamily: "DMSans_700Bold",
    color: "#065F46",
  },
  activeTabIndicator: {
    position: "absolute",
    bottom: -1,
    height: 3,
    backgroundColor: "#065F46",
    width: "45%",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  // Tab Panel contents
  tabContentContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  tabPane: {},
  sectionHeading: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: "#111827",
    marginBottom: 10,
  },
  sectionSub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 15,
  },
  bioText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 22,
    marginBottom: 20,
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  skillChip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  skillChipText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: "#374151",
  },
  verificationBadgeCard: {
    backgroundColor: "white",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  badgeRowTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: "#065F46",
  },
  badgeRowSub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
    paddingLeft: 28,
  },
  // Services Tab List
  serviceItemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  serviceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  serviceDetails: {
    flex: 1,
  },
  serviceName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: "#111827",
    marginBottom: 2,
  },
  serviceEstimate: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: "#9CA3AF",
  },
  servicePrice: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    color: "#065F46",
  },
  // Reviews Tab List
  reviewsSummaryCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },
  summaryScoreText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 36,
    color: "#111827",
    lineHeight: 40,
    marginBottom: 4,
  },
  summaryStarsRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  summaryCountText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: "#6B7280",
  },
  reviewCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  reviewUserBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  reviewUserText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: "#065F46",
  },
  reviewUserInfo: {
    flex: 1,
  },
  reviewUserName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    color: "#111827",
    marginBottom: 2,
  },
  reviewStarsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  reviewScore: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    color: "#D97706",
    marginLeft: 3,
  },
  reviewDate: {
    fontFamily: "DMSans_500Medium",
    fontSize: 10,
    color: "#9CA3AF",
    marginLeft: 6,
  },
  reviewComment: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  // Sticky Footer
  footerSticky: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 20,
  },
  priceContainer: {
    justifyContent: "center",
  },
  priceLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  priceValue: {
    fontFamily: "DMSans_700Bold",
    fontSize: 22,
    color: "#065F46",
  },
  hireCtaButton: {
    flex: 1,
    height: 56,
    backgroundColor: "#065F46",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 20,
    shadowColor: "#065F46",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  hireCtaText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: "white",
  },
});
