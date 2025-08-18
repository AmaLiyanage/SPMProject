import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from 'expo-router';
import React, { useContext, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import * as Animatable from "react-native-animatable";
import { AuthContext } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

export default function AnimatedLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setUser } = useContext(AuthContext);
  const router = useRouter();

  const errors = {
    email: !/^\S+@\S+\.\S+$/.test(email.trim()) ? "Invalid email" : undefined,
    password: password.length < 8 ? "Min 8 characters" : undefined
  };

  const formValid = !errors.email && !errors.password && email && password;

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      if (data.session) setUser(data.user);

      Alert.alert("Login Successful", "Welcome back!");
      router.push("/profile"); // mentee profile
    } catch (err: any) {
      console.error(err);
      Alert.alert("Login Failed", err.message || "Check your credentials");
    }
  };

  return (
    <LinearGradient colors={["#FF6EC7", "#8A2BE2"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, padding: 20 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
            keyboardShouldPersistTaps="handled"
          >
            <Animatable.View
              animation="slideInRight"
              duration={400}
              style={{
                backgroundColor: "rgba(255,255,255,0.95)",
                borderRadius: 16,
                padding: 24,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 5
              }}
            >
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "bold",
                  color: "#6A0DAD",
                  marginBottom: 20,
                  textAlign: "center"
                }}
              >
                Login
              </Text>

              {/* Email */}
              <Text>Email</Text>
              <View style={{ marginBottom: 16, position: "relative" }}>
                <TextInput
                  style={{ backgroundColor: "#E6E6FA", borderRadius: 10, padding: 12 }}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
                {email && !errors.email && (
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color="green"
                    style={{ position: "absolute", right: 10, top: 12 }}
                  />
                )}
              </View>
              {errors.email && <Text style={{ color: "red", marginBottom: 8 }}>{errors.email}</Text>}

              {/* Password */}
              <Text>Password</Text>
              <View style={{ marginBottom: 16, position: "relative" }}>
                <TextInput
                  style={{ backgroundColor: "#E6E6FA", borderRadius: 10, padding: 12 }}
                  placeholder="Enter your password"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
                {password && !errors.password && (
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color="green"
                    style={{ position: "absolute", right: 10, top: 12 }}
                  />
                )}
              </View>
              {errors.password && <Text style={{ color: "red", marginBottom: 8 }}>{errors.password}</Text>}

              {/* Login button */}
              <Pressable
                onPress={handleLogin}
                disabled={!formValid}
                style={{
                  backgroundColor: formValid ? "#8A2BE2" : "#ccc",
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                  marginTop: 8
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Login</Text>
              </Pressable>

              {/* Signup link */}
              <Pressable
                onPress={() => router.push("/signUp")}
                style={{
                  padding: 16,
                  alignItems: "center",
                  marginTop: 12
                }}
              >
                <Text style={{ color: "#6A0DAD" }}>Don't have an account? Sign Up</Text>
              </Pressable>

              {/* Mentor login link */}
              <Pressable
                onPress={() => router.push("/mentorLogin")}
                style={{
                  padding: 16,
                  alignItems: "center",
                  marginTop: 4
                }}
              >
                <Text style={{ color: "#6A0DAD" }}>Login as Mentor</Text>
              </Pressable>
            </Animatable.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
