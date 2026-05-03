import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '@services/AuthContext';
import api from '@services/api';
import type { WorkoutLog } from '../types';

interface WorkoutStats {
  totalWorkouts: number;
  thisWeek: number;
  thisMonth: number;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [latestWorkout, setLatestWorkout] = useState<WorkoutLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, unreadRes, workoutsRes] = await Promise.all([
        api.get('/workouts/stats'),
        api.get('/chat/unread'),
        api.get('/workouts'),
      ]);
      setStats(statsRes.data);
      setUnreadCount(unreadRes.data.count ?? 0);
      const workouts: WorkoutLog[] = workoutsRes.data;
      setLatestWorkout(workouts.length > 0 ? workouts[0] : null);
    } catch (err) {
      console.error('Failed to load home data:', err);
      setError('Failed to load dashboard data. Pull down to retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  const firstName = user?.name?.split(' ')[0] ?? 'Athlete';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>
          Hey, {firstName}! 💪
        </Text>
        <Text style={styles.welcomeSubtext}>
          {getGreeting()} — ready to crush it?
        </Text>
      </View>

      {!!error && (
        <View style={styles.errorCard}>
          <Icon name="alert-circle-outline" size={20} color="#D32F2F" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: '#4CAF50' }]}>
          <Icon name="dumbbell" size={24} color="#4CAF50" />
          <Text style={styles.statValue}>{stats?.totalWorkouts ?? 0}</Text>
          <Text style={styles.statLabel}>Total Workouts</Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: '#2196F3' }]}>
          <Icon name="calendar-week" size={24} color="#2196F3" />
          <Text style={styles.statValue}>{stats?.thisWeek ?? 0}</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: '#FF9800' }]}>
          <Icon name="calendar-month" size={24} color="#FF9800" />
          <Text style={styles.statValue}>{stats?.thisMonth ?? 0}</Text>
          <Text style={styles.statLabel}>This Month</Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: unreadCount > 0 ? '#E91E63' : '#9E9E9E' }]}>
          <Icon
            name={unreadCount > 0 ? 'message-badge' : 'message-outline'}
            size={24}
            color={unreadCount > 0 ? '#E91E63' : '#9E9E9E'}
          />
          <Text style={styles.statValue}>{unreadCount}</Text>
          <Text style={styles.statLabel}>Unread Messages</Text>
        </View>
      </View>

      {/* Latest Workout */}
      <View style={styles.sectionHeader}>
        <Icon name="history" size={20} color="#333" />
        <Text style={styles.sectionTitle}>Latest Workout</Text>
      </View>

      {latestWorkout ? (
        <View style={styles.workoutCard}>
          <View style={styles.workoutCardHeader}>
            <Text style={styles.workoutDate}>
              {new Date(latestWorkout.workoutDate).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            {latestWorkout.rating != null && (
              <View style={styles.rating}>
                <Icon name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>{latestWorkout.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
          <View style={styles.workoutDetails}>
            {latestWorkout.durationMinutes != null && (
              <View style={styles.detailItem}>
                <Icon name="clock-outline" size={16} color="#666" />
                <Text style={styles.detailText}>{latestWorkout.durationMinutes} min</Text>
              </View>
            )}
            {latestWorkout.caloriesBurned != null && (
              <View style={styles.detailItem}>
                <Icon name="fire" size={16} color="#FF5722" />
                <Text style={styles.detailText}>{latestWorkout.caloriesBurned} cal</Text>
              </View>
            )}
            {latestWorkout.exerciseSets?.length > 0 && (
              <View style={styles.detailItem}>
                <Icon name="format-list-checks" size={16} color="#666" />
                <Text style={styles.detailText}>{latestWorkout.exerciseSets.length} sets</Text>
              </View>
            )}
          </View>
          {latestWorkout.notes && (
            <Text style={styles.workoutNotes} numberOfLines={2}>
              {latestWorkout.notes}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Icon name="dumbbell" size={40} color="#ddd" />
          <Text style={styles.emptyText}>No workouts yet</Text>
          <Text style={styles.emptySubtext}>Head to Workouts tab to log your first session!</Text>
        </View>
      )}
    </ScrollView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  welcomeSection: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  welcomeSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  workoutCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  workoutCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#333',
  },
  workoutDetails: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#555',
  },
  workoutNotes: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  emptyCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#bbb',
    marginTop: 4,
  },
});