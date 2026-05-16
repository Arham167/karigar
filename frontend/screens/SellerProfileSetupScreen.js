import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect, Circle, Polyline, G } from "react-native-svg";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../utils/supabase";
import { useAuthStore } from "../store/authStore";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";

const { width } = Dimensions.get("window");

// Manual SVG Icons (More stable in Expo than lucide-react-native)
const IconArrowLeft = ({ color = "#065F46", size = 30 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M19 12H5M12 19l-7-7 7-7" />
  </Svg>
);

const IconCamera = ({ color = "white", size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <Circle cx="12" cy="13" r="4" />
  </Svg>
);

const IconUser = ({ color = "#9CA3AF", size = 42 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <Circle cx="12" cy="7" r="4" />
  </Svg>
);

const IconStore = ({ color = "#D1D5DB", size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
    <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <Path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
    <Path d="M2 7h20" />
    <Path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" />
  </Svg>
);

const IconBriefcase = ({ color = "#D1D5DB", size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
    <Path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </Svg>
);

const IconMapPin = ({ color = "#D1D5DB", size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <Circle cx="12" cy="10" r="3" />
  </Svg>
);

const IconIdCard = ({ color = "#D1D5DB", size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect width="18" height="14" x="3" y="5" rx="2" />
    <Path d="M10 10H5v5h5v-5z" />
    <Path d="M14 10h5" />
    <Path d="M14 14h5" />
  </Svg>
);

const IconShieldAlert = ({ color = "#A16207", size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <Path d="M12 8v4" />
    <Path d="M12 16h.01" />
  </Svg>
);

const IconBadgeCheck = ({ color = "white", size = 30 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
    <Path d="m9 12 2 2 4-4" />
  </Svg>
);

export default function SellerProfileSetupScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const phoneNumber = useAuthStore((state) => state.phoneNumber);

  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [occupation, setOccupation] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [cnic, setCnic] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [shopImage, setShopImage] = useState(null);
  const [loading, setLoading] = useState(false);

  let [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const formatCNIC = (text) => {
    const cleaned = text.replace(/\D/g, "");
    let formatted = cleaned;
    if (cleaned.length > 5 && cleaned.length <= 12) {
      formatted = `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
    } else if (cleaned.length > 12) {
      formatted = `${cleaned.slice(0, 5)}-${cleaned.slice(5, 12)}-${cleaned.slice(12, 13)}`;
    }
    return formatted;
  };

  const handleCNICChange = (text) => {
    setCnic(formatCNIC(text));
  };

  const pickImage = async (type) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access gallery is required!');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'profile' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        if (type === 'profile') setProfileImage(result.assets[0].uri);
        else setShopImage(result.assets[0].uri);
      }
    } catch (error) {
      alert("Error picking image: " + error.message);
    }
  };

  const uploadImage = async (uri, folder) => {
    try {
      const fileExt = uri.split('.').pop().toLowerCase() || 'jpg';
      const mimeType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
      const safePhone = (phoneNumber || 'user').replace(/[^0-9]/g, '');
      const fileName = `${safePhone}_${folder}_${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: fileName,
        type: mimeType,
      });

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, formData, {
          cacheControl: '3600',
          upsert: true,
          contentType: mimeType,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleComplete = async () => {
    if (!profileImage) {
      alert("Please upload a front-facing profile picture.");
      return;
    }

    if (!fullName.trim() || !cnic.trim() || !occupation.trim()) {
      alert("Full Name, CNIC, and Occupation are required.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("User session not found.");

      let profileUrl = null;
      if (profileImage) profileUrl = await uploadImage(profileImage, 'avatars');

      let shopImageUrl = null;
      if (shopImage) shopImageUrl = await uploadImage(shopImage, 'shops');

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: fullName,
          cnic: cnic,
          profile_image_url: profileUrl,
          role: 'seller',
          phone_number: user.phone
        });

      if (profileError) throw profileError;

      const { error: providerError } = await supabase
        .from('providers')
        .insert([{
          user_id: user.id,
          business_name: businessName,
          specialization: occupation,
          profile_image_url: profileUrl,
          shop_image_url: shopImageUrl,
          shop_address: shopAddress
        }]);
      
      if (providerError) throw providerError;

      navigation.navigate("SellerDashboard");
    } catch (error) {
      alert("Error saving profile: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <IconArrowLeft />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Setup Profile</Text>
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.stepText}>Step 2 of 2</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: "100%" }]} />
            </View>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headingContainer}>
          <Text style={styles.title}>Complete your Seller profile</Text>
          <Text style={styles.subtitle}>
            Showcase your skills and start receiving trusted local work requests.
          </Text>
        </View>

        <View style={styles.profileUploadContainer}>
          <View style={styles.profileCircleWrapper}>
            <View style={styles.profileCircle}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <>
                  <IconUser size={42} />
                  <Text style={styles.profilePlaceholderText}>Front-facing picture</Text>
                </>
              )}
            </View>
            <TouchableOpacity 
              style={styles.cameraButton}
              onPress={() => pickImage('profile')}
            >
              <IconCamera />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formContainer}>
          <InputField
            label="Full Name"
            placeholder="e.g. Ahmad Hassan"
            value={fullName}
            onChangeText={setFullName}
            icon={<IconUser size={24} />}
          />

          <InputField
            label="Business Name"
            placeholder="e.g. Hassan Electric Works"
            value={businessName}
            onChangeText={setBusinessName}
            icon={<IconStore size={24} />}
          />

          <InputField
            label="Occupation"
            placeholder="e.g. Electrician, Plumber, etc."
            value={occupation}
            onChangeText={setOccupation}
            icon={<IconBriefcase size={24} />}
          />

          <InputField
            label="Shop Address"
            placeholder="e.g. Shop # 12, Main Market, Saddar"
            value={shopAddress}
            onChangeText={setShopAddress}
            icon={<IconMapPin size={24} />}
          />

          <InputField
            label="CNIC Number"
            placeholder="42101-XXXXXXX-X"
            value={cnic}
            onChangeText={handleCNICChange}
            keyboardType="numeric"
            maxLength={15}
            icon={<IconIdCard size={24} />}
          />
        </View>

        <View style={styles.shopUploadSection}>
          <Text style={styles.inputLabel}>Shop Image (Optional)</Text>
          <TouchableOpacity 
            style={styles.shopUploadButton}
            onPress={() => pickImage('shop')}
          >
            {shopImage ? (
              <Image source={{ uri: shopImage }} style={styles.shopImage} />
            ) : (
              <View style={styles.shopUploadPlaceholder}>
                <View style={styles.cameraIconBg}>
                  <IconCamera color="#065F46" size={32} />
                </View>
                <Text style={styles.shopUploadTitle}>Upload shop image</Text>
                <Text style={styles.shopUploadSubtitle}>Optional but recommended</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.verificationCard}>
          <View style={styles.verificationIconBg}>
            <IconShieldAlert />
          </View>
          <Text style={styles.verificationText}>
            Your information is verified against government records to help build trust, safety, and credibility with future customers.
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.bottomCta, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity 
          style={styles.completeButton}
          onPress={handleComplete}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text style={styles.completeButtonText}>Complete Setup</Text>
              <IconBadgeCheck />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InputField({ label, placeholder, icon, value, onChangeText, keyboardType, maxLength }) {
  return (
    <View style={styles.inputFieldContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          maxLength={maxLength}
        />
        {icon}
      </View>
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
  },
  headerContent: {
    height: 78,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
    color: "#064E3B",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  stepText: {
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
    color: "#374151",
    marginBottom: 4,
  },
  progressBar: {
    width: 96,
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
    paddingTop: 40,
  },
  headingContainer: {
    marginBottom: 56,
  },
  title: {
    fontSize: 48,
    lineHeight: 56,
    fontFamily: "DMSans_700Bold",
    color: "#111827",
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 20,
    fontSize: 20,
    lineHeight: 36,
    fontFamily: "DMSans_400Regular",
    color: "#4B5563",
  },
  profileUploadContainer: {
    alignItems: "center",
    marginBottom: 56,
  },
  profileCircleWrapper: {
    position: "relative",
  },
  profileCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 80,
  },
  profilePlaceholderText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "DMSans_500Medium",
    color: "#4B5563",
    textAlign: "center",
    marginTop: 8,
  },
  cameraButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#065F46",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#064E3B",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  formContainer: {
    gap: 32,
    marginBottom: 40,
  },
  inputFieldContainer: {},
  inputLabel: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "white",
    paddingHorizontal: 20,
    height: 72,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontFamily: "DMSans_400Regular",
    color: "#111827",
  },
  shopUploadSection: {
    marginBottom: 40,
  },
  shopUploadButton: {
    width: "100%",
    borderRadius: 30,
    borderWidth: 3,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    backgroundColor: "white",
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  shopImage: {
    width: "100%",
    height: 220,
  },
  shopUploadPlaceholder: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  cameraIconBg: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  shopUploadTitle: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
    color: "#1F2937",
  },
  shopUploadSubtitle: {
    marginTop: 8,
    fontSize: 18,
    color: "#6B7280",
    fontFamily: "DMSans_400Regular",
  },
  verificationCard: {
    borderRadius: 28,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 24,
    flexDirection: "row",
    gap: 16,
    marginBottom: 30,
  },
  verificationIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FEF9E7",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  verificationText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 28,
    fontFamily: "DMSans_400Regular",
    color: "#1F2937",
  },
  bottomCta: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  completeButton: {
    width: "100%",
    height: 72,
    borderRadius: 24,
    backgroundColor: "#065F46",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#064E3B",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  completeButtonText: {
    fontSize: 28,
    fontFamily: "DMSans_700Bold",
    color: "white",
  },
});
