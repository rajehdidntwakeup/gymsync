import React, { useState, useEffect } from 'react';
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
import api from '../services/api';

interface Slot {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export default function ScheduleScreen() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [day, setDay] = useState('MONDAY');
  const [start, setStart] = useState('18:00');
  const [end, setEnd] = useState('20:00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Slot[]>('/users/schedule');
      setSlots(response.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load schedule.');
    } finally {
      setLoading(false);
    }
  };

  const addSlot = () => {
    if (!day || !start || !end) {
      Alert.alert('Missing fields', 'Please select day, start, and end time.');
      return;
    }
    setSlots([...slots, { dayOfWeek: day, startTime: start, endTime: end }]);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post('/users/schedule', { slots });
      Alert.alert('Saved', 'Schedule updated successfully.');
    } catch (err) {
      console.error(err);
      setError('Failed to save schedule.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Availability Schedule</Text>
      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.label}>Day</Text>
      <View style={styles.row}>
        {DAYS.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.dayChip, day === d && styles.dayChipActive]}
            onPress={() => setDay(d)}
          >
            <Text style={[styles.dayText, day === d && styles.dayTextActive]}>{d.slice(0, 3)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.timeRow}>
        <View style={styles.timeField}>
          <Text style={styles.label}>Start</Text>
          <TextInput style={styles.input} value={start} onChangeText={setStart} placeholder="18:00" />
        </View>
        <View style={styles.timeField}>
          <Text style={styles.label}>End</Text>
          <TextInput style={styles.input} value={end} onChangeText={setEnd} placeholder="20:00" />
        </View>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={addSlot}>
        <Text style={styles.addButtonText}>Add Slot</Text>
      </TouchableOpacity>

      <FlatList
        data={slots}
        keyExtractor={(_, index) => index.toString()}
        style={styles.list}
        renderItem={({ item, index }) => (
          <View style={styles.slot}>
            <Text style={styles.slotText}>
              {item.dayOfWeek} {item.startTime} - {item.endTime}
            </Text>
            <TouchableOpacity onPress={() => removeSlot(index)}>
              <Text style={styles.remove}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No slots added yet.</Text>}
      />

      <TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving}>
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Schedule'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#333' },
  label: { fontSize: 14, color: '#666', marginBottom: 6, marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
    backgroundColor: '#fff',
  },
  dayChipActive: { backgroundColor: '#4CAF50' },
  dayText: { color: '#4CAF50', fontWeight: '600', fontSize: 12 },
  dayTextActive: { color: '#fff' },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeField: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  addButton: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginVertical: 12,
  },
  addButtonText: { color: '#4CAF50', fontWeight: 'bold' },
  list: { marginVertical: 8 },
  slot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  slotText: { fontSize: 14, color: '#333' },
  remove: { color: '#D32F2F', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#999', marginTop: 12 },
  error: { color: '#D32F2F', marginBottom: 8, textAlign: 'center' },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
