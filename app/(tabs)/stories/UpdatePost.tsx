import { Feather, Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getAuth } from "firebase/auth";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { db, storage } from "../../../config/firebase";

const UpdatePost = () => {
  const auth = getAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const storyId = params.storyId as string;

  const [title, setTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const videoRef = useRef<Video>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!storyId) return Alert.alert("Error", "No story selected");
    fetchStory();
  }, [storyId]);

  // ---------- FETCH EXISTING STORY ----------
  const fetchStory = async () => {
    try {
      const storyDoc = await getDoc(doc(db, "stories", storyId));
      if (!storyDoc.exists()) return Alert.alert("Error", "Story not found");

      const data = storyDoc.data();
      setTitle(data?.title || "");
      setTextContent(data?.text || "");
      if (data?.type && data?.content) {
        setMediaType(data.type as "image" | "video");
        setMediaUri(data.content);
      }
    } catch (error: any) {
      console.log("Fetch story error:", error);
      Alert.alert("Error", error.message);
    }
  };

  // ---------- PICK IMAGE/VIDEO ----------
  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return Alert.alert("Permission required");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 1,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets.length > 0) {
      const picked = result.assets[0];
      setMediaUri(picked.uri);
      setMediaType(picked.type as "image" | "video");
    }
  };

  const removeMedia = () => {
    setMediaUri(null);
    setMediaType(null);
  };

  const cancelUpdate = () => {
    Alert.alert("Cancel Update", "Discard changes?", [
      { text: "No", style: "cancel" },
      { text: "Yes", style: "destructive", onPress: () => router.back() }
    ]);
  };

  // ---------- UPDATE STORY ----------
  const updateStory = async () => {
    if (!storyId) return Alert.alert("Error", "No story selected");
    if (!textContent && !mediaUri) return Alert.alert("Error", "Add text or media");

    try {
      setIsUploading(true);
      let contentUrl = mediaUri;

      // Upload media if new file selected
      if (mediaUri && !mediaUri.startsWith("https://")) {
        const fileExt = mediaUri.split(".").pop();
        const storageRef = ref(storage, `users/${auth.currentUser?.uid}/${Date.now()}.${fileExt}`);
        const response = await fetch(mediaUri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        contentUrl = await getDownloadURL(storageRef);
      }

      await updateDoc(doc(db, "stories", storyId), {
        title: title || "",
        text: textContent || null,
        type: mediaType || "text",
        content: contentUrl || null,
        status: "published",
        updatedAt: serverTimestamp(),
      });

      Alert.alert("Success", "Story updated!");
      router.back();
    } catch (error: any) {
      console.log("Update failed:", error);
      Alert.alert("Update failed", error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 120 }} style={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={router.back} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={28} color="#8B5CF6" />
          </TouchableOpacity>
          <Text style={styles.header}>Update Story</Text>
        </View>

        {/* Title */}
        <View style={styles.card}>
          <Text style={styles.label}>Title (Optional)</Text>
          <TextInput style={styles.input} placeholder="Story title..." value={title} onChangeText={setTitle} />
        </View>

        {/* Text */}
        <View style={styles.card}>
          <Text style={styles.label}>Story</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Share your story..." value={textContent} onChangeText={setTextContent} multiline numberOfLines={5} />
        </View>

        {/* Media Buttons */}
        <View style={styles.card}>
          <Text style={styles.label}>Add Media</Text>
          <View style={styles.mediaButtonsContainer}>
            <TouchableOpacity style={styles.mediaButton} onPress={pickMedia}>
              <Ionicons name="image-outline" size={24} color="#007AFF" />
              <Text style={styles.mediaButtonText}>Photo/Video</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Media Preview */}
        {mediaUri && (
          <View style={styles.card}>
            <View style={styles.mediaHeader}>
              <Text style={styles.label}>{mediaType === "image" ? "Image Preview" : "Video Preview"}</Text>
              <TouchableOpacity onPress={removeMedia}><Feather name="x-circle" size={24} color="#8E8E93" /></TouchableOpacity>
            </View>
            {mediaType === "image" && <Image source={{ uri: mediaUri }} style={styles.imagePreview} />}
            {mediaType === "video" && <Video ref={videoRef} source={{ uri: mediaUri }} style={styles.videoPreview} useNativeControls resizeMode={ResizeMode.CONTAIN} />}
          </View>
        )}

        {/* Buttons */}
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <TouchableOpacity style={[styles.uploadButton, { flex: 0.48, backgroundColor: "#FF3B30" }]} onPress={cancelUpdate} disabled={isUploading}>
            <Feather name="x-circle" size={24} color="white" />
            <Text style={styles.uploadButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.uploadButton, { flex: 0.48 }, (!textContent && !mediaUri) && styles.uploadButtonDisabled]} onPress={updateStory} disabled={!textContent && !mediaUri || isUploading}>
            {isUploading ? <ActivityIndicator color="white" /> : <Ionicons name="cloud-upload-outline" size={24} color="white" />}
            {!isUploading && <Text style={styles.uploadButtonText}>Update Story</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default UpdatePost;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 16 , marginTop: 30 },
  headerContainer: { flexDirection: "row", alignItems: "center", marginBottom: 20 , marginTop: 20 },
  header: { fontSize: 28, fontWeight: "bold", color: "#8B5CF6",marginLeft: 55,marginTop: 20 },
  card: { backgroundColor: "white", borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  label: { fontWeight: "600", marginBottom: 8, color: "#333", fontSize: 16 },
  input: { borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: "#FAFAFA" },
  textArea: { height: 120, textAlignVertical: "top" },
  mediaButtonsContainer: { flexDirection: "row", justifyContent: "space-between" },
  mediaButton: { flexDirection: "row", alignItems: "center", padding: 12, borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 8, backgroundColor: "#FAFAFA", flex: 1, marginHorizontal: 4, justifyContent: "center" },
  mediaButtonText: { marginLeft: 8, color: "#007AFF", fontWeight: "500" },
  mediaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  imagePreview: { width: "100%", height: 200, borderRadius: 8 },
  videoPreview: { width: "100%", height: 200, borderRadius: 8 },
  uploadButton: { flexDirection: "row", backgroundColor: "#007AFF", padding: 16, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 8, marginBottom: 30 },
  uploadButtonDisabled: { backgroundColor: "#C7C7CC" },
  uploadButtonText: { color: "white", fontWeight: "bold", fontSize: 18, marginLeft: 8 },
});
