// app/(tabs)/journal/Dashboard.tsx
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-chart-kit";
import { auth, db } from "../../../config/firebase";

type Category = "Reflection" | "Goal" | "Achievement" | "Challenge";
type Mood = "happy" | "sad" | "angry" | "excited";

interface JournalEntry {
  id: string;
  text: string;
  category: Category;
  mood: Mood;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
  completed?: boolean;
}

const screenWidth = Dimensions.get("window").width - 32;
const moodMap: Record<Mood, number> = { happy: 4, excited: 3, sad: 2, angry: 1 };
const moodLabels: Record<number, string> = { 4: "😊 Happy", 3: "😍 Excited", 2: "😢 Sad", 1: "😡 Angry" };

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) {
        setLoading(false);
        return;
      }
      setUser(u);

      const q = query(
        collection(db, "journals", u.uid, "entries"),
        orderBy("createdAt", "asc")
      );

      const unsubEntries = onSnapshot(q, (snap) => {
        const arr = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            text: data.text,
            category: data.category || "Reflection",
            mood: data.mood || "happy",
            pinned: data.pinned || false,
            completed: data.completed ?? false,
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
      });

      return () => unsubEntries();
    });

    return () => unsubAuth();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading dashboard...</Text>
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: "#fff",
    backgroundGradientFrom: "#6b46c1",
    backgroundGradientTo: "#9f7aea",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: () => "#fff",
    propsForDots: { r: "4", strokeWidth: "2", stroke: "#fff" },
  };

  // --- BarChart: Entries by Category ---
  const categoryCounts = entries.reduce((acc, entry) => {
    acc[entry.category] = (acc[entry.category] || 0) + 1;
    return acc;
  }, {} as Record<Category, number>);

  const barData = {
    labels: Object.keys(categoryCounts),
    datasets: [{ data: Object.values(categoryCounts) }],
  };

  // --- PieChart: Mood Distribution ---
  const moodCounts = entries.reduce((acc, entry) => {
    acc[entry.mood] = (acc[entry.mood] || 0) + 1;
    return acc;
  }, {} as Record<Mood, number>);

  const pieData = Object.entries(moodCounts).map(([key, value]) => ({
    name: key,
    population: value,
    color:
      key === "happy"
        ? "#FFD700"
        : key === "sad"
        ? "#1E90FF"
        : key === "angry"
        ? "#FF4500"
        : "#32CD32",
    legendFontColor: "#333",
    legendFontSize: 14,
  }));

  // --- LineChart: Mood Trend Over Time ---
  const lineData = {
    labels: entries.map((e) => e.createdAt.toLocaleDateString()),
    datasets: [
      {
        data: entries.map((e) => moodMap[e.mood]),
        color: (opacity = 1) => `rgba(255, 215, 0, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  // --- LineChart: Entries Over Time (weekly) ---
  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear =
      (date.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000);
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const entriesByWeek: Record<string, number> = {};
  entries.forEach((e) => {
    const week = `${e.createdAt.getFullYear()}-W${getWeekNumber(e.createdAt)}`;
    entriesByWeek[week] = (entriesByWeek[week] || 0) + 1;
  });

  const weeklyLabels = Object.keys(entriesByWeek);
  const weeklyData = Object.values(entriesByWeek);

  const entriesOverTimeData = {
    labels: weeklyLabels,
    datasets: [{ data: weeklyData, color: (opacity = 1) => `rgba(67, 156, 255, ${opacity})`, strokeWidth: 3 }],
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Dashboard</Text>

      <Text style={styles.sectionTitle}>Entries by Category</Text>
      {entries.length > 0 ? (
        <BarChart
          data={barData}
          width={screenWidth}
          height={220}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={chartConfig}
          style={{ borderRadius: 12, marginBottom: 24 }}
          fromZero
        />
      ) : (
        <Text>No entries to display</Text>
      )}

      <Text style={styles.sectionTitle}>Mood Distribution</Text>
      {entries.length > 0 ? (
        <PieChart
          data={pieData}
          width={screenWidth}
          height={220}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
          style={{ marginBottom: 24 }}
        />
      ) : (
        <Text>No mood data yet</Text>
      )}

      <Text style={styles.sectionTitle}>Mood Trend Over Time</Text>
      {entries.length > 0 ? (
        <LineChart
          data={lineData}
          width={screenWidth}
          height={220}
          chartConfig={chartConfig}
          style={{ borderRadius: 12, marginBottom: 24 }}
          fromZero
          yAxisLabel=""
          yAxisSuffix=""
          formatYLabel={(y) => moodLabels[Number(y)] || y}
        />
      ) : (
        <Text>No mood trend data yet</Text>
      )}

      <Text style={styles.sectionTitle}>Entries Over Time (Weekly)</Text>
      {entries.length > 0 ? (
        <LineChart
          data={entriesOverTimeData}
          width={screenWidth}
          height={220}
          chartConfig={chartConfig}
          style={{ borderRadius: 12, marginBottom: 24 }}
          fromZero
          yAxisLabel=""
          yAxisSuffix=""
        />
      ) : (
        <Text>No entries data yet</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { fontSize: 24, fontWeight: "700", marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
});