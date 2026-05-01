import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '@services/api';
import type { Exercise } from '../types';

interface ExerciseSet {
  exerciseId: number;
  exerciseName: string;
  setNumber: number;
  reps: string;
  weightKg: string;
}

// Helper: group sets by exerciseId, preserving insertion order
function groupSetsByExercise(sets: ExerciseSet[]): { exerciseId: number; exerciseName: string; sets: ExerciseSet[] }[] {
  const map = new Map<number, { exerciseId: number; exerciseName: string; sets: ExerciseSet[] }>();
  for (const set of sets) {
    if (!map.has(set.exerciseId)) {
      map.set(set.exerciseId, { exerciseId: set.exerciseId, exerciseName: set.exerciseName, sets: [] });
    }
    map.get(set.exerciseId)!.sets.push(set);
  }
  return Array.from(map.values());
}

export default function LogWorkoutScreen() {
  const navigation = useNavigation();

  // Workout fields
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [sets, setSets] = useState<ExerciseSet[]>([]);

  // Exercise picker modal state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [exercisesError, setExercisesError] = useState<string | null>(null);

  // Save workout state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch exercises when modal opens
  const fetchExercises = useCallback(async () => {
    setExercisesLoading(true);
    setExercisesError(null);
    try {
      const response = await api.get<Exercise[]>('/workouts/exercises');
      setExercises(response.data);
      setFilteredExercises(response.data);
    } catch (err) {
      console.error(err);
      setExercisesError('Failed to load exercises. Pull down to retry.');
    } finally {
      setExercisesLoading(false);
    }
  }, []);

  // Open picker
  const openPicker = () => {
    setSearchQuery('');
    setPickerVisible(true);
    fetchExercises();
  };

  // Filter exercises client-side as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredExercises(exercises);
      return;
    }
    const q = searchQuery.toLowerCase();
    const filtered = exercises.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.primaryMuscleGroup.toLowerCase().includes(q)
    );
    setFilteredExercises(filtered);
  }, [searchQuery, exercises]);

  // Select an exercise from the picker
  const selectExercise = (exercise: Exercise) => {
    setPickerVisible(false);

    // Calculate next set number for this exercise
    const existingSets = sets.filter((s) => s.exerciseId === exercise.id);
    const nextSetNumber = existingSets.length + 1;

    const newSet: ExerciseSet = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      setNumber: nextSetNumber,
      reps: '',
      weightKg: '',
    };
    setSets([...sets, newSet]);
  };

  // Add another set for an already-added exercise
  const addSetForExercise = (exerciseId: number, exerciseName: string) => {
    const existingSets = sets.filter((s) => s.exerciseId === exerciseId);
    const nextSetNumber = existingSets.length + 1;
    const newSet: ExerciseSet = {
      exerciseId,
      exerciseName,
      setNumber: nextSetNumber,
      reps: '',
      weightKg: '',
    };
    setSets([...sets, newSet]);
  };

  // Remove a specific set and re-number remaining sets for that exercise
  const removeSet = (exerciseId: number, setNumber: number) => {
    const updated = sets
      .filter((s) => !(s.exerciseId === exerciseId && s.setNumber === setNumber))
      .map((s) => {
        if (s.exerciseId === exerciseId && s.setNumber > setNumber) {
          return { ...s, setNumber: s.setNumber - 1 };
        }
        return s;
      });
    setSets(updated);
  };

  // Update a set field
  const updateSet = (exerciseId: number, setNumber: number, field: 'reps' | 'weightKg', value: string) => {
    const updated = sets.map((s) => {
      if (s.exerciseId === exerciseId && s.setNumber === setNumber) {
        return { ...s, [field]: value };
      }
      return s;
    });
    setSets(updated);
  };

  // Save workout
  const saveWorkout = async () => {
    if (saving) return;
    setSaveError(null);
    setSaving(true);

    try {
      const workout = {
        workoutDate: date.toISOString().split('T')[0],
        durationMinutes: duration ? parseInt(duration) : null,
        caloriesBurned: calories ? parseInt(calories) : null,
        rating,
        notes: notes || null,
      };

      const response = await api.post('/workouts', workout);
      const workoutId = response.data.id;

      // Save all sets that have reps and weight filled
      for (const set of sets) {
        if (set.reps && set.weightKg) {
          await api.post(`/workouts/${workoutId}/sets`, {
            exerciseId: set.exerciseId,
            setNumber: set.setNumber,
            reps: parseInt(set.reps),
            weightKg: parseFloat(set.weightKg),
          });
        }
      }

      Alert.alert('Success', 'Workout saved!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to save workout';
      setSaveError(msg);
      Alert.alert('Error', 'Failed to save workout');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Category badge color map
  const categoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      STRENGTH: '#4CAF50',
      CARDIO: '#2196F3',
      FLEXIBILITY: '#9C27B0',
      BALANCE: '#FF9800',
      ENDURANCE: '#F44336',
      PLYOMETRIC: '#795548',
    };
    return colors[category.toUpperCase()] || '#607D8B';
  };

  // Grouped exercises for display
  const grouped = groupSetsByExercise(sets);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Log Workout</Text>

        {/* Save error banner */}
        {saveError && (
          <View style={styles.errorBanner}>
            <Icon name="alert-circle" size={18} color="#D32F2F" />
            <Text style={styles.errorText}>{saveError}</Text>
            <TouchableOpacity onPress={() => setSaveError(null)}>
              <Icon name="close" size={18} color="#D32F2F" />
            </TouchableOpacity>
          </View>
        )}

        {/* Date */}
        <TouchableOpacity
          style={styles.inputGroup}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.label}>Date</Text>
          <View style={styles.dateDisplay}>
            <Icon name="calendar" size={20} color="#666" />
            <Text style={{ marginLeft: 8 }}>{date.toLocaleDateString()}</Text>
          </View>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}

        {/* Duration & Calories */}
        <View style={styles.row}>
          <View style={styles.inputGroupHalf}>
            <Text style={styles.label}>Duration (min)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={duration}
              onChangeText={setDuration}
              placeholder="60"
            />
          </View>
          <View style={styles.inputGroupHalf}>
            <Text style={styles.label}>Calories</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={calories}
              onChangeText={setCalories}
              placeholder="300"
            />
          </View>
        </View>

        {/* Rating */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Rating</Text>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Icon
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={32}
                  color="#FFD700"
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Exercise Sets — grouped by exercise */}
        <View style={styles.setsSection}>
          <Text style={styles.sectionTitle}>Exercises</Text>

          {sets.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="dumbbell" size={40} color="#ccc" />
              <Text style={styles.emptyText}>No exercises added yet</Text>
              <Text style={styles.emptySubtext}>Tap "Add Exercise" to get started</Text>
            </View>
          )}

          {grouped.map((group) => (
            <View key={group.exerciseId} style={styles.exerciseGroup}>
              {/* Exercise header */}
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseHeaderLeft}>
                  <Icon name="dumbbell" size={16} color="#4CAF50" />
                  <Text style={styles.exerciseGroupTitle}>{group.exerciseName}</Text>
                </View>
                <TouchableOpacity
                  style={styles.addSetSmallButton}
                  onPress={() => addSetForExercise(group.exerciseId, group.exerciseName)}
                >
                  <Icon name="plus" size={16} color="#4CAF50" />
                  <Text style={styles.addSetSmallText}>Add Set</Text>
                </TouchableOpacity>
              </View>

              {/* Sets under this exercise */}
              {group.sets.map((set) => (
                <View key={`${set.exerciseId}-${set.setNumber}`} style={styles.setRow}>
                  <Text style={styles.setNumberBadge}>Set {set.setNumber}</Text>
                  <TextInput
                    style={styles.setInput}
                    placeholder="Reps"
                    keyboardType="numeric"
                    value={set.reps}
                    onChangeText={(v) => updateSet(set.exerciseId, set.setNumber, 'reps', v)}
                  />
                  <TextInput
                    style={styles.setInput}
                    placeholder="kg"
                    keyboardType="numeric"
                    value={set.weightKg}
                    onChangeText={(v) => updateSet(set.exerciseId, set.setNumber, 'weightKg', v)}
                  />
                  <TouchableOpacity
                    style={styles.removeSetButton}
                    onPress={() => removeSet(set.exerciseId, set.setNumber)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon name="close" size={18} color="#D32F2F" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))}

          <TouchableOpacity style={styles.addSetButton} onPress={openPicker}>
            <Icon name="plus" size={20} color="#4CAF50" />
            <Text style={styles.addSetText}>Add Exercise</Text>
          </TouchableOpacity>
        </View>

        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
            placeholder="How did the workout feel?"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveWorkout}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Workout</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* ── Exercise Picker Modal ── */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Exercise</Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)}>
              <Icon name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Loading state */}
          {exercisesLoading && (
            <View style={styles.modalCenter}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Loading exercises…</Text>
            </View>
          )}

          {/* Error state */}
          {exercisesError && !exercisesLoading && (
            <View style={styles.modalCenter}>
              <Icon name="alert-circle-outline" size={48} color="#D32F2F" />
              <Text style={styles.errorTextCenter}>{exercisesError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchExercises}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Exercise list */}
          {!exercisesLoading && !exercisesError && (
            <FlatList
              data={filteredExercises}
              keyExtractor={(item) => item.id.toString()}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.modalCenter}>
                  <Icon name="magnify-close" size={48} color="#ccc" />
                  <Text style={styles.emptyModalText}>
                    {searchQuery ? 'No exercises match your search' : 'No exercises available'}
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.exerciseItem}
                  onPress={() => selectExercise(item)}
                  activeOpacity={0.6}
                >
                  <View style={styles.exerciseItemLeft}>
                    <Text style={styles.exerciseItemName}>{item.name}</Text>
                    <Text style={styles.exerciseItemMuscle}>{item.primaryMuscleGroup}</Text>
                  </View>
                  <View style={styles.exerciseItemRight}>
                    <View style={[styles.categoryBadge, { backgroundColor: categoryColor(item.category) }]}>
                      <Text style={styles.categoryBadgeText}>{item.category}</Text>
                    </View>
                    <Icon name="chevron-right" size={20} color="#ccc" />
                  </View>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.exerciseItemSeparator} />}
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    gap: 8,
  },
  errorText: { flex: 1, color: '#D32F2F', fontSize: 14 },

  // Input groups
  inputGroup: { marginBottom: 20 },
  inputGroupHalf: { flex: 1, marginRight: 10 },
  label: { fontSize: 14, color: '#666', marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  row: { flexDirection: 'row' },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  ratingContainer: { flexDirection: 'row', gap: 10 },

  // Sets section
  setsSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    marginBottom: 12,
  },
  emptyText: { fontSize: 16, color: '#999', marginTop: 8 },
  emptySubtext: { fontSize: 13, color: '#bbb', marginTop: 4 },

  // Exercise group (exercise name header + sets underneath)
  exerciseGroup: {
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    overflow: 'hidden',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#E8F5E9',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  exerciseHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  exerciseGroupTitle: { fontSize: 16, fontWeight: '700', color: '#2E7D32' },
  addSetSmallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#fff',
    gap: 3,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  addSetSmallText: { fontSize: 12, color: '#4CAF50', fontWeight: '600' },

  // Set row
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  setNumberBadge: {
    width: 55,
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  setInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    textAlign: 'center',
    fontSize: 14,
    backgroundColor: '#fff',
  },
  removeSetButton: {
    padding: 4,
    borderRadius: 12,
  },

  // Add exercise button
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 8,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addSetText: { color: '#4CAF50', marginLeft: 5, fontWeight: 'bold' },

  // Notes
  notesInput: { height: 100, textAlignVertical: 'top' },

  // Save button
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // ── Modal styles ──
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 16, color: '#333' },

  // Modal center (loading / error / empty)
  modalCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  errorTextCenter: { marginTop: 12, fontSize: 16, color: '#D32F2F', textAlign: 'center' },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  retryButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  emptyModalText: { marginTop: 12, fontSize: 16, color: '#999', textAlign: 'center' },

  // Exercise list item
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  exerciseItemLeft: { flex: 1, marginRight: 12 },
  exerciseItemName: { fontSize: 16, fontWeight: '600', color: '#333' },
  exerciseItemMuscle: { fontSize: 13, color: '#888', marginTop: 2 },
  exerciseItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Category badge
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  exerciseItemSeparator: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 20 },
});