import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Calendar,
  AlertCircle,
  Briefcase
} from "lucide-react-native";
import { supabase } from "../utils/supabase";

export default function MyJobsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("current"); // "past", "current", "future"
  
  const [jobs, setJobs] = useState({
    past: [],
    current: [],
    future: []
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // 1. Fetch provider details to get seller_id
      const { data: provider } = await supabase
        .from("providers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!provider) {
        setLoading(false);
        return;
      }

      // 2. Fetch all bookings for this seller
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("id, buyer_id, service_type, location, price, status, requested_time, created_at")
        .eq("seller_id", provider.id)
        .order("requested_time", { ascending: true });

      if (error) throw error;

      if (!bookings || bookings.length === 0) {
        setJobs({ past: [], current: [], future: [] });
        setLoading(false);
        return;
      }

      // 3. Fetch buyer profiles for customer names
      const buyerIds = [...new Set(bookings.map(b => b.buyer_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, profile_image_url")
        .in("id", buyerIds);

      const profileMap = {};
      if (profiles) {
        profiles.forEach(p => {
          profileMap[p.id] = p;
        });
      }

      const now = new Date();
      
      const categorized = {
        past: [],
        current: [],
        future: []
      };

      bookings.forEach(b => {
        const buyer = profileMap[b.buyer_id] || { name: "Customer", profile_image_url: null };
        const job = {
          ...b,
          customerName: buyer.name,
          customerAvatar: buyer.profile_image_url || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200",
        };

        if (job.status === "completed") {
          categorized.past.push(job);
        } else if (job.status === "confirmed" || job.status === "accepted") {
          const jobTime = new Date(job.requested_time);
          
          // If job time is today and within a 2-hour window (e.g. 1 hr before and 1 hr after)
          // Or if the job time has passed but it's not marked complete yet, consider it current.
          const timeDiffHours = (jobTime - now) / (1000 * 60 * 60);
          
          if (timeDiffHours <= 1 && timeDiffHours >= -12) {
            // It's happening soon or has recently happened (up to 12 hours ago) and still not marked complete
            categorized.current.push(job);
          } else if (timeDiffHours > 1) {
            // It's clearly in the future
            categorized.future.push(job);
          } else {
            // It's old but still marked confirmed/accepted. We can put it in current to prompt action.
            categorized.current.push(job);
          }
        }
      });

      // Sort past jobs newest first
      categorized.past.sort((a, b) => new Date(b.requested_time) - new Date(a.requested_time));

      setJobs(categorized);
    } catch (err) {
      console.log("Error fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  const formatJobTime = (isoString) => {
    if (!isoString) return "Time not set";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "Time not set";
      
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const dayName = days[date.getDay()];
      const monthName = months[date.getMonth()];
      const day = date.getDate();
      
      let h = date.getHours();
      const m = date.getMinutes().toString().padStart(2, "0");
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      
      return `${dayName}, ${monthName} ${day} at ${h}:${m} ${ampm}`;
    } catch (e) {
      return "Time not set";
    }
  };

  const renderJobCard = (job, type) => {
    let statusColor = "#059669";
    let statusBg = "#ECFDF5";
    let StatusIcon = CheckCircle2;
    let statusText = "Completed";

    if (type === "current") {
      statusColor = "#D97706";
      statusBg = "#FFFBEB";
      StatusIcon = AlertCircle;
      statusText = "Active Now";
    } else if (type === "future") {
      statusColor = "#2563EB";
      statusBg = "#EFF6FF";
      StatusIcon = Calendar;
      statusText = "Upcoming";
    }

    return (
      <View key={job.id} style={styles.jobCard}>
        <View style={styles.cardHeader}>
          <Image source={{ uri: job.customerAvatar }} style={styles.avatar} />
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{job.customerName}</Text>
            <Text style={styles.serviceText}>{job.service_type}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <StatusIcon size={12} color={statusColor} />
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Clock size={14} color="#6B7280" />
            <Text style={styles.detailText}>{formatJobTime(job.requested_time)}</Text>
          </View>
        </View>
        
        <View style={[styles.detailsRow, { marginTop: 8 }]}>
          <View style={styles.detailItem}>
            <MapPin size={14} color="#6B7280" />
            <Text style={styles.detailText} numberOfLines={2}>{job.location}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderTabContent = () => {
    const activeJobs = jobs[activeTab];

    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#065F46" />
        </View>
      );
    }

    if (activeJobs.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Briefcase size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No {activeTab} jobs found</Text>
          <Text style={styles.emptySub}>When you have {activeTab} jobs, they will appear here.</Text>
        </View>
      );
    }

    return (
      <View style={styles.listContainer}>
        {activeJobs.map(job => renderJobCard(job, activeTab))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#032F23" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Jobs Manager</Text>
        <View style={{ width: 40 }} /> {/* Placeholder for balance */}
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === "past" && styles.activeTabBtn]} 
          onPress={() => setActiveTab("past")}
        >
          <Text style={[styles.tabText, activeTab === "past" && styles.activeTabText]}>Past Jobs</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === "current" && styles.activeTabBtn]} 
          onPress={() => setActiveTab("current")}
        >
          <Text style={[styles.tabText, activeTab === "current" && styles.activeTabText]}>Current</Text>
          {jobs.current.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{jobs.current.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === "future" && styles.activeTabBtn]} 
          onPress={() => setActiveTab("future")}
        >
          <Text style={[styles.tabText, activeTab === "future" && styles.activeTabText]}>Future Jobs</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#065F46"]} />
        }
      >
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7F5",
  },
  header: {
    backgroundColor: "#032F23",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
    color: "white",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderColor: "transparent",
  },
  activeTabBtn: {
    borderColor: "#065F46",
  },
  tabText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: "#6B7280",
  },
  activeTabText: {
    color: "#065F46",
    fontFamily: "DMSans_700Bold",
  },
  badge: {
    backgroundColor: "#EF4444",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  badgeText: {
    color: "white",
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 60,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
    color: "#1F2937",
    marginTop: 16,
  },
  emptySub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  listContainer: {
    gap: 16,
  },
  jobCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
  },
  customerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: "#1F2937",
  },
  serviceText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: "#059669",
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  statusBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 14,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    gap: 8,
  },
  detailText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#4B5563",
    flex: 1,
  },
});
