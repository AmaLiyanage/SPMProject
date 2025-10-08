// app/(tabs)/journal/_layout.tsx
import { Stack } from 'expo-router';

export default function JournalLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: "My Journal" }} />
      <Stack.Screen name="Dashboard" options={{ title: "Dashboard" }} />
      <Stack.Screen name="Calender" options={{ title: "Calendar" }} />
    </Stack>
  );
}