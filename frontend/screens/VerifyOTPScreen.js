import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { useFonts, DMSans_400Regular, DMSans_700Bold } from "@expo-google-fonts/dm-sans";
import { supabase } from "../utils/supabase";
import { useAuthStore } from "../store/authStore";

const IconLock = ({ color = "#1d6645", size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

export default function VerifyOTPScreen({ navigation, route }) {
  const { phoneNumber } = route.params;
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    if (code.length < 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: code,
        type: 'sms',
      });

      if (verifyError) throw verifyError;

      // Check if profile exists and is complete
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      // Save phone to store for Profile Setup
      useAuthStore.getState().setPhoneNumber(phoneNumber);

      if (profile && profile.role && profile.name) {
        // Setup already complete, go to dashboard
        console.log("Profile complete, redirecting to dashboard:", profile.role);
        navigation.reset({
          index: 0,
          routes: [{ name: profile.role === "buyer" ? "Map" : "SellerDashboard" }],
        });
      } else {
        // Profile doesn't exist or is incomplete
        if (!profile) {
          // Atomic cleanup: Ensure the profile row exists
          await supabase.from('profiles').upsert({
            id: data.user.id,
            phone_number: phoneNumber
          });
        }
        
        console.log("Profile incomplete, moving to Role Selection");
        navigation.navigate("RoleSelection");
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError("Invalid code. Please use the code you set in Supabase (e.g. 123456).");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <IconLock />
          </View>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>Enter the 6-digit code you set in Supabase for {phoneNumber}</Text>
          
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="000000"
            placeholderTextColor="#a0b8aa"
            keyboardType="number-pad"
            maxLength={6}
            autoFocus={true}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity 
            style={[styles.button, loading && { opacity: 0.7 }]} 
            onPress={handleVerify} 
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Verify & Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.resendButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.resendText}>Wrong number? Go back</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f4f7f5" },
  container: { flex: 1 },
  content: { flex: 1, padding: 30, alignItems: "center", justifyContent: "center" },
  iconContainer: {
    width: 120,
    height: 120,
    backgroundColor: "white",
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    marginBottom: 40,
  },
  title: { 
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 32, 
    fontWeight: "bold", 
    color: "#111a14",
    marginBottom: 10 
  },
  subtitle: { 
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 16, 
    color: "#4b5e52", 
    textAlign: "center", 
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20
  },
  input: { 
    width: "100%", 
    height: 70, 
    backgroundColor: "white", 
    borderRadius: 20, 
    textAlign: "center", 
    fontSize: 32, 
    fontWeight: "bold", 
    color: "#1d6645",
    letterSpacing: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  button: { 
    width: "100%", 
    height: 60, 
    backgroundColor: "#1d6645", 
    borderRadius: 18, 
    alignItems: "center", 
    justifyContent: "center", 
    marginTop: 30,
    elevation: 5,
    shadowColor: "#1d6645",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  buttonText: { color: "white", fontSize: 18, fontWeight: "bold", letterSpacing: 0.5 },
  error: { color: "#d64545", marginTop: 15, textAlign: "center", fontSize: 14 },
  resendButton: { marginTop: 25 },
  resendText: { color: "#4b5e52", fontSize: 14, textDecorationLine: "underline" }
});
