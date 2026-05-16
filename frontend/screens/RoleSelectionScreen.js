import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect, Circle, Polyline } from "react-native-svg";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { DMSerifDisplay_400Regular } from "@expo-google-fonts/dm-serif-display";

const { width } = Dimensions.get("window");

// Icons
const IconArrowLeft = ({ color = "#065F46", size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M19 12H5M12 19l-7-7 7-7" />
  </Svg>
);

const IconArrowRight = ({ color = "white", size = 34 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M5 12h14M12 5l7 7-7 7" />
  </Svg>
);

const IconBriefcase = ({ color = "#065F46", size = 34 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <Path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </Svg>
);

const IconWrench = ({ color = "#065F46", size = 34 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </Svg>
);

const IconCheck = ({ color = "white", bgColor = "#065F46", size = 26 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="10" fill={bgColor} />
    <Polyline points="16 9 11 14 8 11" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function RoleSelectionScreen({ navigation }) {
  const [selectedRole, setSelectedRole] = useState("buyer");
  const insets = useSafeAreaInsets();

  let [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
  });

  if (!fontsLoaded) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <IconArrowLeft />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Setup Profile</Text>

          <View style={styles.headerRight}>
            <Text style={styles.stepText}>Step 1 of 2</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: "50%" }]} />
            </View>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Heading */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Welcome to Karigar</Text>
          <Text style={styles.subtitle}>
            Choose how you want to use the platform today.
          </Text>
        </View>

        {/* Role Cards */}
        <View style={styles.cardsContainer}>
          {/* Buyer */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setSelectedRole("buyer")}
            style={[
              styles.card,
              selectedRole === "buyer" ? styles.cardSelected : styles.cardUnselected,
            ]}
          >
            {selectedRole === "buyer" && (
              <View style={styles.checkIcon}>
                <IconCheck />
              </View>
            )}

            <View style={styles.cardIconBox}>
              <View
                style={[
                  styles.iconBackground,
                  selectedRole === "buyer" ? styles.iconBgSelected : styles.iconBgUnselected,
                ]}
              >
                <IconBriefcase color="#065F46" />
              </View>
            </View>

            <Text style={styles.cardTitle}>I want to hire</Text>
            <Text style={styles.cardRole}>(Buyer)</Text>
          </TouchableOpacity>

          {/* Seller */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setSelectedRole("seller")}
            style={[
              styles.card,
              selectedRole === "seller" ? styles.cardSelected : styles.cardUnselected,
            ]}
          >
            {selectedRole === "seller" && (
              <View style={styles.checkIcon}>
                <IconCheck />
              </View>
            )}

            <View style={styles.cardIconBox}>
              <View
                style={[
                  styles.iconBackground,
                  selectedRole === "seller" ? styles.iconBgSelected : styles.iconBgUnselected,
                ]}
              >
                <IconWrench color="#065F46" />
              </View>
            </View>

            <Text style={styles.cardTitle}>I want to work</Text>
            <Text style={styles.cardRole}>(Seller)</Text>
          </TouchableOpacity>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (selectedRole === "seller") {
              navigation.navigate("SellerProfileSetup");
            } else {
              navigation.navigate("ProfileSetup", { role: "buyer" });
            }
          }}
          style={styles.continueButton}
        >
          <Text style={styles.continueText}>Continue</Text>
          <IconArrowRight />
        </TouchableOpacity>


      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8F7",
  },
  header: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 20,
    color: "#064E3B",
    marginLeft: 10,
    flex: 1,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  stepText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
    color: "#374151",
    marginBottom: 4,
  },
  progressBar: {
    width: 80,
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#065F46",
    borderRadius: 3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 60,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 36,
    color: "#111827",
    textAlign: "center",
    lineHeight: 44,
  },
  subtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 18,
    color: "#4B5563",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 28,
    paddingHorizontal: 10,
  },
  cardsContainer: {
    flexDirection: "row",
    gap: 15,
    marginBottom: 40,
  },
  card: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 24,
    borderWidth: 2,
    padding: 20,
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: "#065F46",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardSelected: {
    borderColor: "#065F46",
  },
  cardUnselected: {
    borderColor: "#D1D5DB",
  },
  checkIcon: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  cardIconBox: {
    marginBottom: 20,
  },
  iconBackground: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBgSelected: {
    backgroundColor: "#ECFDF5",
  },
  iconBgUnselected: {
    backgroundColor: "#F3F4F6",
  },
  cardTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
    color: "#111827",
    textAlign: "center",
  },
  cardRole: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  continueButton: {
    backgroundColor: "#065F46",
    height: 72,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#065F46",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  continueText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 22,
    color: "white",
  },
});

