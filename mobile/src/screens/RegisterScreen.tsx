import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '@services/AuthContext';

export default function RegisterScreen({ navigation }: any) {
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    fitnessLevel: 'BEGINNER',
    gymLocation: '',
    workoutGoals: '',
  });
  const { register } = useAuth();

  const handleRegister = async () => {
    try {
      await register(form as any);
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={form.name}
        onChangeText={(text) => setForm({ ...form, name: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={form.username}
        onChangeText={(text) => setForm({ ...form, username: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        value={form.email}
        onChangeText={(text) => setForm({ ...form, email: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={form.password}
        onChangeText={(text) => setForm({ ...form, password: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="Gym Location"
        value={form.gymLocation}
        onChangeText={(text) => setForm({ ...form, gymLocation: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="Workout Goals"
        value={form.workoutGoals}
        onChangeText={(text) => setForm({ ...form, workoutGoals: text })}
      />
      <Button title="Register" onPress={handleRegister} />
      <Button title="Back to Login" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
});