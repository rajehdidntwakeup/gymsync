import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import api from '../services/api';
import type { StackParamList, WorkoutLog, ExerciseSet } from '../types';

type WorkoutDetailNavProp = NativeStackNavigationProp<StackParamList, 'WorkoutDetail'>;
type WorkoutDetailRouteProp = RouteProp<StackParamList, 'WorkoutDetail'>;

interface ExerciseGroup {
  exerciseName: string;
  sets: ExerciseSet[];
}

export default function WorkoutDetailScreen() {
  const navigation = useNavigation<WorkoutDetailNavProp>();
  const route = useRoute<WorkoutDetailRouteProp>();
  const { workoutId } = route.params;

  const [workout, setWorkout] = useState<WorkoutLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWorkout = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get<WorkoutLog>(`/workouts/${workoutId}`);
      setWorkout(response.data);
    } catch (err) {
      console.error('Failed to load workout:', err);
      setError('Failed to load workout details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [workoutId]);

  useEffect(() => {
    fetchWorkout();
  }, [fetchWorkout]);

  // Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchWorkout();
    }, [fetchWorkout])
  );

  const handleDelete = () => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/workouts/${workoutId}`);
              navigation.goBack();
            } catch (err) {
              console.error('Failed to delete workout:', err);
              Alert.alert('Error', 'Failed to delete workout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const groupExercises = (sets: ExerciseSet[]): ExerciseGroup[] => {
    const map = new Map<string, ExerciseSet[]>();
    for (const set of sets) {
      const name = set.exerciseName || `Exercise #${set.exerciseId}`;
      if (!map.has(name)) {
        map.set(name, []);
      }
      map.get(name)!.push(set);
    }
    return Array.from(map.entries()).map(([exerciseName, sets]) => ({
      exerciseName,
      sets: sets.sort((a, b) => a.setNumber - b.setNumber),
    }));
  };

  const renderStars = (rating: number | null) => {
    if (rating === null) return null;
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={20}
          color={i <= rating ? '#FFD700' : '#ccc'}
        />
      );
    }
    return <View style={styles.starsRow}>{stars}</View>;
  };

  if (loading && !workout) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (error && !workout) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="alert-circle-outline" size={48} color="#FF5722" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchWorkout}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!workout) return null;

  const exerciseGroups = groupExercises(workout.exerciseSets || []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Details</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Icon name="delete-outline" size={24} color="#FF5722" />
        </TouchableOpacity>
      </View>

      {/* Date and Rating Card */}
      <View style={styles.infoCard}>
        <View style={styles.dateRow}>
          <Icon name="calendar" size={20} color="#4CAF50" />
          <Text style={styles.dateText}>
            {new Date(workout.workoutDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>

        <View style={styles.statsRow}>
          {workout.durationMinutes !== null && workout.durationMinutes !== undefined && (
            <View style={styles.statChip}>
              <Icon name="clock-outline" size={16} color="#4CAF50" />
              <Text style={styles.statText}>{workout.durationMinutes} min</Text>
            </View>
          )}
          {workout.caloriesBurned !== null && workout.caloriesBurned !== undefined && (
            <View style={styles.statChip}>
              <Icon name="fire" size={16} color="#FF5722" />
              <Text style={styles.statText}>{workout.caloriesBurned} cal</Text>
            </View>
          )}
        </View>

        {workout.rating !== null && workout.rating !== undefined && (
          <View style={styles.ratingRow}>
            <Text style={styles.ratingLabel}>Rating:</Text>
            {renderStars(workout.rating)}
          </View>
        )}
      </View>

      {/* Notes */}
      {workout.notes && (
        <View style={styles.notesCard}>
          <View style={styles.notesHeader}>
            <Icon name="note-text-outline" size={18} color="#666" />
            <Text style={styles.notesTitle}>Notes</Text>
          </View>
          <Text style={styles.notesText}>{workout.notes}</Text>
        </View>
      )}

      {/* Exercise Sets */}
      <View style={styles.sectionHeader}>
        <Icon name="dumbbell" size={20} color="#4CAF50" />
        <Text style={styles.sectionTitle}>
          Exercises ({workout.exerciseSets?.length || 0} sets)
        </Text>
      </View>

      {exerciseGroups.length === 0 ? (
        <View style={styles.emptyExercises}>
          <Icon name="dumbbell" size={40} color="#ddd" />
          <Text style={styles.emptyText}>No exercises recorded</Text>
        </View>
      ) : (
        exerciseGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>{group.exerciseName}</Text>
            {group.sets.map((set) => (
              <View key={set.id} style={styles.setRow}>
                <View style={styles.setInfo}>
                  <Text style={styles.setNumberBadge}>Set {set.setNumber}</Text>
                  <Text style={styles.setDetail}>
                    {set.reps !== null && set.reps !== undefined
                      ? `${set.reps} reps`
                      : '— reps'}
                    {' × '}
                    {set.weightKg !== null && set.weightKg !== undefined
                      ? `${set.weightKg} kg`
                      : '— kg'}
                  </Text>
                </View>
                <Icon
                  name={set.completed ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                  size={22}
                  color={set.completed ? '#4CAF50' : '#ccc'}
                />
              </View>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 30,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  deleteButton: {
    padding: 8,
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 10,
    marginBottom: 4,
  },
  statText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  starsRow: {
    flexDirection: 'row',
  },
  notesCard: {
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginBottom: 5,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  notesText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 6,
  },
  exerciseCard: {
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginTop: 8,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  setInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  setNumberBadge: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
    width: 60,
  },
  setDetail: {
    fontSize: 14,
    color: '#555',
  },
  emptyExercises: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
  errorText: {
    color: '#FF5722',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    marginHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});