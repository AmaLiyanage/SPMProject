import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function StoriesScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text type="title" style={styles.title}>Stories</Text>
        <Text style={styles.subtitle}>
          Inspiring stories from women leaders and their journeys
        </Text>
        
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Stories feature coming soon...
          </Text>
          <Text style={styles.description}>
            Here you'll find powerful narratives from women who have broken barriers, 
            overcome challenges, and created positive change in their communities and beyond.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#8B5CF6',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    opacity: 0.8,
  },
  placeholder: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#8B5CF6',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.7,
  },
});