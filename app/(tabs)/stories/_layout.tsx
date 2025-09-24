import { Stack } from 'expo-router';

export default function StoriesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />           {/* Stories list */}
      <Stack.Screen name="CreatePost" />      {/* Story creation page */}
    </Stack>
  );
}
