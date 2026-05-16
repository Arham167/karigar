import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AuthScreen from "./screens/AuthScreen";
import RoleSelectionScreen from "./screens/RoleSelectionScreen";
import ProfileSetupScreen from "./screens/ProfileSetupScreen";
import MapScreen from "./screens/MapScreen";
import SellerDashboard from "./screens/SellerDashboard";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Auth">
        <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} options={{ title: 'Select Your Role' }} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} options={{ title: 'Setup Profile' }} />
        <Stack.Screen name="Map" component={MapScreen} options={{ title: 'Find Services' }} />
        <Stack.Screen name="SellerDashboard" component={SellerDashboard} options={{ title: 'Seller Dashboard' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
