import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function SellerDashboard() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Seller Dashboard</Text>
      <Text>Your active bookings and earnings will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
});
