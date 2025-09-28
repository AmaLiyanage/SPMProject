import { collection, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CalendarList } from "react-native-calendars";
import { auth, db } from "../../../config/firebase";

interface JournalEntry {
  id: string;
  text: string;
  category: string;
  mood: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Helper: convert Date to YYYY-MM-DD
const getDateString = (date: Date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function CalendarScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [entriesForDate, setEntriesForDate] = useState<JournalEntry[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "journals", user.uid, "entries"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data: JournalEntry[] = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          text: d.text,
          category: d.category || "Reflection",
          mood: d.mood || "happy",
          pinned: d.pinned || false,
          createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(),
          updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : new Date(),
        };
      });
      setEntries(data);
    });

    return () => unsub();
  }, []);

  // Mark all dates with entries
  const markedDates = entries.reduce((acc: any, entry) => {
    const date = getDateString(entry.createdAt);
    acc[date] = { marked: true, dotColor: "#6b46c1" };
    return acc;
  }, {});

  const onDayPress = (day: any) => {
    setSelectedDate(day.dateString);
    const filtered = entries.filter((e) => getDateString(e.createdAt) === day.dateString);
    setEntriesForDate(filtered);
    setModalVisible(true); // show modal when a date is clicked
  };

  return (
    <SafeAreaView style={styles.container}>
      <CalendarList
        pastScrollRange={12}
        futureScrollRange={12}
        markedDates={{
          ...markedDates,
          [selectedDate]: { selected: true, selectedColor: "#6b46c1" },
        }}
        onDayPress={onDayPress}
      />

      {/* Modal to show entries for selected date */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modal}>
          <Text style={styles.modalTitle}>
            {selectedDate ? `Entries for ${selectedDate}` : "Entries"}
          </Text>
          {entriesForDate.length === 0 ? (
            <Text style={styles.noEntryText}>No entries for this date.</Text>
          ) : (
            <FlatList
              data={entriesForDate}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) => (
                <View style={[styles.entry, item.pinned && styles.pinnedEntry]}>
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
                  <Text style={styles.dateText}>{item.createdAt.toLocaleString()}</Text>
                </View>
              )}
            />
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  entry: {
    backgroundColor: "#f7f7fb",
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e2e2",
    borderRadius: 8,
    marginBottom: 12,
  },
  pinnedEntry: { borderColor: "#6b46c1", borderWidth: 2 },
  entryText: { fontSize: 16, color: "#000", fontFamily: "System" },
  metaText: { fontSize: 14, color: "#333", marginTop: 4, fontFamily: "System" },
  dateText: { fontSize: 12, color: "#999", marginTop: 4 },
  noEntryText: { textAlign: "center", marginTop: 20, color: "#666" },
  modal: { flex: 1, padding: 16, backgroundColor: "#fff" },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  closeBtn: {
    backgroundColor: "#6b46c1",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  closeText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
