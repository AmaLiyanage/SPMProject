import { Feather, FontAwesome, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Audio, ResizeMode, Video } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db, storage } from "../../../config/firebase";

// AssemblyAI config
const API_CONFIG = {
  ASSEMBLYAI: {
    API_KEY: "a046c13c374d4c0394ee0a99c5a0d0e2",
    UPLOAD_ENDPOINT: "https://api.assemblyai.com/v2/upload",
    TRANSCRIPT_ENDPOINT: "https://api.assemblyai.com/v2/transcript",
  },
};

const CreatePost = () => {
  const auth = getAuth();
  const router = useRouter();
  const userId = auth.currentUser?.uid;

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
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState<string>("");

  const videoRef = useRef<Video>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!userId) Alert.alert("Error", "User not logged in");
    return () => {
      cleanup();
    };
  }, [userId]);

  const cleanup = async () => {
    if (sound) await sound.unloadAsync();
    if (recording) await recording.stopAndUnloadAsync();
  };

  // ---------- ASSEMBLYAI SPEECH-TO-TEXT ----------
  const uploadAudioToAssemblyAI = async (audioUri: string): Promise<string> => {
    const response = await fetch(audioUri);
    const audioBlob = await response.blob();
    const uploadResponse = await fetch(API_CONFIG.ASSEMBLYAI.UPLOAD_ENDPOINT, {
      method: "POST",
      headers: { authorization: API_CONFIG.ASSEMBLYAI.API_KEY },
      body: audioBlob,
    });
    if (!uploadResponse.ok) throw new Error(`Upload failed: ${uploadResponse.status}`);
    const uploadResult = await uploadResponse.json();
    return uploadResult.upload_url;
  };

  const startTranscription = async (audioUrl: string): Promise<string> => {
    const response = await fetch(API_CONFIG.ASSEMBLYAI.TRANSCRIPT_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: API_CONFIG.ASSEMBLYAI.API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({ audio_url: audioUrl, language_code: "en_us", punctuate: true, format_text: true }),
    });
    if (!response.ok) throw new Error(`Transcription request failed: ${response.status}`);
    const result = await response.json();
    return result.id;
  };

  const pollTranscriptionResult = async (transcriptId: string): Promise<string> => {
    const maxAttempts = 60;
    let attempts = 0;
    while (attempts < maxAttempts) {
      const response = await fetch(`${API_CONFIG.ASSEMBLYAI.TRANSCRIPT_ENDPOINT}/${transcriptId}`, {
        headers: { authorization: API_CONFIG.ASSEMBLYAI.API_KEY },
      });
      if (!response.ok) throw new Error(`Polling failed: ${response.status}`);
      const result = await response.json();
      if (result.status === "completed") return result.text || "";
      if (result.status === "error") throw new Error(result.error || "Transcription failed");
      setTranscriptionProgress(`Processing... (${attempts + 1}/${maxAttempts})`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      attempts++;
    }
    throw new Error("Transcription timed out");
  };

  const convertAudioToText = async () => {
    if (!mediaUri || mediaType !== "audio") return Alert.alert("No Audio", "Please record audio first");
    try {
      setIsTranscribing(true);
      setTranscriptionProgress("Uploading audio...");
      const audioUrl = await uploadAudioToAssemblyAI(mediaUri);
      setTranscriptionProgress("Starting transcription...");
      const transcriptId = await startTranscription(audioUrl);
      setTranscriptionProgress("Converting speech to text...");
      const transcriptionText = await pollTranscriptionResult(transcriptId);
      if (transcriptionText.trim()) {
        const newText = textContent ? `${textContent}\n\n${transcriptionText}` : transcriptionText;
        setTextContent(newText);
        setTranscriptionProgress("✅ Speech converted to text!");
        Alert.alert("Success", "Speech converted to text.", [{ text: "OK", onPress: () => setTranscriptionProgress("") }]);
      } else {
        Alert.alert("No Speech Detected", "Try recording again.");
        setTranscriptionProgress("");
      }
    } catch (error: any) {
      Alert.alert("Transcription Failed", error.message || "Please try again.");
      setTranscriptionProgress("");
    } finally {
      setIsTranscribing(false);
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

  // ---------- RECORD AUDIO ----------
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") return Alert.alert("Permission required");
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true, staysActiveInBackground: true });
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync({
        android: {
          extension: ".m4a",
          outputFormat: 2,
          audioEncoder: 3,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: ".m4a",
          audioQuality: 0,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        web: {
          mimeType: undefined,
          bitsPerSecond: undefined,
        },
      });
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingStatus("🎙️ Recording...");
      await newRecording.startAsync();
    } catch (error: any) {
      Alert.alert("Recording failed", error.message);
      setIsRecording(false);
      setRecordingStatus("");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      setRecordingStatus("Processing recording...");
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        setMediaUri(uri);
        setMediaType("audio");
        setRecordingStatus("✅ Recording saved! Convert to text.");
      }
      setRecording(null);
      setIsRecording(false);
    } catch (error: any) {
      Alert.alert("Stop failed", error.message);
      setRecording(null);
      setIsRecording(false);
      setRecordingStatus("");
    }
  };

  // ---------- REMOVE MEDIA ----------
  const removeMedia = () => {
    setMediaUri(null);
    setMediaType(null);
    setRecordingStatus("");
    setTranscriptionProgress("");
  };

  // ---------- CANCEL POST ----------
  const cancelPost = () => {
    Alert.alert("Cancel Story", "Discard this story?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: () => {
          setTitle("");
          setTextContent("");
          removeMedia();
          scrollRef.current?.scrollTo({ y: 0, animated: false });
        },
      },
    ]);
  };

  // ---------- UPLOAD STORY ----------
  const uploadStory = async () => {
    if (!userId) return Alert.alert("Error", "User not logged in");
    if (!textContent && !mediaUri) return Alert.alert("Error", "Add text or media");

    try {
      setIsUploading(true);
      const storyRef = await addDoc(collection(db, "stories"), {
        userId,
        title: title || "",
        type: mediaType || "text",
        content: textContent || null,
        text: mediaUri && textContent ? textContent : null,
        status: mediaUri ? "pending" : "published",
        createdAt: serverTimestamp(),
      });

      if (mediaUri) {
        const fileExt = mediaUri.split(".").pop();
        const storageRef = ref(storage, `users/${userId}/${Date.now()}.${fileExt}`);
        const response = await fetch(mediaUri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        const contentUrl = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "stories", storyRef.id), { content: contentUrl, status: "published" });
      }

      setTitle("");
      setTextContent("");
      removeMedia();
      Alert.alert("Success", "Story uploaded!");
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } catch (error: any) {
      Alert.alert("Upload failed", error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // ---------- UI ----------
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 120 }} style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.push("/stories")} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={28} color="#8B5CF6" />
          </TouchableOpacity>
          <Text style={styles.header}>Create New Story</Text>
        </View>

        {/* Title */}
        <View style={styles.card}>
          <Text style={styles.label}>Title (Optional)</Text>
          <TextInput style={styles.input} placeholder="Story title..." value={title} onChangeText={setTitle} />
        </View>

        {/* Combined Story + Voice-to-Text */}
        <View style={styles.card}>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>Story</Text>
            <Text style={styles.voiceHint}>🎤 Record & convert to text</Text>
          </View>

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Share your story..."
            value={textContent}
            onChangeText={setTextContent}
            multiline
            numberOfLines={6}
          />

          {/* Voice buttons */}
          <View style={styles.voiceButtonsContainer}>
            <TouchableOpacity style={[styles.voiceButton, isRecording && styles.recordingButton]} onPress={isRecording ? stopRecording : startRecording} disabled={isUploading || isTranscribing}>
              <FontAwesome name={isRecording ? "stop" : "microphone"} size={24} color={isRecording ? "#FF3B30" : "#007AFF"} />
              <Text style={[styles.voiceButtonText, isRecording && styles.recordingText]}>
                {isRecording ? "Stop Recording" : "Start Recording"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.voiceButton, (!mediaUri || mediaType !== "audio" || isTranscribing) && styles.disabledButton]} onPress={convertAudioToText} disabled={!mediaUri || mediaType !== "audio" || isTranscribing || isUploading}>
              {isTranscribing ? <ActivityIndicator size="small" color="#4CAF50" /> : <MaterialIcons name="text-fields" size={24} color={(!mediaUri || mediaType !== "audio") ? "#C7C7CC" : "#4CAF50"} />}
              <Text style={[styles.voiceButtonText, { color: isTranscribing ? "#4CAF50" : (!mediaUri || mediaType !== "audio") ? "#C7C7CC" : "#4CAF50" }]}>
                {isTranscribing ? "Converting..." : "Convert to Text"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Status */}
          {(recordingStatus || transcriptionProgress) && (
            <View style={styles.statusContainer}>
              <Text style={styles.statusText}>{transcriptionProgress || recordingStatus}</Text>
            </View>
          )}
        </View>

        {/* Media Picker */}
        <View style={styles.card}>
          <Text style={styles.label}>Add Media</Text>
          <View style={styles.mediaButtonsContainer}>
            <TouchableOpacity style={styles.mediaButton} onPress={pickMedia}>
              <Ionicons name="image-outline" size={20} color="#007AFF" />
              <Text style={styles.mediaButtonText}>Photo/Video</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Media Preview */}
        {mediaUri && mediaType !== "audio" && (
          <View style={styles.card}>
            <View style={styles.mediaHeader}>
              <Text style={styles.label}>{mediaType === "image" ? "Image Preview" : "Video Preview"}</Text>
              <TouchableOpacity onPress={removeMedia}>
                <Feather name="x-circle" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {mediaType === "image" && <Image source={{ uri: mediaUri }} style={styles.imagePreview} />}
            {mediaType === "video" && <Video ref={videoRef} source={{ uri: mediaUri }} style={styles.videoPreview} useNativeControls resizeMode={ResizeMode.CONTAIN} />}
          </View>
        )}

        {/* Buttons */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginHorizontal: 16, marginTop: 12 }}>
          <TouchableOpacity style={[styles.uploadButton, { flex: 0.48, backgroundColor: "#FF3B30" }]} onPress={cancelPost} disabled={isUploading || isTranscribing}>
            <Feather name="x-circle" size={24} color="white" />
            <Text style={styles.uploadButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.uploadButton, { flex: 0.48 }, (!textContent && !mediaUri) && styles.uploadButtonDisabled]} onPress={uploadStory} disabled={!textContent && !mediaUri || isUploading || isTranscribing}>
            {isUploading ? <ActivityIndicator color="white" /> : <Ionicons name="cloud-upload-outline" size={24} color="white" />}
            {!isUploading && <Text style={styles.uploadButtonText}>Upload</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff", marginTop: 45 },
  headerContainer: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  header: { fontSize: 26, fontWeight: "bold", color: "#8B5CF6", marginLeft: 55 },
  card: { backgroundColor: "#F9FAFB", padding: 12, borderRadius: 12, marginVertical: 8 },
  labelContainer: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 16, fontWeight: "bold", color: "#111" },
  voiceHint: { fontSize: 12, color: "#6B7280" },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 8, marginTop: 8 },
  textArea: { height: 120, textAlignVertical: "top" },
  voiceButtonsContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  voiceButton: { flex: 0.48, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#007AFF" },
  voiceButtonText: { marginLeft: 8, color: "#007AFF", fontWeight: "500" },
  recordingButton: { borderColor: "#FF3B30" },
  recordingText: { color: "#FF3B30" },
  disabledButton: { borderColor: "#C7C7CC", opacity: 0.6 },
  statusContainer: { marginTop: 8 },
  statusText: { fontSize: 14, color: "#6B7280" },
  mediaButtonsContainer: { flexDirection: "row", marginTop: 8 },
  mediaButton: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#007AFF" },
  mediaButtonText: { marginLeft: 6, color: "#007AFF", fontWeight: "500" },
  mediaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  imagePreview: { width: "100%", height: 200, borderRadius: 8 },
  videoPreview: { width: "100%", height: 200, borderRadius: 8, backgroundColor: "#000" },
  uploadButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, borderRadius: 8, backgroundColor: "#2563EB" },
  uploadButtonText: { color: "#fff", fontWeight: "bold", marginLeft: 6 },
  uploadButtonDisabled: { backgroundColor: "#C7C7CC" },
});

export default CreatePost;