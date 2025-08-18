import { Link } from "expo-router"; // ✅ import Link
import { Text, View } from "react-native";
import "react-native-reanimated"; // must come first
import "../../globals.css";

export default function Index() {
  return (
    <View className="flex-1 justify-center items-center bg-background-light">
      {/* ✅ Use <Link> from expo-router */}
      <Link href="/signUp" asChild>
        <Text className="text-lg text-primary">Sign Up</Text>
      </Link>
       <Link href="/login" asChild>
        <Text className="text-lg text-primary">Login</Text>
      </Link>
      <Link href="/profile" asChild>
        <Text className="text-lg text-primary mt-4">Profile</Text>
      </Link>
    </View>
  );
}
