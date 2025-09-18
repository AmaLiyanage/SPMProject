import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Audio, ResizeMode, Video } from "expo-av";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, orderBy, query } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { db } from "../../../config/firebase";

interface Story {
  id: string;
  userId: string;
  title?: string;
  type: "text" | "image" | "video" | "audio";
  content: string;
  text?: string;
  createdAt: any;
  displayName?: string;
  profilePicture?: string;
}

// Cache to prevent multiple userDoc reads
const userCache = new Map<string, { displayName: string; profilePicture: string }>();

export default function StoriesScreen() {
  const router = useRouter();
  const auth = getAuth();

  const [stories, setStories] = useState<Story[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalUri, setModalUri] = useState<string>("");

  const [profileImage, setProfileImage] = useState<string>("");
  const [cachedStories, setCachedStories] = useState<Story[]>([]);

  // ---------- HASHTAG PARSER ----------
  const renderTextWithHashtags = (text: string) => {
    const words = text.split(/(\s+)/); // keep spaces
    return words.map((word, index) => {
      if (word.startsWith("#")) {
        return (
          <Text
            key={index}
            style={{ color: "#007AFF" }}
            onPress={() => Alert.alert("Hashtag tapped", word)}
          >
            {word}
          </Text>
        );
      } else {
        return <Text key={index}>{word}</Text>;
      }
    });
  };

  useEffect(() => {
    fetchUserProfile();

    const q = query(collection(db, "stories"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const storiesList: Story[] = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const storyData = docSnap.data() as Story;

            let userData = userCache.get(storyData.userId);
            if (!userData) {
              const userDoc = await getDoc(doc(db, "users", storyData.userId));
              userData = userDoc.exists()
                ? (userDoc.data() as { displayName: string; profilePicture: string })
                : { displayName: "Anonymous", profilePicture: "" };
              userCache.set(storyData.userId, userData);
            }

            return {
              ...storyData,
              id: docSnap.id,
              displayName: userData.displayName ?? "Anonymous",
              profilePicture: userData.profilePicture ?? "",
            };
          })
        );

        setStories(storiesList);
        setCachedStories(storiesList);
      },
      (error) => {
        console.log("Error fetching stories:", error);
        if (cachedStories.length > 0) setStories(cachedStories);
      }
    );

    return () => {
      unsubscribe();
      if (sound) sound.unloadAsync();
    };
  }, []);

  const fetchUserProfile = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as { profilePicture?: string };
        setProfileImage(data.profilePicture ?? "");
      }
    } catch (error) {
      console.log("Failed to fetch profile:", error);
    }
  };

  const playAudio = async (uri: string, id: string) => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setPlayingId(null);
        if (playingId === id) return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync({ uri });
      setSound(newSound);
      setPlayingId(id);
      await newSound.playAsync();

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && "didJustFinish" in status && status.didJustFinish) {
          setPlayingId(null);
          setSound(null);
        }
      });
    } catch (error: any) {
      console.log(error);
      Alert.alert("Playback failed", error.message);
    }
  };

  const renderItem = ({ item }: { item: Story }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <TouchableOpacity
          onPress={() => router.push(`/stories/UserStoriesScreen?userId=${item.userId}`)}
        >
          {item.profilePicture ? (
            <Image source={{ uri: item.profilePicture }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={22} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.username}>{item.displayName}</Text>
      </View>

      {item.title && <Text style={styles.title}>{item.title}</Text>}

      {(item.text || (item.type === "text" && item.content)) && (
        <Text style={styles.text}>
          {renderTextWithHashtags(item.text || item.content)}
        </Text>
      )}

      {item.type === "image" && (
        <TouchableOpacity onPress={() => { setModalUri(item.content); setModalVisible(true); }}>
          <Image source={{ uri: item.content }} style={styles.image} />
        </TouchableOpacity>
      )}

      {item.type === "video" && (
        <Video
          source={{ uri: item.content }}
          style={styles.inlineVideo}
          useNativeControls
          resizeMode={ResizeMode.COVER}
        />
      )}

      {item.type === "audio" && (
        <TouchableOpacity
          style={[styles.playButton, playingId === item.id && styles.playingButton]}
          onPress={() => playAudio(item.content, item.id)}
        >
          <MaterialIcons
            name={playingId === item.id ? "pause" : "play-arrow"}
            size={28}
            color="white"
          />
          <Text style={styles.audioText}>
            {playingId === item.id ? "Playing..." : "Play Audio"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>All Stories</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.push(`/stories/MyStoriesScreen?userId=${auth.currentUser?.uid}`)}
            style={styles.profileButton}
          >
            <Image
              source={{ uri: profileImage || "https://via.placeholder.com/40" }}
              style={styles.topAvatar}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/stories/CreatePost")} style={styles.createButton}>
            <Ionicons name="add-circle" size={32} color="#8B5CF6" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={stories}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 50, color: "#999" }}>
            No stories yet.
          </Text>
        }
      />

      <Modal visible={modalVisible} transparent={true}>
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalContainer}>
            <Image source={{ uri: modalUri }} style={styles.modalImage} />
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingTop: 60, backgroundColor: "#F5F5F5", borderBottomWidth: 1, borderBottomColor: "#EEE" },
  screenTitle: { fontSize: 22, fontWeight: "bold", color: "#8B5CF6" },
  profileButton: { padding: 4, borderRadius: 20, backgroundColor: "#F0F0F0" },
  topAvatar: { width: 40, height: 40, borderRadius: 20 },
  createButton: { marginLeft: 12, padding: 4 },
  card: { backgroundColor: "#F3E8FF", borderRadius: 12, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: "#EEE" },
  avatarCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#8B5CF6", justifyContent: "center", alignItems: "center", marginRight: 10 },
  avatarImage: { width: 34, height: 34, borderRadius: 17, marginRight: 10 },
  username: { fontWeight: "600", fontSize: 15, color: "#333" },
  title: { fontWeight: "bold", fontSize: 18, margin: 12, color: "#222" },
  text: { fontSize: 16, marginHorizontal: 12, marginBottom: 12, color: "#444" },
  image: { width: "100%", height: 300 },
  inlineVideo: { width: "100%", height: 300, backgroundColor: "#000" },
  playButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#007AFF", padding: 14, borderRadius: 12, margin: 12, justifyContent: "center" },
  playingButton: { backgroundColor: "#FF9500" },
  audioText: { color: "white", fontWeight: "600", marginLeft: 12 },
  modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  modalImage: { width: "90%", height: "80%", borderRadius: 12 },
});
