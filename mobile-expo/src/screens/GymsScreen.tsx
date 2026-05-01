import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import api from '../services/api';
import type { Gym } from '../types';

export default function GymsScreen() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [studentDiscountOnly, setStudentDiscountOnly] = useState(false);

  useEffect(() => {
    loadGyms();
  }, []);

  const loadGyms = async (city?: string, discountOnly?: boolean) => {
    try {
      setError('');
      if (!refreshing) setLoading(true);

      let gymsData: Gym[];

      if (discountOnly ?? studentDiscountOnly) {
        const res = await api.get<Gym[]>('/gyms/student-discount');
        gymsData = res.data;
        // If also searching by city, filter client-side
        const cityFilter = (city ?? searchCity).trim().toLowerCase();
        if (cityFilter) {
          gymsData = gymsData.filter(
            (g) => g.city && g.city.toLowerCase().includes(cityFilter)
          );
        }
      } else if ((city ?? searchCity).trim()) {
        const res = await api.get<Gym[]>('/gyms/search', {
          params: { city: (city ?? searchCity).trim() },
        });
        gymsData = res.data;
      } else {
        const res = await api.get<Gym[]>('/gyms');
        gymsData = res.data;
      }

      setGyms(gymsData);
    } catch (err) {
      console.error('Failed to load gyms:', err);
      setError('Failed to load gyms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGyms();
    setRefreshing(false);
  };

  const handleSearch = useCallback(() => {
    loadGyms(searchCity, studentDiscountOnly);
  }, [searchCity, studentDiscountOnly]);

  const toggleStudentDiscount = () => {
    const newValue = !studentDiscountOnly;
    setStudentDiscountOnly(newValue);
    loadGyms(searchCity, newValue);
  };

  const clearSearch = () => {
    setSearchCity('');
    setStudentDiscountOnly(false);
    loadGyms('', false);
  };

  const renderGym = ({ item }: { item: Gym }) => (
    <View style={styles.gymCard}>
      <View style={styles.gymHeader}>
        <Text style={styles.gymName} numberOfLines={1}>{item.name}</Text>
        {item.hasStudentDiscount && (
          <View style={styles.badge}>
            <Icon name="school" size={12} color="#fff" />
            <Text style={styles.badgeText}>
              Student{item.studentDiscount ? ` -${item.studentDiscount}%` : ''}
            </Text>
          </View>
        )}
      </View>

      {item.city && (
        <View style={styles.infoRow}>
          <Icon name="city" size={16} color="#666" />
          <Text style={styles.infoText}>{item.city}</Text>
        </View>
      )}

      {item.address && (
        <View style={styles.infoRow}>
          <Icon name="map-marker" size={16} color="#666" />
          <Text style={styles.infoText} numberOfLines={2}>{item.address}</Text>
        </View>
      )}

      {item.phone && (
        <View style={styles.infoRow}>
          <Icon name="phone" size={16} color="#666" />
          <Text style={styles.infoText}>{item.phone}</Text>
        </View>
      )}

      <View style={styles.gymFooter}>
        {item.monthlyPrice != null && (
          <View style={styles.priceTag}>
            <Icon name="currency-usd" size={16} color="#4CAF50" />
            <Text style={styles.priceText}>{item.monthlyPrice}/mo</Text>
          </View>
        )}
        {item.openingHours && (
          <View style={styles.hoursTag}>
            <Icon name="clock-outline" size={16} color="#666" />
            <Text style={styles.hoursText} numberOfLines={1}>{item.openingHours}</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading gyms...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Icon name="magnify" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by city..."
            value={searchCity}
            onChangeText={setSearchCity}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchCity.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Icon name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Icon name="arrow-right" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Student Discount Toggle */}
      <TouchableOpacity
        style={[
          styles.discountToggle,
          studentDiscountOnly && styles.discountToggleActive,
        ]}
        onPress={toggleStudentDiscount}
      >
        <Icon
          name={studentDiscountOnly ? 'filter-check' : 'filter-variant'}
          size={20}
          color={studentDiscountOnly ? '#fff' : '#4CAF50'}
        />
        <Text
          style={[
            styles.discountToggleText,
            studentDiscountOnly && styles.discountToggleTextActive,
          ]}
        >
          Student Discount Only
        </Text>
      </TouchableOpacity>

      {/* Error State */}
      {!!error && (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={24} color="red" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadGyms()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Gyms List */}
      <FlatList
        data={gyms}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderGym}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} />
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.emptyContainer}>
              <Icon name="map-marker-off" size={64} color="#ddd" />
              <Text style={styles.emptyText}>No gyms found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your search or filters
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={gyms.length === 0 ? styles.emptyList : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    backgroundColor: '#fff',
    paddingBottom: 8,
    elevation: 2,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    paddingVertical: 0,
  },
  searchButton: {
    marginLeft: 8,
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#4CAF50',
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  discountToggleActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  discountToggleText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  discountToggleTextActive: {
    color: '#fff',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    marginHorizontal: 12,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    color: 'red',
    fontSize: 14,
    marginLeft: 8,
  },
  retryButton: {
    backgroundColor: 'red',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  gymCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 8,
    padding: 16,
    borderRadius: 10,
    elevation: 2,
  },
  gymHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gymName: {
    flex: 1,
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#444',
    marginLeft: 8,
    flex: 1,
  },
  gymFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 4,
  },
  hoursTag: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 16,
  },
  hoursText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
  },
});