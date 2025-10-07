import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

type Task = {
  id: string;
  text: string;
  status: 'pending' | 'done';
  createdAt: number;
};

export default function TaskboardScreen() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);

  // Helper to convert Firestore status string to union type
  const normalizeStatus = (status: string): 'pending' | 'done' =>
    status === 'done' ? 'done' : 'pending';

  // Load tasks from Firestore
  useEffect(() => {
    const loadTasks = async () => {
      if (!userProfile) return;

      const ref = doc(db, 'checklists', userProfile.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        const fetchedTasks: Task[] = (data.tasks || []).map((t: any) => ({
          id: t.id,
          text: t.text,
          status: normalizeStatus(t.status), // cast to 'pending' | 'done'
          createdAt: t.createdAt,
        }));
        setTasks(fetchedTasks);
      } else {
        // Initialize empty checklist
        await setDoc(ref, { menteeId: userProfile.uid, tasks: [], updatedAt: Date.now() });
        setTasks([]);
      }
    };

    loadTasks();
  }, [userProfile]);

  // Toggle task status
  const toggleTask = async (taskId: string) => {
    if (!userProfile) return;

    const newTasks: Task[] = tasks.map(t =>
      t.id === taskId ? { ...t, status: t.status === 'done' ? 'pending' : 'done' } : t
    );

    setTasks(newTasks);

    const ref = doc(db, 'checklists', userProfile.uid);
    await updateDoc(ref, { tasks: newTasks, updatedAt: Date.now() });
  };

  // Render each task
  const renderItem = ({ item }: { item: Task }) => (
    <TouchableOpacity style={styles.taskItem} onPress={() => toggleTask(item.id)}>
      <View style={[styles.checkbox, item.status === 'done' && styles.checked]} />
      <Text style={[styles.taskText, item.status === 'done' && styles.taskDone]}>{item.text}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#8B5CF6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Taskboard</Text>
      </View>

      {/* Task list */}
      {tasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No tasks yet! 🎯</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#8B5CF6' },
  taskItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#8B5CF6', marginRight: 12 },
  checked: { backgroundColor: '#8B5CF6' },
  taskText: { fontSize: 16 },
  taskDone: { textDecorationLine: 'line-through', opacity: 0.6 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 18, color: '#8B5CF6', fontWeight: 'bold' },
});
