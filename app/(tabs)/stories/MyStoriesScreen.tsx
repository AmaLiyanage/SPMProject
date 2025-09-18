import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Audio, ResizeMode, Video } from "expo-av";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../../config/firebase";

interface Story {
  text: string;
  title: React.JSX.Element;
  id: string;
  userId: string;
  type: "text" | "image" | "video" | "audio";
  content: string; // for text content or media URL
  createdAt?: any;
  displayName?: string;
  profilePicture?: string;
}

// 🔹 Helper function to render hashtags & mentions
const renderTextWithHashtags = (text: string) => {
  const parts = text.split(/(\s+)/); // split by spaces
  return (
    <Text style={styles.text}>
      {parts.map((part, idx) => {
        if (part.startsWith("#")) {
          return (
            <Text key={idx} style={styles.hashtag}>
              {part}
            </Text>
          );
        } else if (part.startsWith("@")) {
          return (
            <Text key={idx} style={styles.mention}>
              {part}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
};

export default function MyStoriesScreen() {
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  const router = useRouter();

  const [stories, setStories] = useState<Story[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalUri, setModalUri] = useState<string>("");

  useEffect(() => {
    if (!userId) return Alert.alert("Error", "User not logged in");
    fetchMyStories();

    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [userId]);

  // 🔹 Fetch user's stories
  const fetchMyStories = async () => {
    try {
      const q = query(
        collection(db, "stories"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);

      const myStories: Story[] = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data() as Omit<Story, "id">;
          const userRef = doc(db, "users", data.userId);
          const userSnap = await getDoc(userRef);

          let displayName = "Unknown";
          let profilePicture: string | undefined;

          if (userSnap.exists()) {
            const userData = userSnap.data();
            displayName = userData.displayName || "Unknown";
            profilePicture = userData.profilePicture;
          }

          return { id: docSnap.id, ...data, displayName, profilePicture };
        })
      );

      setStories(myStories);
    } catch (error: any) {
      console.log("Fetch error:", error);
      Alert.alert("Error", "Failed to fetch your stories");
    }
  };

  // 🔹 Delete story
  const deleteStory = async (story: Story) => {
    Alert.alert("Delete Story", "Are you sure you want to delete this story?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "stories", story.id));
            setStories((prev) => prev.filter((s) => s.id !== story.id));
            Alert.alert("Deleted", "Story deleted successfully");
          } catch (err) {
            console.error("Delete error:", err);
            Alert.alert("Error", "Failed to delete story");
          }
        },
      },
    ]);
  };

  // 🔹 Play audio
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
        if (
          status.isLoaded &&
          "didJustFinish" in status &&
          status.didJustFinish
        ) {
          setPlayingId(null);
          setSound(null);
        }
      });
    } catch (error: any) {
      console.log(error);
      Alert.alert("Playback failed", error.message);
    }
  };

  // 🔹 Render story card
  const renderItem = ({ item }: { item: Story }) => (
    <View style={styles.card}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        {item.profilePicture ? (
          <Image source={{ uri: item.profilePicture }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={22} color="#fff" />
          </View>
        )}
        <Text style={styles.username}>{item.displayName}</Text>

        <TouchableOpacity
          style={styles.moreIcon}
          onPress={() => setMenuVisible(item.id)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#444" />
        </TouchableOpacity>
      </View>

      {/* Post Content */}
      {item.title && <Text style={styles.title}>{item.title}</Text>}
      {(item.text || (item.type === "text" && item.content)) &&
        renderTextWithHashtags(item.text || item.content)}

      {item.type === "image" && (
        <TouchableOpacity
          onPress={() => {
            setModalUri(item.content);
            setModalVisible(true);
          }}
        >
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
          style={[
            styles.playButton,
            playingId === item.id && styles.playingButton,
          ]}
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

      {/* Menu Modal */}
      <Modal
        visible={menuVisible === item.id}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(null)}
        >
          <View style={styles.menuBox}>
            {/* Update Option */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(null);
                router.push({
                  pathname: "/stories/UpdatePost",
                  params: { storyId: item.id },
                });
              }}
            >
              <MaterialIcons name="edit" size={20} color="#8B5CF6" />
              <Text style={[styles.menuText, { color: "#333" }]}>Update</Text>
            </TouchableOpacity>

            {/* Delete Option */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(null);
                deleteStory(item);
              }}
            >
              <MaterialIcons name="delete" size={20} color="red" />
              <Text style={styles.menuText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Image Modal */}
      <Modal visible={modalVisible} transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Image source={{ uri: modalUri }} style={styles.modalImage} />
        </TouchableOpacity>
      </Modal>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.push("/stories")}
          style={{ paddingRight: 12 }}
        >
          <Ionicons name="arrow-back" size={28} color="#8B5CF6" />
        </TouchableOpacity>

        <Text style={styles.screenTitle}>My Stories</Text>

        <TouchableOpacity
          onPress={() => router.push("/stories/CreatePost")}
          style={styles.createButton}
        >
          <Ionicons name="add-circle" size={32} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={stories}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 50, color: "#999" }}>
            You haven't posted any stories yet.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 60,
    backgroundColor: "#F5F5F5",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  screenTitle: { fontSize: 22, fontWeight: "bold", color: "#8B5CF6" },
  createButton: { padding: 4 },

  card: {
    backgroundColor: "#F3E8FF",
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
  },
  username: { fontWeight: "600", fontSize: 15, color: "#333" },
  moreIcon: { marginLeft: "auto", padding: 4 },

  text: { fontSize: 16, marginHorizontal: 12, marginBottom: 12, color: "#444" },
  hashtag: { color: "#007AFF", fontWeight: "400" },
  mention: { color: "#FF4500", fontWeight: "600" },
  title: { fontWeight: "bold", fontSize: 18, margin: 12, color: "#222" },

  image: { width: "100%", height: 300 },
  inlineVideo: { width: "100%", height: 300, backgroundColor: "#000" },

  playButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 12,
    margin: 12,
    justifyContent: "center",
  },
  playingButton: { backgroundColor: "#FF9500" },
  audioText: { color: "white", fontWeight: "600", marginLeft: 12 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuBox: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    width: 200,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  menuText: { marginLeft: 10, fontSize: 16, color: "red" },

  modalImage: { width: "90%", height: "70%", borderRadius: 12 },
});
