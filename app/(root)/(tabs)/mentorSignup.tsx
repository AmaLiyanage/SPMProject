import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from 'expo-router';
import React, { useContext, useMemo, useState } from "react";
import {
  Alert, KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View
} from 'react-native';
import * as Animatable from "react-native-animatable";
import { AuthContext } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

const INTEREST_OPTIONS = ["Political Leadership", "Career Growth", "Mental Health", "Mentorship", "Entrepreneurship", "Networking"];
const EXPERTISE_OPTIONS = ["Business", "Technology", "Health", "Education", "Marketing"];
const AVAILABILITY_OPTIONS = ["Weekdays", "Weekends", "Evenings", "Flexible"];

export default function MentorSignup() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [expertise, setExpertise] = useState("");
  const [availability, setAvailability] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const { setUser } = useContext(AuthContext);
  const navigation = useNavigation<any>();

  // Validation
  const errors = useMemo(() => {
    const e: Partial<Record<string, string>> = {};
    if (step === 1 && !fullName.trim()) e.fullName = "Full name is required";
    if ((step === 1 || step === 2) && !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Invalid email";
    if (step === 2 && password.length < 8) e.password = "Min 8 characters";
    if (step === 2 && confirm !== password) e.confirm = "Passwords do not match";
    if (step === 3 && !expertise) e.expertise = "Expertise is required";
    if (step === 3 && !availability) e.availability = "Availability is required";
    if (step === 3 && interests.length === 0) e.interests = "Select at least one interest";
    return e;
  }, [fullName, email, password, confirm, expertise, availability, step, interests]);

  const step1Valid = !errors.fullName && !errors.email && fullName.trim() && email.trim();
  const step2Valid = !errors.password && !errors.confirm && password.trim() && confirm.trim();
  const step3Valid = !errors.expertise && !errors.availability && !errors.interests;

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };


const handleSignUp = async () => {
  const router = useRouter(); // get router

  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          expertise: [expertise],
          availability: [availability],
          interests,
          role: "mentor", // set role
        },
      },
    });

    if (error) throw error;

    Alert.alert(
      "Sign Up Successful",
      "Check your email to confirm your account. Then log in to complete your profile."
    );

    // Reset local state
    setFullName('');
    setEmail('');
    setPassword('');
    setConfirm('');
    setExpertise('');
    setAvailability('');
    setInterests([]);
    setStep(1);

    // Navigate exactly like your mentee example
    router.push('/mentorLogin'); // redirect to mentor login screen

  } catch (err: any) {
    console.error(err);
    Alert.alert("Sign Up Failed", err.message || "Unknown error");
  }
};


  return (
    <LinearGradient colors={["#FF6EC7", "#8A2BE2"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, padding: 20 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
            <Animatable.View animation="slideInRight" duration={400}
              style={{ backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 16, padding: 24, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: "#6A0DAD", marginBottom: 20, textAlign: "center" }}>Mentor Sign Up</Text>

              {step === 1 && (
                <>
                  <Text>Full Name</Text>
                  <TextInput style={{ backgroundColor: "#E6E6FA", borderRadius: 10, padding: 12, marginBottom: 16 }} placeholder="Ama Perera" value={fullName} onChangeText={setFullName} />
                  <Text>Email</Text>
                  <TextInput style={{ backgroundColor: "#E6E6FA", borderRadius: 10, padding: 12, marginBottom: 16 }} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
                  <Pressable onPress={() => step1Valid && setStep(2)} style={{ backgroundColor: step1Valid ? "#8A2BE2" : "#ccc", padding: 16, borderRadius: 12, alignItems: "center" }}>
                    <Text style={{ color: "#fff", fontWeight: "bold" }}>Next</Text>
                  </Pressable>
                </>
              )}

              {step === 2 && (
                <>
                  <Text>Password</Text>
                  <TextInput style={{ backgroundColor: "#E6E6FA", borderRadius: 10, padding: 12, marginBottom: 16 }} placeholder="At least 8 characters" secureTextEntry value={password} onChangeText={setPassword} />
                  <Text>Confirm Password</Text>
                  <TextInput style={{ backgroundColor: "#E6E6FA", borderRadius: 10, padding: 12, marginBottom: 16 }} placeholder="Re-enter password" secureTextEntry value={confirm} onChangeText={setConfirm} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Pressable onPress={() => setStep(1)} style={{ padding: 16, borderRadius: 12, backgroundColor: "#ccc", flex: 1, marginRight: 8, alignItems: "center" }}>
                      <Text style={{ fontWeight: "bold" }}>Back</Text>
                    </Pressable>
                    <Pressable onPress={() => step2Valid && setStep(3)} style={{ padding: 16, borderRadius: 12, backgroundColor: step2Valid ? "#8A2BE2" : "#ccc", flex: 1, marginLeft: 8, alignItems: "center" }}>
                      <Text style={{ color: "#fff", fontWeight: "bold" }}>Next</Text>
                    </Pressable>
                  </View>
                </>
              )}

              {step === 3 && (
                <>
                  <Text>Expertise</Text>
                  <View style={{ backgroundColor: "#E6E6FA", borderRadius: 10, marginBottom: 16 }}>
                    <Picker selectedValue={expertise} onValueChange={value => setExpertise(value)}>
                      <Picker.Item label="Select Expertise" value="" />
                      {EXPERTISE_OPTIONS.map(opt => <Picker.Item key={opt} label={opt} value={opt} />)}
                    </Picker>
                  </View>
                  <Text>Availability</Text>
                  <View style={{ backgroundColor: "#E6E6FA", borderRadius: 10, marginBottom: 16 }}>
                    <Picker selectedValue={availability} onValueChange={value => setAvailability(value)}>
                      <Picker.Item label="Select Availability" value="" />
                      {AVAILABILITY_OPTIONS.map(opt => <Picker.Item key={opt} label={opt} value={opt} />)}
                    </Picker>
                  </View>
                  <Text>Select Interests</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 16 }}>
                    {INTEREST_OPTIONS.map(option => (
                      <Pressable key={option} onPress={() => toggleInterest(option)}
                        style={{ padding: 8, margin: 4, borderRadius: 12, backgroundColor: interests.includes(option) ? "#8A2BE2" : "#ddd" }}>
                        <Text style={{ color: interests.includes(option) ? "#fff" : "#000" }}>{option}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Pressable onPress={() => setStep(2)} style={{ padding: 16, borderRadius: 12, backgroundColor: "#ccc", flex: 1, marginRight: 8, alignItems: "center" }}>
                      <Text style={{ fontWeight: "bold" }}>Back</Text>
                    </Pressable>
                    <Pressable onPress={handleSignUp} disabled={!step3Valid} style={{ padding: 16, borderRadius: 12, backgroundColor: step3Valid ? "#8A2BE2" : "#ccc", flex: 1, marginLeft: 8, alignItems: "center" }}>
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
