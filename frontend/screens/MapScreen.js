import React, { useState } from "react";
import { View, TextInput, Button, Text, StyleSheet } from "react-native";
// import MapView, { Marker } from "react-native-maps"; // Requires setup

export default function MapScreen({ navigation }) {
  const [request, setRequest] = useState("");

  const handleFindServices = () => {
    console.log("Finding services for:", request);
    // Mock navigation to detail for now
    // navigation.navigate("ProviderDetail", { provider: { name: "Mock Provider" } });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>What service do you need?</Text>
        <TextInput
          placeholder="E.g., Mujhe kal subah G-13 mein AC technician chahiye"
          value={request}
          onChangeText={setRequest}
          style={styles.input}
        />
        <Button title="Find Services" onPress={handleFindServices} />
      </View>
      <View style={styles.mapPlaceholder}>
        <Text>Map goes here</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    elevation: 4,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
});
