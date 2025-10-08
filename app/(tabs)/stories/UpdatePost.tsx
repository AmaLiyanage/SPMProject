import { Feather, FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Audio, ResizeMode, Video } from "expo-av";
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
  const [mediaType, setMediaType] = useState<"image" | "video" | "audio" | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<string>("");

  const videoRef = useRef<Video>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!storyId) return Alert.alert("Error", "No story selected");
    fetchStory();

    return () => {
      if (sound) sound.unloadAsync();
      if (recording) recording.stopAndUnloadAsync();
    };
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
        setMediaType(data.type);
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

  // ---------- START / STOP RECORDING ----------
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") return Alert.alert("Permission required");

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync({
        android: { extension: '.m4a', outputFormat: Audio.AndroidOutputFormat.MPEG_4, audioEncoder: Audio.AndroidAudioEncoder.AAC, sampleRate: 44100, numberOfChannels: 2, bitRate: 128000 },
        ios: { extension: '.m4a', outputFormat: Audio.IOSOutputFormat.MPEG4AAC, audioQuality: Audio.IOSAudioQuality.HIGH, sampleRate: 44100, numberOfChannels: 2, bitRate: 128000 },
        web: { mimeType: 'audio/webm', bitsPerSecond: 128000 },
      });

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingStatus("Recording...");
      await newRecording.startAsync();
    } catch (error: any) {
      console.log("Recording failed:", error);
      Alert.alert("Recording failed", error.message);
      setIsRecording(false);
      setRecordingStatus("");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      setRecordingStatus("Processing...");
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        setMediaUri(uri);
        setMediaType("audio");
        setRecordingStatus("Recording saved");
      }
      setRecording(null);
      setIsRecording(false);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch (error: any) {
      console.log("Stop recording error:", error);
      Alert.alert("Stop failed", error.message);
      setRecording(null);
      setIsRecording(false);
      setRecordingStatus("");
    }
  };

  // ---------- PLAY AUDIO ----------
  const playAudio = async () => {
    if (!mediaUri) return;
    try {
      if (sound) { await sound.stopAsync(); await sound.unloadAsync(); setSound(null); setIsPlaying(false); return; }

      const { sound: newSound } = await Audio.Sound.createAsync({ uri: mediaUri });
      setSound(newSound);
      setIsPlaying(true);
      await newSound.playAsync();
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          setSound(null);
        }
      });
    } catch (error: any) {
      console.log("Playback error:", error);
      Alert.alert("Playback failed", error.message);
    }
  };

  const removeMedia = () => {
    setMediaUri(null);
    setMediaType(null);
    if (sound) { sound.unloadAsync(); setSound(null); setIsPlaying(false); }
    setRecordingStatus("");
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
            <TouchableOpacity style={[styles.mediaButton, isRecording && styles.recordingButton]} onPress={isRecording ? stopRecording : startRecording} disabled={isUploading}>
              <FontAwesome name={isRecording ? "stop-circle" : "microphone"} size={24} color={isRecording ? "#FF3B30" : "#007AFF"} />
              <Text style={[styles.mediaButtonText, isRecording && styles.recordingText]}>{isRecording ? "Stop Recording" : "Record Audio"}</Text>
            </TouchableOpacity>
          </View>
          {recordingStatus ? <Text style={styles.recordingStatus}>{recordingStatus}</Text> : null}
        </View>

        {/* Media Preview */}
        {mediaUri && (
          <View style={styles.card}>
            <View style={styles.mediaHeader}>
              <Text style={styles.label}>{mediaType === "image" ? "Image Preview" : mediaType === "video" ? "Video Preview" : "Audio Recording"}</Text>
              <TouchableOpacity onPress={removeMedia}><Feather name="x-circle" size={24} color="#8E8E93" /></TouchableOpacity>
            </View>
            {mediaType === "image" && <Image source={{ uri: mediaUri }} style={styles.imagePreview} />}
            {mediaType === "video" && <Video ref={videoRef} source={{ uri: mediaUri }} style={styles.videoPreview} useNativeControls resizeMode={ResizeMode.CONTAIN} />}
            {mediaType === "audio" && (
              <View style={styles.audioContainer}>
                <TouchableOpacity style={[styles.playButton, isPlaying && styles.playingButton]} onPress={playAudio}>
                  <MaterialIcons name={isPlaying ? "pause" : "play-arrow"} size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.audioText}>{isPlaying ? "Playing..." : "Tap to play your recording"}</Text>
              </View>
            )}
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

// ---------- STYLES ----------
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
  recordingButton: { borderColor: "#FF3B30", backgroundColor: "#FFEEED" },
  recordingText: { color: "#FF3B30" },
  recordingStatus: { marginTop: 8, textAlign: "center", color: "#666", fontSize: 14 },
  mediaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  imagePreview: { width: "100%", height: 200, borderRadius: 8 },
  videoPreview: { width: "100%", height: 200, borderRadius: 8 },
  audioContainer: { flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: "#F8F8F8", borderRadius: 8 },
  playButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#007AFF", justifyContent: "center", alignItems: "center", marginRight: 16 },
  playingButton: { backgroundColor: "#FF9500" },
  audioText: { color: "#666", flex: 1 },
  uploadButton: { flexDirection: "row", backgroundColor: "#007AFF", padding: 16, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 8, marginBottom: 30 },
  uploadButtonDisabled: { backgroundColor: "#C7C7CC" },
  uploadButtonText: { color: "white", fontWeight: "bold", fontSize: 18, marginLeft: 8 },
});
