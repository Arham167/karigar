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
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../utils/supabase";
import { useAuthStore } from "../store/authStore";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { DMSerifDisplay_400Regular } from "@expo-google-fonts/dm-serif-display";

const { width } = Dimensions.get("window");

// Icons
const IconArrowLeft = ({ color = "#065F46", size = 30 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M19 12H5M12 19l-7-7 7-7" />
  </Svg>
);

const IconCamera = ({ color = "white", size = 30 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <Circle cx="12" cy="13" r="4" />
  </Svg>
);

const IconUser = ({ color = "#9CA3AF", size = 44 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <Circle cx="12" cy="7" r="4" />
  </Svg>
);

const IconIdCard = ({ color = "#D1D5DB", size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="4" width="18" height="16" rx="2" />
    <Path d="M7 8h10M7 12h10M7 16h6" />
  </Svg>
);

const IconShieldCheck = ({ color = "#A16207", size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <Path d="m9 12 2 2 4-4" />
  </Svg>
);

const IconBadgeCheck = ({ color = "white", size = 32, strokeWidth = 2.5, opacity = 1 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ opacity }}>
    <Path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
    <Path d="m9 12 2 2 4-4" />
  </Svg>
);

const IconX = ({ color = "white", size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);

export default function ProfileSetupScreen({ navigation, route }) {
  const { role } = route.params || { role: 'buyer' };
  const insets = useSafeAreaInsets();
  const phoneNumber = useAuthStore((state) => state.phoneNumber);
  
  const [fullName, setFullName] = useState("");
  const [cnic, setCnic] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

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
    const formatted = formatCNIC(text);
    setCnic(formatted);
  };

  let [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
  });

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access gallery is required!');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      alert("Error picking image: " + error.message);
    }
  };

  const removeImage = () => {
    setImage(null);
  };

  const uploadImage = async (uri) => {
    try {
      const fileExt = uri.split('.').pop().toLowerCase() || 'jpg';
      const mimeType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
      const safePhone = (phoneNumber || 'user').replace(/[^0-9]/g, '');
      const fileName = `${safePhone}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      console.log('Uploading via FormData:', filePath);

      // Create FormData - This is the "Native" way for React Native
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: fileName,
        type: mimeType,
      });

      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, formData, {
          cacheControl: '3600',
          upsert: true,
          contentType: mimeType,
        });

      if (uploadError) {
        console.error('Supabase upload error details:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Final uploadImage error:', error);
      throw new Error("Upload failed. Please ensure the 'avatars' bucket exists in Supabase and is Public.");
    }
  };

  const handleComplete = async () => {
    if (!fullName.trim() || !cnic.trim()) {
      alert("Full Name and CNIC are required.");
      return;
    }

    if (!phoneNumber) {
      alert("Session expired. Please sign up again.");
      navigation.navigate("Signup");
      return;
    }

    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("User session not found. Please log in again.");

      let uploadedUrl = null;
      if (image) {
        uploadedUrl = await uploadImage(image);
      }

      // Update or Create the profiles table (Atomic Upsert)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: fullName,
          cnic: cnic,
          profile_image_url: uploadedUrl,
          role: role,
          phone_number: user.phone
        });

      if (profileError) throw profileError;

      // If seller, handle providers table
      if (role === "seller") {
        const { error: providerError } = await supabase
          .from('providers')
          .insert([{
            user_id: user.id,
            business_name: businessName,
            specialization: specialization,
            profile_image_url: uploadedUrl
          }]);
        
        if (providerError) throw providerError;
      }

      navigation.navigate(role === "buyer" ? "Map" : "SellerDashboard");
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
        {/* Heading */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            Complete your {role === "buyer" ? "Buyer" : "Seller"} profile
          </Text>
          <Text style={styles.subtitle}>
            Please provide your details to start {role === "buyer" ? "hiring trusted local Karigars" : "offering your services"}.
          </Text>
        </View>

        {/* Profile Upload */}
        <View style={styles.profileUploadContainer}>
          <View style={styles.profileCircle}>
            <View style={styles.innerCircle}>
              {image ? (
                <Image source={{ uri: image }} style={styles.selectedImage} resizeMode="cover" />
              ) : (
                <IconUser size={60} />
              )}
            </View>
            
            {!image ? (
              <TouchableOpacity 
                activeOpacity={0.9} 
                style={styles.cameraButton}
                onPress={pickImage}
              >
                <IconCamera />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                activeOpacity={0.9} 
                style={[styles.cameraButton, { backgroundColor: '#EF4444' }]}
                onPress={removeImage}
              >
                <IconX color="white" size={24} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={image ? removeImage : pickImage}>
            <Text style={[styles.uploadText, image && { color: '#EF4444' }]}>
              {image ? "Remove Photo" : "Upload Profile Picture (Optional)"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                placeholder="e.g. Ahmed Khan"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
              />
              <IconUser size={28} color="#D1D5DB" />
            </View>
          </View>

          {/* CNIC */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>CNIC Number</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                placeholder="00000-0000000-0"
                placeholderTextColor="#9CA3AF"
                style={[styles.input, { letterSpacing: 1.5 }]}
                keyboardType="numeric"
                value={cnic}
                onChangeText={handleCNICChange}
                maxLength={15}
              />
              <IconIdCard />
            </View>
          </View>

          {/* Seller Fields */}
          {role === "seller" && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Business Name</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    placeholder="e.g. Khan AC Services"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                    value={businessName}
                    onChangeText={setBusinessName}
                  />
                  <IconBriefcase color="#D1D5DB" size={28} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Specialization</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    placeholder="e.g. Electrician, Plumber"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                    value={specialization}
                    onChangeText={setSpecialization}
                  />
                  <IconBadgeCheck color="#D1D5DB" size={28} />
                </View>
              </View>
            </>
          )}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconBox}>
            <IconShieldCheck />
          </View>
          <Text style={styles.infoText}>
            Your CNIC is required for identity verification and helps maintain a trusted hiring experience for both customers and Karigars.
          </Text>
        </View>

        {/* Safe Hiring Card */}
        <LinearGradient
          colors={["#065F46", "#047857"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientCard}
        >
          <View style={styles.gradientCardContent}>
            <Text style={styles.gradientTitle}>Safe Hiring</Text>
            <Text style={styles.gradientSubtitle}>
              Verified {role === "buyer" ? "buyers" : "sellers"} receive faster responses and better quality service from trusted professionals.
            </Text>
          </View>
          <View style={styles.gradientIconContainer}>
            <IconBadgeCheck size={90} strokeWidth={1.8} opacity={0.2} />
          </View>
        </LinearGradient>

        {/* Bottom Spacer */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomCta, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleComplete}
          style={[styles.completeButton, loading && { opacity: 0.8 }]}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
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

// Additional Icon for Seller
const IconBriefcase = ({ color = "#065F46", size = 34 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <Path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </Svg>
);


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8F7",
  },
  header: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    zIndex: 20,
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
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 22,
    color: "#111827",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  stepText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
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
  titleContainer: {
    marginBottom: 40,
  },
  title: {
    fontFamily: "DMSans_700Bold",
    fontSize: 42,
    lineHeight: 48,
    color: "#111827",
  },
  subtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 20,
    lineHeight: 32,
    color: "#4B5563",
    marginTop: 15,
  },
  profileUploadContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  profileCircle: {
    width: 176,
    height: 176,
    borderRadius: 88,
    borderWidth: 3,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  innerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  selectedImage: {
    width: "100%",
    height: "100%",
  },
  cameraButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
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
  uploadText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 18,
    color: "#6B7280",
    marginTop: 20,
  },
  formContainer: {
    marginBottom: 30,
    gap: 30,
  },
  inputGroup: {
    marginBottom: 10,
  },
  label: {
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
    color: "#1F2937",
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#D1D5DB",
    paddingBottom: 12,
  },
  input: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 22,
    color: "#111827",
    padding: 0,
  },
  infoCard: {
    backgroundColor: "white",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    flexDirection: "row",
    gap: 15,
    marginBottom: 30,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  infoIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FEFCE8",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoText: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
    lineHeight: 24,
    color: "#374151",
  },
  gradientCard: {
    borderRadius: 32,
    padding: 28,
    position: "relative",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#065F46",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.15,
        shadowRadius: 30,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  gradientCardContent: {
    maxWidth: "75%",
    zIndex: 1,
  },
  gradientTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 34,
    lineHeight: 40,
    color: "white",
  },
  gradientSubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 18,
    lineHeight: 28,
    color: "#ECFDF5",
    marginTop: 15,
  },
  gradientIconContainer: {
    position: "absolute",
    right: -10,
    bottom: -10,
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
    backgroundColor: "#065F46",
    height: 72,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 15,
    ...Platform.select({
      ios: {
        shadowColor: "#065F46",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  completeButtonText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 24,
    color: "white",
  },
});
