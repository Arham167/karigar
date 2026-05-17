import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AuthScreen from "./screens/AuthScreen";
import SignupScreen from "./screens/SignupScreen";
import RoleSelectionScreen from "./screens/RoleSelectionScreen";
import ProfileSetupScreen from "./screens/ProfileSetupScreen";
import SellerProfileSetupScreen from "./screens/SellerProfileSetupScreen";
import VerifyOTPScreen from "./screens/VerifyOTPScreen";
import MapScreen from "./screens/MapScreen";
import SellerDashboard from "./screens/SellerDashboard";
import KarigarChat from "./screens/KarigarChat";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Auth">
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Signup" component={SignupScreen} options={{ headerShown: false }} />
          <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} options={{ headerShown: false }} />
          <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SellerProfileSetup" component={SellerProfileSetupScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Map" component={MapScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SellerDashboard" component={SellerDashboard} options={{ title: 'Seller Dashboard' }} />
          <Stack.Screen name="KarigarChat" component={KarigarChat} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
