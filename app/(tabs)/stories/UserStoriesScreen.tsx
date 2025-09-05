import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Audio, ResizeMode, Video } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import { collection, doc, getDoc, onSnapshot, orderBy, query, QueryDocumentSnapshot, QuerySnapshot, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { db } from "../../../config/firebase";

interface Story {
  id: string;
  userId: string;
  title?: string;
  type: "text" | "image" | "video" | "audio";
  content: string;
  text?: string;
  createdAt: any;
}

export default function UserStoriesScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const [stories, setStories] = useState<Story[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("Anonymous");
  const [profilePicture, setProfilePicture] = useState<string>("");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalUri, setModalUri] = useState<string>("");

  // ---------- HASHTAG RENDER ----------
  const renderTextWithHashtags = (text: string) => {
    const words = text.split(/(\s+)/);
    return words.map((word, index) => {
      if (word.startsWith("#")) {
        return (
          <Text key={index} style={{ color: "#007AFF" }} onPress={() => Alert.alert("Hashtag tapped", word)}>
            {word}
          </Text>
        );
      } else {
        return <Text key={index}>{word}</Text>;
      }
    });
  };

  useEffect(() => {
    if (!userId) return;

    fetchUserProfile();

    const q = query(
      collection(db, "stories"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
      const storiesList: Story[] = snapshot.docs.map((docSnap: QueryDocumentSnapshot) => ({
        ...(docSnap.data() as Story),
        id: docSnap.id,
      }));
      setStories(storiesList);
    });

    return () => {
      unsubscribe();
      if (sound) sound.unloadAsync();
    };
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId!));
      if (userDoc.exists()) {
        const data = userDoc.data() as { displayName?: string; profilePicture?: string };
        setDisplayName(data.displayName ?? "Anonymous");
        setProfilePicture(data.profilePicture ?? "");
      }
    } catch (error) {
      console.log("Failed to fetch user profile:", error);
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
      Alert.alert("Playback failed", error.message);
    }
  };

  const renderItem = ({ item }: { item: Story }) => (
    <View style={styles.card}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        {profilePicture ? (
          <Image source={{ uri: profilePicture }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={22} color="#fff" />
          </View>
        )}
        <Text style={styles.username}>{displayName}</Text>
      </View>

      {/* Story content */}
      {item.title && <Text style={styles.title}>{item.title}</Text>}
      {(item.text || (item.type === "text" && item.content)) && (
        <Text style={styles.text}>{renderTextWithHashtags(item.text || item.content)}</Text>
      )}

      {item.type === "image" && (
        <TouchableOpacity onPress={() => { setModalUri(item.content); setModalVisible(true); }}>
          <Image source={{ uri: item.content }} style={styles.image} />
        </TouchableOpacity>
      )}

      {item.type === "video" && (
        <Video source={{ uri: item.content }} style={styles.inlineVideo} useNativeControls resizeMode={ResizeMode.COVER} />
      )}

      {item.type === "audio" && (
        <TouchableOpacity style={[styles.playButton, playingId === item.id && styles.playingButton]} onPress={() => playAudio(item.content, item.id)}>
          <MaterialIcons name={playingId === item.id ? "pause" : "play-arrow"} size={28} color="white" />
          <Text style={styles.audioText}>{playingId === item.id ? "Playing..." : "Play Audio"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#8B5CF6" />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {profilePicture ? (
            <Image source={{ uri: profilePicture }} style={styles.topAvatar} />
          ) : (
            <Ionicons name="person-circle-outline" size={40} color="#8B5CF6" />
          )}
          <Text style={styles.screenTitle}>{displayName}'s Stories</Text>
        </View>
      </View>

      <FlatList
        data={stories}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
        ListEmptyComponent={<Text style={{ textAlign: "center", marginTop: 50, color: "#999" }}>No stories yet.</Text>}
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
  topBar: { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: "#EEE", backgroundColor: "white" },
  topAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  screenTitle: { fontSize: 20, fontWeight: "bold", color: "#8B5CF6" },
  card: { backgroundColor: "white", borderRadius: 12, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3, overflow: "hidden" },
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
