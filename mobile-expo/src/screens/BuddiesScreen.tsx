import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import type { User } from '../types';

export default function BuddiesScreen() {
  const navigation = useNavigation<any>();
  const [gymLocation, setGymLocation] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState('');
  const [buddies, setBuddies] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBuddies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<User[]>('/users/buddies', {
        params: {
          gymLocation: gymLocation.trim() || undefined,
          fitnessLevel: fitnessLevel || undefined,
        },
      });
      setBuddies(response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load buddies. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [gymLocation, fitnessLevel]);

  useEffect(() => {
    loadBuddies();
  }, []);

  const renderBuddy = ({ item }: { item: User }) => (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>@{item.username}</Text>
        <Text style={styles.meta}>
          {item.fitnessLevel} · {item.gymLocation || 'No gym listed'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => navigation.navigate('Chat', { partnerUsername: item.username })}
      >
        <Text style={styles.chatButtonText}>Chat</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find Buddies</Text>

      <Text style={styles.label}>Gym location</Text>
      <TextInput
        style={styles.input}
        value={gymLocation}
        onChangeText={setGymLocation}
        placeholder="e.g. Vienna"
      />

      <Text style={styles.label}>Fitness level</Text>
      <View style={styles.filterRow}>
        {['', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((level) => (
          <TouchableOpacity
            key={level || 'all'}
            style={[styles.filterChip, fitnessLevel === level && styles.filterChipActive]}
            onPress={() => setFitnessLevel(level)}
          >
            <Text style={[styles.filterText, fitnessLevel === level && styles.filterTextActive]}>
              {level || 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.searchButton} onPress={loadBuddies} disabled={loading}>
        <Text style={styles.searchButtonText}>{loading ? 'Searching...' : 'Search'}</Text>
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}

      {loading && buddies.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
        <FlatList
          data={buddies}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderBuddy}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No buddies found. Try different filters.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#333' },
  label: { fontSize: 14, color: '#666', marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
    backgroundColor: '#fff',
  },
  filterChipActive: { backgroundColor: '#4CAF50' },
  filterText: { color: '#4CAF50', fontWeight: '600', fontSize: 13 },
  filterTextActive: { color: '#fff' },
  searchButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
  },
  searchButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  error: { color: '#D32F2F', marginBottom: 12, textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { color: '#999', fontSize: 16, textAlign: 'center' },
  list: { paddingBottom: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  meta: { fontSize: 13, color: '#666', marginTop: 2 },
  chatButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chatButtonText: { color: '#fff', fontWeight: '600' },
});