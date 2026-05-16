import React, { useState } from "react";
import { View, TextInput, Button, Text, StyleSheet, ScrollView } from "react-native";

export default function ProfileSetupScreen({ navigation, route }) {
  const { role } = route.params || { role: 'buyer' };
  const [name, setName] = useState("");
  const [cnic, setCnic] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [specialization, setSpecialization] = useState("");

  const handleDone = async () => {
    // TODO: Call API /api/user/profile
    console.log("Profile created:", { role, name, cnic, businessName, specialization });
    navigation.navigate(role === "buyer" ? "Map" : "SellerDashboard");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile Setup ({role})</Text>
      <TextInput
        placeholder="Full name"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />
      <TextInput
        placeholder="CNIC"
        value={cnic}
        onChangeText={setCnic}
        style={styles.input}
      />
      {role === "seller" && (
        <>
          <TextInput
            placeholder="Business name"
            value={businessName}
            onChangeText={setBusinessName}
            style={styles.input}
          />
          <TextInput
            placeholder="Specialization (e.g. AC Repair)"
            value={specialization}
            onChangeText={setSpecialization}
            style={styles.input}
          />
        </>
      )}
      <Button title="Done" onPress={handleDone} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
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
