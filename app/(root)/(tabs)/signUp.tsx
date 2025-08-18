import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useMemo, useState } from "react";
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

const INTEREST_OPTIONS = [
  "Political Leadership",
  "Career Growth",
  "Mental Health",
  "Mentorship",
  "Entrepreneurship",
  "Networking"
];

export default function AnimatedSignup() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const { setUser } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    const restoreSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user);
    };
    restoreSession();
  }, []);

  const errors = useMemo(() => {
    const e: Partial<Record<string, string>> = {};
    if (step === 1 && !fullName.trim()) e.fullName = "Full name is required";
    if ((step === 1 || step === 2) && !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Invalid email";
    if (step === 2 && password.length < 8) e.password = "Min 8 characters";
    if (step === 2 && confirm !== password) e.confirm = "Passwords do not match";
    if (step === 2 && interests.length === 0) e.interests = "Select at least one interest";
    return e;
  }, [fullName, email, password, confirm, step, interests]);

  const step1Valid = useMemo(
    () => !errors.fullName && !errors.email && fullName.trim() !== "" && email.trim() !== "",
    [errors, fullName, email]
  );

  const step2Valid = useMemo(
    () =>
      !errors.password &&
      !errors.confirm &&
      !errors.interests &&
      password.trim() !== "" &&
      confirm.trim() !== "" &&
      interests.length > 0,
    [errors, password, confirm, interests]
  );

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleSignUp = async () => {
  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          interests: interests, // <-- store interests here
          role: "mentee",
        },
      },
    });

    if (error) throw error;

    Alert.alert(
      "Sign Up Successful",
      "Check your email to confirm your account. Then log in to complete your profile."
    );

    // Optionally clear local state or redirect to login
    setFullName('');
    setEmail('');
    setPassword('');
    setConfirm('');
    setInterests([]);
    setStep(1);
    router.push('/login'); // or wherever you want to redirect
  } catch (err: any) {
    console.error(err);
    alert(err.message || "Sign up failed");
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
                Sign Up as Mentee
              </Text>

              {step === 1 && (
                <>
                  <Text>Full Name</Text>
                  <View style={{ marginBottom: 16, position: "relative" }}>
                    <TextInput
                      style={{ backgroundColor: "#E6E6FA", borderRadius: 10, padding: 12 }}
                      placeholder="Ana Perera"
                      value={fullName}
                      onChangeText={setFullName}
                    />
                    {fullName && !errors.fullName && <MaterialIcons name="check-circle" size={20} color="green" style={{ position: "absolute", right: 10, top: 12 }} />}
                  </View>

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

                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                    <Pressable
                      onPress={() => step1Valid && setStep(2)}
                      style={{
                        backgroundColor: step1Valid ? "#8A2BE2" : "#ccc",
                        padding: 16,
                        borderRadius: 12,
                        flex: 1,
                        marginRight: 8,
                        alignItems: "center"
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "bold" }}>Next</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => router.push('/mentorSignup')}
                      style={{
                        backgroundColor: "#FF6EC7",
                        padding: 16,
                        borderRadius: 12,
                        flex: 1,
                        marginLeft: 8,
                        alignItems: "center"
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "bold" }}>Sign Up as Mentor</Text>
                    </Pressable>
                  </View>
                </>
              )}

              {step === 2 && (
                <>
                  <Text>Password</Text>
                  <View style={{ marginBottom: 16, position: "relative" }}>
                    <TextInput
                      style={{ backgroundColor: "#E6E6FA", borderRadius: 10, padding: 12 }}
                      placeholder="At least 8 characters"
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                    />
                    {password && !errors.password && <MaterialIcons name="check-circle" size={20} color="green" style={{ position: "absolute", right: 10, top: 12 }} />}
                  </View>

                  <Text>Confirm Password</Text>
                  <View style={{ marginBottom: 16, position: "relative" }}>
                    <TextInput
                      style={{ backgroundColor: "#E6E6FA", borderRadius: 10, padding: 12 }}
                      placeholder="Re-enter password"
                      secureTextEntry
                      value={confirm}
                      onChangeText={setConfirm}
                    />
                    {confirm && !errors.confirm && <MaterialIcons name="check-circle" size={20} color="green" style={{ position: "absolute", right: 10, top: 12 }} />}
                  </View>

                  <Text>Select Interests</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 16 }}>
                    {INTEREST_OPTIONS.map(option => (
                      <Pressable
                        key={option}
                        onPress={() => toggleInterest(option)}
                        style={{
                          padding: 8,
                          margin: 4,
                          borderRadius: 12,
                          backgroundColor: interests.includes(option) ? "#8A2BE2" : "#ddd"
                        }}
                      >
                        <Text style={{ color: interests.includes(option) ? "#fff" : "#000" }}>{option}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {errors.interests && <Text style={{ color: "red", marginBottom: 8 }}>{errors.interests}</Text>}

                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Pressable
                      onPress={() => setStep(1)}
                      style={{
                        backgroundColor: "#ccc",
                        padding: 16,
                        borderRadius: 12,
                        flex: 1,
                        marginRight: 8,
                        alignItems: "center"
                      }}
                    >
                      <Text>Back</Text>
                    </Pressable>

                    <Pressable
                      onPress={handleSignUp}
                      disabled={!step2Valid}
                      style={{
                        backgroundColor: step2Valid ? "#8A2BE2" : "#ccc",
                        padding: 16,
                        borderRadius: 12,
                        flex: 1,
                        marginLeft: 8,
                        alignItems: "center"
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "bold" }}>Sign Up</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </Animatable.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
} 