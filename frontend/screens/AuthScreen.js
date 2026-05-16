import React, { useState } from "react";
import { View, TextInput, Button, Text, StyleSheet } from "react-native";

export default function AuthScreen({ navigation }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOTP = async () => {
    // TODO: Call API /api/auth/send-otp
    console.log("OTP sent to", phone);
    setOtpSent(true);
  };

  const handleVerifyOTP = async () => {
    // TODO: Call API /api/auth/verify-otp
    console.log("OTP verified:", otp);
    navigation.navigate("RoleSelection");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login/Signup</Text>
      <TextInput
        placeholder="Phone number (e.g., 03001234567)"
        value={phone}
        onChangeText={setPhone}
        editable={!otpSent}
        style={styles.input}
      />
      {!otpSent ? (
        <Button title="Send OTP" onPress={handleSendOTP} />
      ) : (
        <>
          <TextInput
            placeholder="Enter OTP"
            value={otp}
            onChangeText={setOtp}
            style={styles.input}
          />
          <Button title="Verify" onPress={handleVerifyOTP} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderBottomWidth: 1,
    marginBottom: 20,
    padding: 10,
  },
});
