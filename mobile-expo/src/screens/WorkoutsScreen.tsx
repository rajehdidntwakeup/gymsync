import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import api from '../services/api';
import type { StackParamList } from '../types';

interface WorkoutLog {
  id: number;
  workoutDate: string;
  notes: string;
  durationMinutes: number;
  caloriesBurned: number;
  rating: number;
}

export default function WorkoutsScreen() {
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [stats, setStats] = useState({ totalWorkouts: 0, thisWeek: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const navigation = useNavigation<NativeStackNavigationProp<StackParamList>>();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError('');
      const [workoutsRes, statsRes] = await Promise.all([
        api.get('/workouts'),
        api.get('/workouts/stats'),
      ]);
      setWorkouts(workoutsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load workouts:', err);
      setError('Failed to load workouts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/workouts/${id}`);
              setWorkouts((prev) => prev.filter((w) => w.id !== id));
            } catch (err) {
              console.error('Failed to delete workout:', err);
              Alert.alert('Error', 'Failed to delete workout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderWorkout = ({ item }: { item: WorkoutLog }) => (
    <TouchableOpacity
      style={styles.workoutCard}
      onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id })}
      onLongPress={() => handleDelete(item.id)}
    >
      <View style={styles.workoutHeader}>
        <Text style={styles.workoutDate}>
          {new Date(item.workoutDate).toLocaleDateString()}
        </Text>
        {item.rating && (
          <View style={styles.rating}>
            <Icon name="star" size={16} color="#FFD700" />
            <Text>{item.rating}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.workoutStats}>
        {item.durationMinutes && (
          <View style={styles.stat}>
            <Icon name="clock-outline" size={16} color="#666" />
            <Text>{item.durationMinutes} min</Text>
          </View>
        )}
        {item.caloriesBurned && (
          <View style={styles.stat}>
            <Icon name="fire" size={16} color="#FF5722" />
            <Text>{item.caloriesBurned} cal</Text>
          </View>
        )}
      </View>
      
      {item.notes && (
        <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>
      )}
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.thisWeek}</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.thisMonth}</Text>
          <Text style={styles.statLabel}>This Month</Text>
        </View>
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderWorkout}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="dumbbell" size={64} color="#ddd" />
            <Text style={styles.emptyText}>No workouts logged yet</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first workout</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('LogWorkout')}
      >
        <Icon name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 10,
    padding: 20,
    borderRadius: 10,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#4CAF50' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 5 },
  workoutCard: {
    backgroundColor: '#fff',
    margin: 10,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutDate: { fontSize: 16, fontWeight: 'bold' },
  rating: { flexDirection: 'row', alignItems: 'center' },
  workoutStats: { flexDirection: 'row', marginTop: 10 },
  stat: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  notes: { marginTop: 10, color: '#666', fontSize: 14 },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, color: '#999', marginTop: 20 },
  emptySubtext: { fontSize: 14, color: '#bbb', marginTop: 10 },
  errorText: { color: 'red', textAlign: 'center', margin: 10, fontSize: 14 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
});