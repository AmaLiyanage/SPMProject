// app/(journal)/_layout.tsx
import { Stack } from 'expo-router';

export default function JournalLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="journal" options={{ title: "My Journal" }} />
    </Stack>
  );
}
