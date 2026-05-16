import React, { useState } from "react";
import { View, Button, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function RoleSelectionScreen({ navigation }) {
  const [role, setRole] = useState("buyer");

  const handleContinue = () => {
    navigation.navigate("ProfileSetup", { role });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Role</Text>
      
      <TouchableOpacity 
        style={[styles.roleOption, role === 'buyer' && styles.selected]} 
        onPress={() => setRole('buyer')}
      >
        <Text>I'm a Buyer (looking for services)</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.roleOption, role === 'seller' && styles.selected]} 
        onPress={() => setRole('seller')}
      >
        <Text>I'm a Seller (providing services)</Text>
      </TouchableOpacity>

      <Button title="Continue" onPress={handleContinue} />
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
  roleOption: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
  },
  selected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  }
});
