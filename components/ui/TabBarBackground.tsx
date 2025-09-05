import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet } from 'react-native';

export default function TabBarBackground() {
  return <BlurView tint="light" intensity={100} style={StyleSheet.absoluteFill} />;
}