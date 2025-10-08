// app/(tabs)/journal/journal.tsx
import { Href, useRouter } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../../config/firebase";

type Category = "Reflection" | "Goal" | "Achievement" | "Challenge";
type Mood = "happy" | "sad" | "angry" | "excited";

interface JournalEntry {
  id: string;
  title?: string; // new title field
  text: string;
  category: Category;
  mood: Mood;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
}

export default function JournalScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [title, setTitle] = useState(""); // new title state
  const [text, setText] = useState("");
  const [category, setCategory] = useState<Category>("Reflection");
  const [mood, setMood] = useState<Mood>("happy");
  const [pinned, setPinned] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/(auth)/sign-in" as Href);
        setLoading(false);
        return;
      }
      setUser(u);

      const q = query(
        collection(db, "journals", u.uid, "entries"),
        orderBy("createdAt", "desc")
      );

      const unsubEntries = onSnapshot(
        q,
        (snap) => {
          const arr = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title || "",
              text: data.text,
              category: data.category || "Reflection",
              mood: data.mood || "happy",
              pinned: data.pinned || false,
              createdAt:
                data.createdAt instanceof Timestamp
                  ? data.createdAt.toDate()
                  : new Date(),
              updatedAt:
                data.updatedAt instanceof Timestamp
                  ? data.updatedAt.toDate()
                  : new Date(),
              userId: (data as any).userId ?? u.uid,
            } as JournalEntry;
          });
          setEntries(arr);
          setLoading(false);
        },
        (err) => {
          console.error("Snapshot error:", err);
          setLoading(false);
        }
      );

      return () => unsubEntries();
    });

    return () => unsubAuth();
  }, []);

  const handleSave = async () => {
    if (!title.trim() && !text.trim()) {
      Alert.alert("Write a title or some text first");
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      if (editing) {
        const ref = doc(db, "journals", user.uid, "entries", editing.id);
        await updateDoc(ref, {
          title,
          text,
          category,
          mood,
          pinned,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "journals", user.uid, "entries"), {
          title,
          text,
          category,
          mood,
          pinned,
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setTitle("");
      setText("");
      setCategory("Reflection");
      setMood("happy");
      setPinned(false);
      setEditing(null);
      setModalVisible(false);
    } catch (err) {
      console.error("Save failed:", err);
      Alert.alert("Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: JournalEntry) => {
    setEditing(item);
    setTitle(item.title || "");
    setText(item.text);
    setCategory(item.category);
    setMood(item.mood);
    setPinned(item.pinned);
    setModalVisible(true);
  };

  const handleDelete = (item: JournalEntry) => {
    if (!item?.id) {
      Alert.alert("Delete failed", "Missing document id.");
      return;
    }

    Alert.alert("Delete entry?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const ownerId = item.userId ?? user?.uid;
            if (!ownerId) {
              Alert.alert("Delete failed", "No owner found.");
              return;
            }

            const docRef = doc(db, "journals", ownerId, "entries", item.id);
            await deleteDoc(docRef);

            setEntries((prev) => prev.filter((e) => e.id !== item.id));
            Alert.alert("Entry deleted successfully");
          } catch (err: any) {
            console.error("Delete failed:", err);
            const code = err?.code ?? err?.message ?? "unknown";
            Alert.alert("Delete failed", String(code));
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>My Leadership Journal</Text>

      {/* Calendar Button */}
      <TouchableOpacity
        style={[styles.newBtn, { backgroundColor: "#4a5568" }]}
        onPress={() => router.push("/journal/Calendar")}
      >
        <Text style={styles.newBtnText}>📅 View Calendar</Text>
      </TouchableOpacity>

      {/* Dashboard Button */}
      <TouchableOpacity
        style={[styles.newBtn, { backgroundColor: "#2b6cb0" }]}
        onPress={() => router.push("/journal/Dashboard")}
      >
        <Text style={styles.newBtnText}>📊 View Dashboard</Text>
      </TouchableOpacity>

      {/* New Entry Button */}
      <TouchableOpacity
        style={styles.newBtn}
        onPress={() => {
          setEditing(null);
          setTitle("");
          setText("");
          setCategory("Reflection");
          setMood("happy");
          setPinned(false);
          setModalVisible(true);
        }}
      >
        <Text style={styles.newBtnText}>+ New Entry</Text>
      </TouchableOpacity>

      {entries.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            No entries yet — add your first reflection.
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View style={[styles.entry, item.pinned && styles.pinnedEntry]}>
              {item.title ? <Text style={styles.entryTitle}>{item.title}</Text> : null}
              <Text style={styles.entryText}>
                {item.pinned && "📌 "} {item.text}
              </Text>
              <Text style={styles.metaText}>
                [{item.category}] Mood:{" "}
                {item.mood === "happy"
                  ? "😊"
                  : item.mood === "sad"
                  ? "😢"
                  : item.mood === "angry"
                  ? "😡"
                  : "😍"}
              </Text>
              <View style={styles.entryFooter}>
                <Text style={styles.dateText}>
                  {item.createdAt.toLocaleString()}
                </Text>
                <View style={styles.row}>
                  <TouchableOpacity onPress={() => handleEdit(item)}>
                    <Text style={styles.link}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item)}>
                    <Text
                      style={[styles.link, { color: "#e53e3e", marginLeft: 14 }]}
                    >
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal for New/Edit Entry */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <SafeAreaView style={styles.modal}>
            <Text style={styles.modalTitle}>{editing ? "Edit Entry" : "New Entry"}</Text>

            {/* Title Input */}
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="Enter title"
              value={title}
              onChangeText={setTitle}
            />

            {/* Journal Text */}
            <Text style={styles.label}>Journal Entry</Text>
            <TextInput
              style={[styles.input, { minHeight: 120 }]}
              multiline
              value={text}
              onChangeText={setText}
              placeholder="Write your reflection..."
            />

            <View style={styles.row}>
              <Text style={{ marginRight: 8 }}>Category:</Text>
              {["Reflection", "Goal", "Achievement", "Challenge"].map((c) => (
                <TouchableOpacity key={c} onPress={() => setCategory(c as Category)}>
                  <Text style={[styles.categoryBtn, category === c && styles.selectedCategory]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.row}>
              <Text style={{ marginRight: 8 }}>Mood:</Text>
              {["happy", "sad", "angry", "excited"].map((m) => (
                <TouchableOpacity key={m} onPress={() => setMood(m as Mood)}>
                  <Text style={[styles.moodBtn, mood === m && styles.selectedMood]}>
                    {m === "happy" ? "😊" : m === "sad" ? "😢" : m === "angry" ? "😡" : "😍"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.row, { marginVertical: 10 }]}>
              <Text>Pinned:</Text>
              <TouchableOpacity onPress={() => setPinned(!pinned)}>
                <Text style={styles.pinBtn}>{pinned ? "📌 Yes" : "📍 No"}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.save} onPress={handleSave}>
                <Text style={styles.saveText}>{editing ? "Save" : "Add"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// Styles (updated)
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  newBtn: {
    backgroundColor: "#6b46c1",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  newBtnText: { color: "#fff", fontWeight: "600" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#666" },
  entry: {
    backgroundColor: "#f7f7fb",
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e2e2",
    borderRadius: 8,
    marginBottom: 12,
  },
  pinnedEntry: { borderColor: "#6b46c1", borderWidth: 2 },
  entryTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  entryText: { fontSize: 16, color: "#000", fontFamily: "System" },
  metaText: { fontSize: 14, color: "#333", fontFamily: "System" },
  entryFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  dateText: { fontSize: 12, color: "#999" },
  row: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  link: { color: "#6b46c1", fontWeight: "600" },
  modal: { flex: 1, padding: 20, backgroundColor: "#fff" },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
  titleInput: {
    borderWidth: 1,
    borderColor: "#e2e2e2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e2e2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    textAlignVertical: "top",
  },
  modalButtons: { flexDirection: "row", justifyContent: "space-between" },
  save: {
    backgroundColor: "green",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontWeight: "700" },
  cancel: {
    backgroundColor: "red",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
    marginLeft: 12,
  },
  cancelText: { color: "#fff", fontWeight: "700" },
  categoryBtn: {
    padding: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
  },
  selectedCategory: {
    backgroundColor: "#6b46c1",
    color: "#fff",
    borderColor: "#6b46c1",
  },
  moodBtn: { fontSize: 28, marginRight: 6, fontFamily: "System" },
  selectedMood: { borderWidth: 2, borderColor: "#6b46c1", borderRadius: 6 },
  pinBtn: { marginLeft: 8, fontSize: 16, fontFamily: "System" },
});