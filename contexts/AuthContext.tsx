import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthContextProps {
  user: any | null;
  setUser: (user: any | null) => void;
}

export const AuthContext = createContext<AuthContextProps>({
  user: null,
  setUser: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      const sessionStr = await AsyncStorage.getItem('supabase_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        setUser(session.user);
        await supabase.auth.setSession(session);
      }
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("Auth state changed:", _event, session);

      if (session && session.user) {
        // Save session locally
        await AsyncStorage.setItem('supabase_session', JSON.stringify(session));
        setUser(session.user);

        const isConfirmed = session.user.confirmed_at !== null;
        if (isConfirmed) {
          const metadata = session.user.user_metadata || {};
          const role = metadata.role || "mentee"; // default mentee if role missing

          if (role === "mentor") {
            // 👨‍🏫 Mentor table fields
            const mentorData = {
              id: session.user.id,
              full_name: metadata.full_name || '',
              expertise: metadata.expertise || [],
              availability: metadata.availability || '',
              interests: metadata.interests || [],
            };

            console.log("Upserting mentor:", mentorData);
            const { error } = await supabase
              .from("mentors")
              .upsert(mentorData, { onConflict: 'id' });

            if (error) console.error("Error syncing mentor:", error);
            else console.log("Mentor synced successfully!");

          } else {
            // 👩‍🎓 Mentee table fields
            const menteeData = {
              id: session.user.id,
              full_name: metadata.full_name || '',
              interests: metadata.interests || [],
            };

            console.log("Upserting mentee:", menteeData);
            const { error } = await supabase
              .from("mentees")
              .upsert(menteeData, { onConflict: 'id' });

            if (error) console.error("Error syncing mentee:", error);
            else console.log("Mentee synced successfully!");
          }

        } else {
          console.log('User not confirmed yet. Will sync after verification.');
        }

      } else {
        await AsyncStorage.removeItem('supabase_session');
        setUser(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
