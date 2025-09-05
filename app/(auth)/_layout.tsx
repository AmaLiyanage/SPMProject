import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="user-login" />
      <Stack.Screen name="user-signup" />
      <Stack.Screen name="mentor-login" />
      <Stack.Screen name="mentor-signup" />
      <Stack.Screen name="verify-email" />
    </Stack>
  );
}