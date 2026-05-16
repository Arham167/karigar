import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Platform,
} from "react-native";
import Svg, { Path, Rect, Circle } from "react-native-svg";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { DMSerifDisplay_400Regular } from "@expo-google-fonts/dm-serif-display";
import { supabase } from "../utils/supabase";
import { useAuthStore } from "../store/authStore";

// --- SVG Icons ---
const IconLogo = ({ color = "white", size = 32 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </Svg>
);

const IconFlagPK = ({ size = 22 }) => (
  <Svg width={size} height={size * 0.7} viewBox="0 0 640 480">
    <Rect width="640" height="480" fill="#006600" rx={4} />
    <Rect width="160" height="480" fill="#fff" />
    <Circle cx="400" cy="240" r="120" fill="#fff" />
    <Circle cx="440" cy="210" r="120" fill="#006600" />
    <Path fill="#fff" d="M430 160l10 30 30 10-30 10-10 30-10-30-30-10 30-10z" />
  </Svg>
);

const IconShield = ({ color = "#8fa898", size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Svg>
);

const IconArrowRight = ({ color = "white", size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M5 12h14M12 5l7 7-7 7" />
  </Svg>
);

export default function SignupScreen({ navigation }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const phoneInputRef = useRef(null);

  let [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
  });

  const handleChangePhone = (val) => {
    const raw = val.replace(/\D/g, "").slice(0, 10);
    setPhone(raw);
    if (error) setError("");
  };

  const formatDisplay = (raw) => {
    if (raw.length <= 3) return raw;
    if (raw.length <= 7) return `${raw.slice(0, 3)} ${raw.slice(3)}`;
    return `${raw.slice(0, 3)} ${raw.slice(3, 7)} ${raw.slice(7)}`;
  };

  const handleSignup = async () => {
    if (phone.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const fullPhone = `+92${phone}`;
      
      // Trigger Supabase OTP (will use the test numbers you added)
      const { data, error: otpError } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });

      if (otpError) throw otpError;
      
      // Save phone number to store for subsequent profile setup
      useAuthStore.getState().setPhoneNumber(fullPhone);
      
      // Move to Verification Screen
      navigation.navigate("VerifyOTP", { phoneNumber: fullPhone });
    } catch (err) {
      setError("Auth error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1d6645" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f7f5" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <View style={styles.logoBox}>
            <IconLogo />
          </View>
          <Text style={styles.brandName}>Karigar</Text>
          <Text style={styles.brandTagline}>Join our community of skilled professionals</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Account</Text>
          <Text style={styles.cardSubtitle}>Register with your mobile number to get started</Text>
          <Text style={styles.fieldLabel}>Mobile Number</Text>
          <View style={[styles.phoneWrapper, focused && styles.phoneWrapperFocused]}>
            <View style={styles.prefix}>
              <View style={styles.flag}>
                <IconFlagPK />
              </View>
              <Text style={styles.prefixCode}>+92</Text>
              <View style={styles.divider} />
            </View>
            <TextInput
              ref={phoneInputRef}
              style={styles.phoneInput}
              value={formatDisplay(phone)}
              onChangeText={handleChangePhone}
              placeholder="300 1234567"
              placeholderTextColor="#a0b8aa"
              keyboardType="phone-pad"
              maxLength={12}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
          </View>

          {error ? <Text style={styles.errorMsg}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btnOTP, loading && styles.btnLoading]}
            onPress={handleSignup}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.btnInner}>
                <Text style={styles.btnText}>Register Now</Text>
                <IconArrowRight />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Auth")}>
              <Text style={styles.signupLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.secureRow}>
            <IconShield />
            <Text style={styles.secureText}>Secure and Encrypted</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const GREEN_PRIMARY = "#1d6645";
const TEXT_DARK = "#111a14";
const TEXT_MID = "#4b5e52";
const TEXT_LIGHT = "#8fa898";
const SURFACE = "#f4f7f5";
const BORDER = "#dce8e1";

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: SURFACE },
  safe: { flex: 1, backgroundColor: SURFACE },
  scroll: { flexGrow: 1, alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 24 },
  brand: { alignItems: "center", gap: 10, marginBottom: 4 },
  logoBox: {
    width: 72,
    height: 72,
    backgroundColor: GREEN_PRIMARY,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
  },
  logoEmoji: { fontSize: 32 },
  brandName: { fontFamily: "DMSerifDisplay_400Regular", fontSize: 32, color: GREEN_PRIMARY, letterSpacing: -0.5, marginTop: 4 },
  brandTagline: { fontFamily: "DMSans_400Regular", fontSize: 14, color: TEXT_MID, textAlign: "center", lineHeight: 20 },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(220,232,225,0.6)",
    elevation: 5,
  },
  cardTitle: { fontFamily: "DMSerifDisplay_400Regular", fontSize: 26, color: TEXT_DARK, letterSpacing: -0.3, marginBottom: 4 },
  cardSubtitle: { fontFamily: "DMSans_400Regular", fontSize: 14, color: TEXT_MID, lineHeight: 20, marginBottom: 24 },
  fieldLabel: { fontFamily: "DMSans_700Bold", fontSize: 13, color: TEXT_MID, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  phoneWrapper: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1.5, borderBottomColor: BORDER, backgroundColor: "transparent", marginBottom: 24 },
  phoneWrapperFocused: { borderBottomColor: GREEN_PRIMARY },
  prefix: { flexDirection: "row", alignItems: "center", gap: 6, paddingRight: 12, height: 48 },
  flag: { fontSize: 18 },
  prefixCode: { fontFamily: "DMSans_700Bold", fontSize: 15, color: TEXT_DARK },
  divider: { width: 1.5, height: 20, backgroundColor: BORDER, marginLeft: 4 },
  phoneInput: { flex: 1, height: 48, paddingHorizontal: 12, fontSize: 16, fontFamily: "DMSans_400Regular", color: TEXT_DARK, letterSpacing: 0.5 },
  errorMsg: { fontFamily: "DMSans_400Regular", fontSize: 12, color: "#d64545", marginTop: -18, marginBottom: 14 },
  btnOTP: { width: "100%", height: 54, backgroundColor: GREEN_PRIMARY, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 20, elevation: 6 },
  btnLoading: { opacity: 0.8 },
  btnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnText: { fontFamily: "DMSans_700Bold", color: "#fff", fontSize: 16, letterSpacing: 0.3 },
  btnArrow: { color: "#fff", fontSize: 18, fontWeight: "700" },
  signupRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  signupText: { fontFamily: "DMSans_400Regular", fontSize: 14, color: TEXT_MID },
  signupLink: { fontFamily: "DMSans_700Bold", fontSize: 14, color: GREEN_PRIMARY },
  footer: { alignItems: "center", gap: 6, marginTop: "auto", paddingTop: 16 },
  secureRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  shieldEmoji: { fontSize: 13 },
  secureText: { fontFamily: "DMSans_400Regular", fontSize: 13, color: TEXT_LIGHT, fontStyle: "italic" },
});
