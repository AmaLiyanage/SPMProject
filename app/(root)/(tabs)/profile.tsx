import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { useContext } from "react";
import { Pressable, Text, View } from "react-native";
import { AuthContext } from "../../../contexts/AuthContext";
import { supabase } from "../../../lib/supabase";


export default function ProfileScreen() {
  const { setUser } = useContext(AuthContext);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      await AsyncStorage.removeItem('@supabase_session'); // clear stored session
      router.replace("/login"); // redirect to login
    } catch (err: any) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-background-light">
      <Text className="text-xl text-primary mb-4">Profile Screen</Text>
      <Pressable
        onPress={handleLogout}
        className="px-6 py-3 bg-red-500 rounded"
      >
        <Text className="text-white font-bold">Log Out</Text>
      </Pressable>
    </View>
  );
}
