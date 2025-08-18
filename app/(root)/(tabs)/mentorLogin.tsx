import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

export default function MentorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const { setUser } = useContext(AuthContext);
  const router = useRouter();

  const errors = useMemo(() => {
    const e: Partial<Record<string, string>> = {};
    if (email && !/^\S+@\S+\.\S+$/.test(email)) e.email = "Invalid email";
    if (password && password.length < 8) e.password = "Minimum 8 characters";
    return e;
  }, [email, password]);

  const isValid = !errors.email && !errors.password && email && password;

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const sessionStr = await AsyncStorage.getItem('@supabase_session');
        if (!sessionStr) return;

        const session = JSON.parse(sessionStr);
        if (session?.access_token && session?.refresh_token && session.user) {
          await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token
          });
          setUser(session.user);
          router.replace("/profile"); // redirect if already logged in
        }
      } catch (err) {
        console.log("Failed to restore session:", err);
      }
    };
    restoreSession();
  }, []);

  const handleLogin = async () => {
    setLoginError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) throw error;

      if (data.user && data.session) {
        setUser(data.user);
        await AsyncStorage.setItem('@supabase_session', JSON.stringify(data.session));
        router.replace("/profile"); // navigate to profile/dashboard
      }
    } catch (err: any) {
      setLoading(false);
      setLoginError(err.message || "Login failed");
    }
  };

  return (
    <LinearGradient colors={["#FF6EC7", "#8A2BE2"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, padding: 20 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
            <Animatable.View animation="slideInRight" duration={400}
              style={{ backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 16, padding: 24, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
              
              <Text style={{ fontSize: 24, fontWeight: "bold", color: "#6A0DAD", marginBottom: 20, textAlign: "center" }}>Mentor Login</Text>

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
                {email && !errors.email && <MaterialIcons name="check-circle" size={20} color="green" style={{ position: "absolute", right: 10, top: 12 }} />}
              </View>
              {errors.email && <Text style={{ color: "red", marginBottom: 8 }}>{errors.email}</Text>}

              {/* Password */}
              <Text>Password</Text>
              <View style={{ marginBottom: 16, position: "relative" }}>
                <TextInput
                  style={{ backgroundColor: "#E6E6FA", borderRadius: 10, padding: 12, paddingRight: 40 }}
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                {password && !errors.password && <MaterialIcons name="check-circle" size={20} color="green" style={{ position: "absolute", right: 40, top: 12 }} />}
                <Pressable onPress={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 10, top: 12 }}>
                  <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={20} color="#333" />
                </Pressable>
              </View>
              {errors.password && <Text style={{ color: "red", marginBottom: 8 }}>{errors.password}</Text>}

              {/* Login Error */}
              {loginError && <Text style={{ color: "red", marginBottom: 8 }}>{loginError}</Text>}

              {/* Login Button */}
              <Pressable
                onPress={handleLogin}
                disabled={!isValid || loading}
                style={{
                  backgroundColor: isValid ? "#8A2BE2" : "#ccc",
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                  marginTop: 8
                }}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "bold" }}>Login</Text>}
              </Pressable>
            </Animatable.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
