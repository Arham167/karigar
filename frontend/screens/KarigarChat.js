import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
} from "react-native";
import {
  ArrowLeft,
  Send,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Clock,
  Briefcase,
  X,
  MapPin,
  Calendar,
  ThumbsUp,
  AlertCircle
} from "lucide-react-native";
import { supabase } from "../utils/supabase";

const { width: SCREEN_W } = Dimensions.get("window");

// Hardcode API URL (Vercel backend tunnel)
const BASE_URL = 'https://karigar-arham-nomans-projects.vercel.app';

export default function KarigarChat({ route, navigation }) {
  const { bookingId, provider, role, dynamicQuote, buyerName } = route.params || {
    bookingId: "mock-booking-id",
    provider: { business_name: "Bilal Plumber", specialization: "Plumber" },
    role: "buyer",
    dynamicQuote: 800,
    buyerName: "Arham N."
  };

  // State Variables
  // State Variables
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]);

  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const [currentUserId, setCurrentUserId] = useState(null);
  const currentUserIdRef = useRef(null);

  const updateMessages = (newMsgs) => {
    messagesRef.current = newMsgs;
    setMessages(newMsgs);
  };

  const updateCurrentUserId = (id) => {
    currentUserIdRef.current = id;
    setCurrentUserId(id);
  };

  // Negotiation states
  const [buyerAgreed, setBuyerAgreed] = useState(false);
  const [sellerAgreed, setSellerAgreed] = useState(false);
  const [bookingStatus, setBookingStatus] = useState("pending");
  const [bothAgreed, setBothAgreed] = useState(false);
  const [negotiationPrice, setNegotiationPrice] = useState(dynamicQuote);

  // Success booking state
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const scrollViewRef = useRef(null);

  // Split professional name
  const displayBusinessName = provider?.business_name || "Expert Karigar";
  const displaySpecialization = provider?.specialization || "Professional";
  const sellerDisplayName = displayBusinessName.split(" (")[0];
  const customerName = buyerName || "Arham N.";

  const MOCK_BUYER_UUID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const MOCK_SELLER_UUID = "ssssssss-ssss-4sss-8sss-ssssssssssss";

  // Fetch Current User on Mount
  useEffect(() => {
    const initChat = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        let resolvedUserId = null;
        if (user) {
          resolvedUserId = user.id;
        } else {
          resolvedUserId = role === "buyer" ? MOCK_BUYER_UUID : MOCK_SELLER_UUID;
        }
        updateCurrentUserId(resolvedUserId);

        // Fetch initial messages and agreement status
        await fetchAgreementStatus();
        await fetchMessages(resolvedUserId);
      } catch (err) {
        console.log("Error initializing chat:", err);
        const fallbackId = role === "buyer" ? MOCK_BUYER_UUID : MOCK_SELLER_UUID;
        updateCurrentUserId(fallbackId);
        await fetchMessages(fallbackId);
        setLoading(false);
      }
    };

    initChat();

    // Setup polling for dynamic agreement & message syncing in development
    const interval = setInterval(() => {
      fetchAgreementStatus();
      syncNewMessages();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Fetch Agreement Status from Backend
  const fetchAgreementStatus = async () => {
    if (bookingId.startsWith("mock-booking")) {
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/api/chat/agreement-status/${bookingId}`, {
        headers: { "Bypass-Tunnel-Reminder": "true" }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBuyerAgreed(data.buyerAgreed);
          setSellerAgreed(data.sellerAgreed);
          setBothAgreed(data.bothAgreed);
          if (data.booking) {
            setBookingStatus(data.booking.status);
            setNegotiationPrice(parseFloat(data.booking.price || dynamicQuote));
          }
        }
      }
    } catch (err) {
      console.log("Error checking agreement status:", err);
    }
  };

  // Fetch Chat Messages from Backend
  const fetchMessages = async (customUserId = null) => {
    const activeUserId = customUserId || currentUserIdRef.current || (role === "buyer" ? MOCK_BUYER_UUID : MOCK_SELLER_UUID);

    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/chat/messages/${bookingId}`, {
        headers: { "Bypass-Tunnel-Reminder": "true" }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          if (data.messages && data.messages.length > 0) {
            const formatted = data.messages.map(msg => ({
              id: msg.id,
              text: msg.message,
              from: msg.sender_id === activeUserId || (role === "buyer" && (msg.sender_id === MOCK_BUYER_UUID || msg.sender_id.includes("buyer"))) || (role === "seller" && (msg.sender_id === MOCK_SELLER_UUID || msg.sender_id.includes("seller"))) ? "me" : "other",
              time: formatTime(msg.timestamp),
              system: false
            }));
            updateMessages(formatted);
          } else {
            loadMockMessages();
          }
        } else {
          loadMockMessages();
        }
      } else {
        loadMockMessages();
      }
    } catch (err) {
      console.log("Error fetching messages, loading mock:", err);
      loadMockMessages();
    } finally {
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
    }
  };

  // Silently sync messages for polling
  const syncNewMessages = async () => {
    const activeUserId = currentUserIdRef.current || (role === "buyer" ? MOCK_BUYER_UUID : MOCK_SELLER_UUID);
    if (!activeUserId) return;

    try {
      const response = await fetch(`${BASE_URL}/api/chat/messages/${bookingId}`, {
        headers: { "Bypass-Tunnel-Reminder": "true" }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.messages && data.messages.length > 0) {
          const formatted = data.messages.map(msg => ({
            id: msg.id,
            text: msg.message,
            from: msg.sender_id === activeUserId || (role === "buyer" && (msg.sender_id === MOCK_BUYER_UUID || msg.sender_id.includes("buyer"))) || (role === "seller" && (msg.sender_id === MOCK_SELLER_UUID || msg.sender_id.includes("seller"))) ? "me" : "other",
            time: formatTime(msg.timestamp),
            system: false
          }));

          // Only update if count changed to prevent jumpiness
          const currentNonSystemCount = messagesRef.current.filter(m => !m.system).length;

          if (formatted.length !== currentNonSystemCount) {
            // Re-inject system messages dynamically based on agreement state
            const existingSystemMsgs = messagesRef.current.filter(m => m.system);
            const finalMsgs = [...formatted, ...existingSystemMsgs];
            updateMessages(finalMsgs);
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
          }
        }
      }
    } catch (err) {
      console.log("Error syncing messages:", err);
    }
  };

  // Populate Mock Messages for a gorgeous visual layout instantly
  const loadMockMessages = () => {
    updateMessages([]);
  };

  const formatTime = (isoString) => {
    try {
      const d = new Date(isoString);
      let h = d.getHours();
      const m = d.getMinutes().toString().padStart(2, "0");
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      return `${h}:${m} ${ampm}`;
    } catch {
      return "Just now";
    }
  };

  const getNowFormattedTime = () => {
    const d = new Date();
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };

  // Send Message Trigger
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsgText = inputText.trim();
    setInputText("");

    const newMsgLocal = {
      id: Date.now(),
      from: "me",
      text: userMsgText,
      time: getNowFormattedTime(),
      system: false
    };

    updateMessages([...messagesRef.current, newMsgLocal]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    const activeUserId = currentUserIdRef.current || (role === "buyer" ? MOCK_BUYER_UUID : MOCK_SELLER_UUID);

    // Call Backend secure message endpoint for ALL bookings (mock and real) to ensure memory store sync
    try {
      setSending(true);
      await fetch(`${BASE_URL}/api/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Bypass-Tunnel-Reminder": "true" },
        body: JSON.stringify({
          bookingId: bookingId,
          senderId: activeUserId,
          message: userMsgText
        })
      });
    } catch (err) {
      console.log("Error sending message to backend:", err);
    } finally {
      setSending(false);
    }

    if (bookingId.startsWith("mock-booking") && role === "buyer") {
      // Simulate quick auto-responses for mock providers
      setTimeout(async () => {
        const replyText = "I'm ready! Let's click 'Agree to Book' so we can confirm the schedule.";
        const replySender = "seller-mock-id";
        const replyLocal = {
          id: Date.now() + 1,
          from: "other",
          text: replyText,
          time: getNowFormattedTime(),
          system: false
        };
        updateMessages([...messagesRef.current, replyLocal]);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);

        // Send mock reply to backend memory store so seller sees it when logging in!
        try {
          await fetch(`${BASE_URL}/api/chat/message`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Bypass-Tunnel-Reminder": "true" },
            body: JSON.stringify({
              bookingId: bookingId,
              senderId: replySender,
              message: replyText
            })
          });
        } catch (e) {
          console.log("Mock reply sync err:", e);
        }
      }, 1500);
    }
  };

  // Agree to Book Action (Dynamic quoted price)
  const handleAgreeToBook = async () => {
    const nextAgreedState = role === "buyer" ? true : true;

    // Optimistic UI updates
    if (role === "buyer") setBuyerAgreed(true);
    else setSellerAgreed(true);

    const systemMsg = {
      id: Date.now() + 2,
      system: true,
      text: `${role === "buyer" ? "Customer" : "Karigar"} agreed to lock booking at Rs. ${negotiationPrice.toLocaleString()}`
    };

    updateMessages([...messagesRef.current, systemMsg]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    if (!bookingId.startsWith("mock-booking")) {
      try {
        const response = await fetch(`${BASE_URL}/api/chat/agree`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Bypass-Tunnel-Reminder": "true" },
          body: JSON.stringify({
            bookingId: bookingId,
            userId: currentUserIdRef.current,
            role: role,
            price: negotiationPrice
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setBuyerAgreed(data.booking.buyer_agreed);
            setSellerAgreed(data.booking.seller_agreed);
            setBothAgreed(data.bothAgreed);

            if (data.bothAgreed) {
              const lockMsg = {
                id: Date.now() + 3,
                system: true,
                isLock: true,
                text: `🔒 Price Agreement Locked! Both parties agreed to Rs. ${negotiationPrice.toLocaleString()}. Book Now is now enabled.`
              };
              updateMessages([...messagesRef.current, lockMsg]);
              setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
            }
          }
        }
      } catch (err) {
        console.log("Error sending agreement:", err);
      }
    } else {
      // Simulate mock other party agreeing after a delay of 2.5 seconds
      setTimeout(() => {
        if (role === "buyer") setSellerAgreed(true);
        else setBuyerAgreed(true);

        setBothAgreed(true);

        const lockMsg = {
          id: Date.now() + 5,
          system: true,
          isLock: true,
          text: `🔒 Price Agreement Locked! Both parties agreed to Rs. ${negotiationPrice.toLocaleString()}. Book Now is now enabled.`
        };
        updateMessages([...messagesRef.current, lockMsg]);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
      }, 2000);
    }
  };

  // Final Book Now Checkout Action (Buyer only)
  const handleFinalBookNow = async () => {
    if (!bothAgreed) {
      Alert.alert("Agreement Required", "Both you and the Karigar must agree to the quote price before completing this booking.");
      return;
    }

    try {
      setLoading(true);

      if (!bookingId.startsWith("mock-booking")) {
        const { error } = await supabase
          .from("bookings")
          .update({
            status: "confirmed",
            confirmed_time: new Date().toISOString(),
            price: negotiationPrice
          })
          .eq("id", bookingId);

        if (error) throw error;
      }

      setBookingStatus("confirmed");
      setShowSuccessModal(true);

    } catch (err) {
      Alert.alert("Booking Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    navigation.reset({
      index: 0,
      routes: [{ name: "Map" }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent={false} backgroundColor="#042F23" />

      {/* ── 1. Secure Header ── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: role === "buyer" ? (provider?.profile_image_url || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?q=80&w=200") : "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200" }}
              style={styles.avatar}
            />
            <View style={styles.onlineDot} />
          </View>

          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {role === "buyer" ? sellerDisplayName : customerName}
            </Text>
            <View style={styles.secureBadge}>
              <ShieldCheck size={11} color="#34D399" />
              <Text style={styles.secureText}>{role === "buyer" ? displaySpecialization : "Customer"}</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.encryptedSeal}>
              <Lock size={12} color="#A7F3D0" />
              <Text style={styles.encryptedText}>Secure</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── 2. Top Info Subheader (Locked Price status) ── */}
      <View style={styles.subheaderAlert}>
        <View style={styles.subalertContent}>
          <AlertCircle size={15} color="#047857" style={{ marginRight: 6 }} />
          <Text style={styles.subalertText}>
            {bothAgreed
              ? `Deal agreed at Rs. ${negotiationPrice.toLocaleString()}! Buyer can now confirm booking.`
              : `Discuss details below. Lock in labor at Rs. ${negotiationPrice.toLocaleString()} once agreed.`}
          </Text>
        </View>
      </View>

      {/* ── 3. Chat Messages Stream ── */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color="#065F46" />
          </View>
        ) : (
          messages.map((msg, index) => {
            if (msg.system) {
              return (
                <View key={index} style={[styles.systemMessageContainer, msg.isLock && styles.systemLockContainer]}>
                  <Text style={[styles.systemMessageText, msg.isLock && styles.systemLockText]}>
                    {msg.text}
                  </Text>
                </View>
              );
            }

            const isMe = msg.from === "me";
            return (
              <View
                key={index}
                style={[
                  styles.messageRow,
                  isMe ? styles.messageRowMe : styles.messageRowOther,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isMe ? styles.bubbleMe : styles.bubbleOther,
                  ]}
                >
                  <Text style={[styles.messageText, isMe ? styles.textMe : styles.textOther]}>
                    {msg.text}
                  </Text>
                  <Text style={[styles.messageTime, isMe ? styles.timeMe : styles.timeOther]}>
                    {msg.time}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── 4. Negotiation & Book Action Panel ── */}
      <View style={styles.actionPanel}>
        <View style={styles.negotiationRow}>
          <View style={styles.negotiationPriceBox}>
            <Text style={styles.negLabel}>NEGOTIATED LABOUR</Text>
            <Text style={styles.negVal}>Rs. {negotiationPrice.toLocaleString()}</Text>
          </View>

          {/* Dynamic Agree Button based on state */}
          {role === "buyer" ? (
            <TouchableOpacity
              style={[
                styles.agreeBtn,
                buyerAgreed && styles.agreeBtnAgreed
              ]}
              activeOpacity={0.8}
              onPress={handleAgreeToBook}
              disabled={buyerAgreed}
            >
              {buyerAgreed ? (
                <>
                  <CheckCircle2 size={16} color="white" style={{ marginRight: 5 }} />
                  <Text style={styles.agreeBtnText}>You Agreed</Text>
                </>
              ) : (
                <Text style={styles.agreeBtnText}>Agree to Book</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.agreeBtn,
                sellerAgreed && styles.agreeBtnAgreed
              ]}
              activeOpacity={0.8}
              onPress={handleAgreeToBook}
              disabled={sellerAgreed}
            >
              {sellerAgreed ? (
                <>
                  <CheckCircle2 size={16} color="white" style={{ marginRight: 5 }} />
                  <Text style={styles.agreeBtnText}>You Agreed</Text>
                </>
              ) : (
                <Text style={styles.agreeBtnText}>Agree to Book</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Status display or Buyer Book Now Button */}
        {role === "buyer" ? (
          <TouchableOpacity
            style={[
              styles.bookNowBtn,
              !bothAgreed && styles.bookNowBtnDisabled
            ]}
            activeOpacity={0.8}
            onPress={handleFinalBookNow}
            disabled={!bothAgreed}
          >
            {bookingStatus === "confirmed" ? (
              <Text style={styles.bookNowBtnText}>Booking Confirmed! 🎉</Text>
            ) : (
              <>
                <Lock size={16} color={bothAgreed ? "white" : "#9CA3AF"} style={{ marginRight: 8 }} />
                <Text style={[styles.bookNowBtnText, !bothAgreed && styles.bookNowBtnTextDisabled]}>
                  {bothAgreed ? "Book Professional Now" : "Locked: Both must click Agree"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={[styles.sellerStatusCard, bothAgreed && styles.sellerStatusCardUnlocked]}>
            {bothAgreed ? (
              <View style={styles.sellerStatusRow}>
                <CheckCircle2 size={18} color="#059669" style={{ marginRight: 8 }} />
                <Text style={styles.sellerStatusTextLocked}>Price Locked! Waiting for Buyer to finalize payment.</Text>
              </View>
            ) : (
              <View style={styles.sellerStatusRow}>
                <Clock size={16} color="#B45309" style={{ marginRight: 8 }} />
                <Text style={styles.sellerStatusText}>Agreement pending. Click "Agree to Book" once done.</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ── 5. Message Input Bar ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your message securely..."
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Send size={18} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── 6. Gorgeous Booking Success Modal Overlay ── */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconWrapper}>
              <CheckCircle2 size={64} color="#10B981" />
            </View>
            <Text style={styles.modalTitle}>Booking Confirmed! 🎉</Text>
            <Text style={styles.modalSubtitle}>
              You have successfully booked {sellerDisplayName} for your {displaySpecialization.toLowerCase()} request.
            </Text>

            <View style={styles.receiptBox}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Assigned Karigar</Text>
                <Text style={styles.receiptVal}>{sellerDisplayName}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Locked Service Rate</Text>
                <Text style={[styles.receiptVal, { color: "#065F46", fontWeight: "bold" }]}>Rs. {negotiationPrice.toLocaleString()}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Status</Text>
                <Text style={[styles.receiptVal, { color: "#10B981", fontWeight: "bold" }]}>Confirmed</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.successBtn}
              activeOpacity={0.8}
              onPress={handleCloseSuccess}
            >
              <Text style={styles.successBtnText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7F5",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  // Secure Header
  header: {
    backgroundColor: "#032F23",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "#F3F4F6",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
    borderWidth: 1.5,
    borderColor: "#032F23",
  },
  headerTitleBox: {
    flex: 1,
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: "white",
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 4,
  },
  secureText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: "#34D399",
  },
  headerRight: {
    justifyContent: "center",
  },
  encryptedSeal: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  encryptedText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
    color: "#A7F3D0",
  },
  // Subheader Alert banner
  subheaderAlert: {
    backgroundColor: "#E6F4EA",
    borderBottomWidth: 1,
    borderBottomColor: "#D1E7DD",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  subalertContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  subalertText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: "#065F46",
    textAlign: "center",
  },
  // Messages Stream
  chatContent: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    paddingBottom: 30,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 16,
    width: "100%",
  },
  messageRowMe: {
    justifyContent: "flex-end",
  },
  messageRowOther: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: SCREEN_W * 0.76,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleMe: {
    backgroundColor: "#065F46",
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "white",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  messageText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  textMe: {
    color: "white",
  },
  textOther: {
    color: "#1F2937",
  },
  messageTime: {
    fontFamily: "DMSans_400Regular",
    fontSize: 9,
    alignSelf: "flex-end",
    marginTop: 5,
  },
  timeMe: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  timeOther: {
    color: "#9CA3AF",
  },
  // System message
  systemMessageContainer: {
    alignSelf: "center",
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginVertical: 12,
    maxWidth: SCREEN_W * 0.85,
  },
  systemMessageText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: "#B45309",
    textAlign: "center",
    lineHeight: 16,
  },
  systemLockContainer: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  systemLockText: {
    color: "#065F46",
    fontFamily: "DMSans_700Bold",
  },
  // Action Panel (Agreement and Book Now CTA)
  actionPanel: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 10,
  },
  negotiationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  negotiationPriceBox: {
    flex: 1,
  },
  negLabel: {
    fontFamily: "DMSans_700Bold",
    fontSize: 9,
    color: "#9CA3AF",
    letterSpacing: 0.5,
  },
  negVal: {
    fontFamily: "DMSans_700Bold",
    fontSize: 20,
    color: "#111827",
    marginTop: 2,
  },
  agreeBtn: {
    backgroundColor: "#065F46",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  agreeBtnAgreed: {
    backgroundColor: "#10B981",
  },
  agreeBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
    color: "white",
  },
  bookNowBtn: {
    backgroundColor: "#065F46",
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#065F46",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  bookNowBtnDisabled: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowOpacity: 0,
    elevation: 0,
  },
  bookNowBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    color: "white",
  },
  bookNowBtnTextDisabled: {
    color: "#9CA3AF",
  },
  sellerStatusCard: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  sellerStatusCardUnlocked: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  sellerStatusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sellerStatusText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: "#B45309",
    flex: 1,
  },
  sellerStatusTextLocked: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    color: "#065F46",
    flex: 1,
  },
  // Message Input Bar
  inputContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#F4F7F5",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#111827",
    maxHeight: 100,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#065F46",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  // Booking Success Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(1, 39, 29, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
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
  successIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 22,
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  receiptBox: {
    backgroundColor: "#F4F7F5",
    width: "100%",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  receiptLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: "#6B7280",
  },
  receiptVal: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    color: "#111827",
  },
  successBtn: {
    backgroundColor: "#065F46",
    height: 52,
    borderRadius: 16,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  successBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    color: "white",
  },
});
