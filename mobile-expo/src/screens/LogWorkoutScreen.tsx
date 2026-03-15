import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '@services/api';

interface ExerciseSet {
  exerciseId: number;
  exerciseName: string;
  setNumber: number;
  reps: string;
  weightKg: string;
}

export default function LogWorkoutScreen() {
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [sets, setSets] = useState<ExerciseSet[]>([]);
  const navigation = useNavigation();

  const addSet = () => {
    // TODO: Open exercise picker modal
    const newSet: ExerciseSet = {
      exerciseId: 1,
      exerciseName: 'Bench Press',
      setNumber: sets.filter(s => s.exerciseId === 1).length + 1,
      reps: '',
      weightKg: '',
    };
    setSets([...sets, newSet]);
  };

  const updateSet = (index: number, field: keyof ExerciseSet, value: string) => {
    const updated = [...sets];
    updated[index] = { ...updated[index], [field]: value };
    setSets(updated);
  };

  const saveWorkout = async () => {
    try {
      const workout = {
        workoutDate: date.toISOString().split('T')[0],
        durationMinutes: duration ? parseInt(duration) : null,
        caloriesBurned: calories ? parseInt(calories) : null,
        rating,
        notes,
      };

      const response = await api.post('/workouts', workout);
      const workoutId = response.data.id;

      // Save all sets
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
    } catch (error) {
      Alert.alert('Error', 'Failed to save workout');
      console.error(error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Log Workout</Text>

      {/* Date */}
      <TouchableOpacity
        style={styles.inputGroup}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.label}>Date</Text>
        <View style={styles.dateDisplay}>
          <Icon name="calendar" size={20} color="#666" />
          <Text>{date.toLocaleDateString()}</Text>
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

      {/* Exercise Sets */}
      <View style={styles.setsSection}>
        <Text style={styles.label}>Exercises</Text>
        
        {sets.map((set, index) => (
          <View key={index} style={styles.setRow}>
            <Text style={styles.exerciseName}>{set.exerciseName}</Text>
            <Text style={styles.setNumber}>Set {set.setNumber}</Text>
            <TextInput
              style={styles.setInput}
              placeholder="Reps"
              keyboardType="numeric"
              value={set.reps}
              onChangeText={(v) => updateSet(index, 'reps', v)}
            />
            <TextInput
              style={styles.setInput}
              placeholder="kg"
              keyboardType="numeric"
              value={set.weightKg}
              onChangeText={(v) => updateSet(index, 'weightKg', v)}
            />
          </View>
        ))}

        <TouchableOpacity style={styles.addSetButton} onPress={addSet}>
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
      <TouchableOpacity style={styles.saveButton} onPress={saveWorkout}>
        <Text style={styles.saveButtonText}>Save Workout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
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
  setsSection: { marginBottom: 20 },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  exerciseName: { flex: 1, fontWeight: 'bold' },
  setNumber: { width: 60, color: '#666' },
  setInput: {
    width: 60,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    marginLeft: 5,
    textAlign: 'center',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addSetText: { color: '#4CAF50', marginLeft: 5, fontWeight: 'bold' },
  notesInput: { height: 100, textAlignVertical: 'top' },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});