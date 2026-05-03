import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView } from 'react-native';
import { Picker } from '@react-native-community/picker';
import { useAuth } from '@services/AuthContext';

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
  const [error, setError] = useState('');
  const { register } = useAuth();

  const clearError = () => {
    if (error) setError('');
  };

  const handleRegister = async () => {
    // Validation
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!form.username.trim()) {
      setError('Username is required.');
      return;
    }
    if (!form.email.trim() || !validateEmail(form.email)) {
      setError('A valid email is required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError('');
    try {
      await register({
        name: form.name,
        username: form.username,
        email: form.email,
        password: form.password,
        fitnessLevel: form.fitnessLevel as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
        gymLocation: form.gymLocation || undefined,
        workoutGoals: form.workoutGoals || undefined,
      });
    } catch (err) {
      setError('Registration failed. Please try again.');
      console.error('Registration failed:', err);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={form.name}
        onChangeText={(text) => { setForm({ ...form, name: text }); clearError(); }}
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={form.username}
        onChangeText={(text) => { setForm({ ...form, username: text }); clearError(); }}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={form.email}
        onChangeText={(text) => { setForm({ ...form, email: text }); clearError(); }}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={form.password}
        onChangeText={(text) => { setForm({ ...form, password: text }); clearError(); }}
      />
      <Text style={styles.label}>Fitness Level</Text>
      <Picker
        selectedValue={form.fitnessLevel}
        onValueChange={(value: string | number) => setForm({ ...form, fitnessLevel: String(value) })}
        style={styles.picker}
      >
        <Picker.Item label="Beginner" value="BEGINNER" />
        <Picker.Item label="Intermediate" value="INTERMEDIATE" />
        <Picker.Item label="Advanced" value="ADVANCED" />
      </Picker>
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
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  picker: {
    marginBottom: 10,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
});