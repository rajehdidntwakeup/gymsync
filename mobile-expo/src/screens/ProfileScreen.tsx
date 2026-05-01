import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-community/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@services/AuthContext';
import api from '@services/api';
import { User, TimeSlot } from '../types';

const FITNESS_LEVEL_COLORS: Record<string, string> = {
  BEGINNER: '#4CAF50',
  INTERMEDIATE: '#FF9800',
  ADVANCED: '#F44336',
};

const FITNESS_LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
};

interface UserProfile extends User {
  createdAt?: string;
}

/**
 * Reusable label row: icon + label text.
 * Uses a View wrapper so icons lay out cleanly.
 */
function FieldLabel({ icon, children }: { icon: string; children: string }) {
  return (
    <View style={styles.fieldLabelRow}>
      <MaterialCommunityIcons name={icon as any} size={16} color="#666" />
      <Text style={styles.fieldLabel}>{children}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { logout } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editGymLocation, setEditGymLocation] = useState('');
  const [editWorkoutGoals, setEditWorkoutGoals] = useState('');
  const [editFitnessLevel, setEditFitnessLevel] = useState<string>('BEGINNER');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<UserProfile>('/users/me');
      setProfile(response.data);
    } catch (err) {
      setError('Failed to load profile. Pull down to retry.');
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const startEditing = () => {
    if (!profile) return;
    setEditName(profile.name || '');
    setEditGymLocation(profile.gymLocation || '');
    setEditWorkoutGoals(profile.workoutGoals || '');
    setEditFitnessLevel(profile.fitnessLevel || 'BEGINNER');
    setEditing(true);
    setError('');
  };

  const cancelEditing = () => {
    setEditing(false);
    setError('');
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      setError('Name is required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updateData = {
        name: editName.trim(),
        fitnessLevel: editFitnessLevel,
        gymLocation: editGymLocation.trim() || undefined,
        workoutGoals: editWorkoutGoals.trim() || undefined,
      };
      await api.put('/users/me', updateData);
      // Refresh profile data after save
      await fetchProfile();
      setEditing(false);
    } catch (err) {
      setError('Failed to update profile. Please try again.');
      console.error('Profile update failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const formatMemberSince = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const renderSlot = (slot: TimeSlot, index: number) => {
    const dayLabel = DAY_LABELS[slot.dayOfWeek] || slot.dayOfWeek;
    return (
      <View key={index} style={styles.slotItem}>
        <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
        <Text style={styles.slotText}>
          {dayLabel}: {slot.startTime} – {slot.endTime}
        </Text>
      </View>
    );
  };

  // ---- Loading state ----
  if (loading && !profile) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  // ---- Error with no data ----
  if (!profile) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#F44336" />
        <Text style={styles.errorTextLarge}>{error || 'Failed to load profile.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButtonError} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fitnessColor = FITNESS_LEVEL_COLORS[profile.fitnessLevel] || '#999';

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.contentContainer}
    >
      {/* ---- Header ---- */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="account-circle" size={72} color="#1976D2" />
        <Text style={styles.headerName}>{profile.name}</Text>
        <Text style={styles.headerUsername}>@{profile.username}</Text>
      </View>

      {/* ---- Edit / Cancel toggle ---- */}
      <View style={styles.editRow}>
        {editing ? (
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={cancelEditing} disabled={saving}>
              <MaterialCommunityIcons name="close" size={20} color="#F44336" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialCommunityIcons name="check" size={20} color="#fff" />
              )}
              <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.editButton} onPress={startEditing}>
            <MaterialCommunityIcons name="pencil" size={18} color="#1976D2" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ---- Error message ---- */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* ---- Profile Fields ---- */}
      {editing ? (
        <>
          {/* Name */}
          <View style={styles.fieldGroup}>
            <FieldLabel icon="account">Name</FieldLabel>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
            />
          </View>

          {/* Fitness Level */}
          <View style={styles.fieldGroup}>
            <FieldLabel icon="arm-flex">Fitness Level</FieldLabel>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={editFitnessLevel}
                onValueChange={(value: string | number) => setEditFitnessLevel(String(value))}
                style={styles.picker}
              >
                <Picker.Item label="Beginner" value="BEGINNER" />
                <Picker.Item label="Intermediate" value="INTERMEDIATE" />
                <Picker.Item label="Advanced" value="ADVANCED" />
              </Picker>
            </View>
          </View>

          {/* Gym Location */}
          <View style={styles.fieldGroup}>
            <FieldLabel icon="map-marker">Gym Location</FieldLabel>
            <TextInput
              style={styles.input}
              value={editGymLocation}
              onChangeText={setEditGymLocation}
              placeholder="Gym location"
            />
          </View>

          {/* Workout Goals */}
          <View style={styles.fieldGroup}>
            <FieldLabel icon="flag-checkered">Workout Goals</FieldLabel>
            <TextInput
              style={styles.input}
              value={editWorkoutGoals}
              onChangeText={setEditWorkoutGoals}
              placeholder="What are your fitness goals?"
              multiline
            />
          </View>
        </>
      ) : (
        <>
          {/* Name */}
          <View style={styles.fieldGroup}>
            <FieldLabel icon="account">Name</FieldLabel>
            <Text style={styles.fieldValue}>{profile.name}</Text>
          </View>

          {/* Username */}
          <View style={styles.fieldGroup}>
            <FieldLabel icon="at">Username</FieldLabel>
            <Text style={styles.fieldValue}>@{profile.username}</Text>
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <FieldLabel icon="email-outline">Email</FieldLabel>
            <Text style={styles.fieldValue}>{profile.email}</Text>
          </View>

          {/* Fitness Level */}
          <View style={styles.fieldGroup}>
            <FieldLabel icon="arm-flex">Fitness Level</FieldLabel>
            <View
              style={[
                styles.fitnessBadge,
                { backgroundColor: fitnessColor },
              ]}
            >
              <Text style={styles.fitnessBadgeText}>
                {FITNESS_LEVEL_LABELS[profile.fitnessLevel] || profile.fitnessLevel}
              </Text>
            </View>
          </View>

          {/* Gym Location */}
          <View style={styles.fieldGroup}>
            <FieldLabel icon="map-marker">Gym Location</FieldLabel>
            <Text style={styles.fieldValue}>
              {profile.gymLocation || 'Not set'}
            </Text>
          </View>

          {/* Workout Goals */}
          <View style={styles.fieldGroup}>
            <FieldLabel icon="flag-checkered">Workout Goals</FieldLabel>
            <Text style={styles.fieldValue}>
              {profile.workoutGoals || 'Not set'}
            </Text>
          </View>

          {/* Available Schedule */}
          {profile.availableSlots && profile.availableSlots.length > 0 && (
            <View style={styles.fieldGroup}>
              <FieldLabel icon="calendar-clock">Available Schedule</FieldLabel>
              <View style={styles.slotsContainer}>
                {profile.availableSlots.map((slot, i) => renderSlot(slot, i))}
              </View>
            </View>
          )}

          {/* Member Since */}
          <View style={styles.fieldGroup}>
            <FieldLabel icon="calendar">Member Since</FieldLabel>
            <Text style={styles.fieldValue}>
              {formatMemberSince(profile.createdAt)}
            </Text>
          </View>
        </>
      )}

      {/* ---- Logout Button ---- */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        disabled={saving}
      >
        <MaterialCommunityIcons name="logout" size={20} color="#F44336" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerUsername: {
    fontSize: 16,
    color: '#888',
    marginTop: 2,
  },

  // Edit row
  editRow: {
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
  },
  editButtonText: {
    color: '#1976D2',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFEBEE',
  },
  cancelButtonText: {
    color: '#F44336',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#1976D2',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },

  // Error
  errorText: {
    color: '#F44336',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorTextLarge: {
    color: '#F44336',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  // Fields
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  fieldValue: {
    fontSize: 16,
    color: '#333',
  },

  // Fitness badge
  fitnessBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 2,
  },
  fitnessBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  // Schedule slots
  slotsContainer: {
    marginTop: 4,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  slotText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 6,
  },

  // Edit mode inputs
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#FAFAFA',
    marginTop: 2,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    marginTop: 2,
  },
  picker: {
    height: 50,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
    marginTop: 24,
  },
  logoutButtonError: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  logoutText: {
    color: '#F44336',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 6,
  },
});