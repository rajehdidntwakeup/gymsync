import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../services/AuthContext';
import chatSocket from '../services/chatSocket';
import { ChatMessage, ChatPartner } from '../types';
import api from '../services/api';

export default function ChatScreen({ route }: any) {
  const { partnerUsername } = route.params || { partnerUsername: null };
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [partners, setPartners] = useState<ChatPartner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(partnerUsername);
  const [typing, setTyping] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadPartners();
    return () => {
      chatSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (selectedPartner) {
      connectSocket();
      loadHistory();
    }
  }, [selectedPartner]);

  const connectSocket = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    chatSocket.connect(
      token,
      (msg) => setMessages(prev => [...prev, msg]),
      (notif) => {
        if (notif.username === selectedPartner) {
          setTyping(notif.typing);
        }
      },
      () => {}
    );
  };

  const loadPartners = async () => {
    try {
      const response = await api.get('/chat/partners');
      setPartners(response.data);
    } catch (error) {
      console.error('Failed to load partners:', error);
    }
  };

  const loadHistory = async () => {
    if (!selectedPartner) return;
    try {
      const response = await api.get(`/chat/history/${selectedPartner}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const sendMessage = () => {
    if (!inputText.trim() || !selectedPartner) return;
    chatSocket.sendMessage(selectedPartner, inputText);
    setInputText('');
  };

  const renderPartner = ({ item }: { item: ChatPartner }) => (
    <TouchableOpacity
      style={[
        styles.partnerItem,
        selectedPartner === item.username && styles.selectedPartner,
      ]}
      onPress={() => setSelectedPartner(item.username)}
    >
      <Text style={styles.partnerName}>{item.name}</Text>
      <Text style={styles.partnerUsername}>@{item.username}</Text>
    </TouchableOpacity>
  );

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwn = item.senderUsername === user?.username;
    return (
      <View
        style={[
          styles.messageBubble,
          isOwn ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        <Text style={styles.messageText}>{item.content}</Text>
        <Text style={styles.messageTime}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>
    );
  };

  if (!selectedPartner) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Chat Partners</Text>
        <FlatList
          data={partners}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPartner}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No chat partners yet.</Text>
          }
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSelectedPartner(null)}>
          <Text>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{selectedPartner}</Text>
        {typing && <Text style={styles.typing}>typing...</Text>}
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', padding: 15 },
  partnerItem: { padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
  selectedPartner: { backgroundColor: '#e3f2fd' },
  partnerName: { fontSize: 16, fontWeight: 'bold' },
  partnerUsername: { fontSize: 12, color: '#666' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  typing: { color: '#4CAF50', fontSize: 12 },
  messagesList: { padding: 10 },
  messageBubble: { maxWidth: '80%', padding: 10, borderRadius: 10, marginVertical: 5 },
  ownMessage: { alignSelf: 'flex-end', backgroundColor: '#4CAF50' },
  otherMessage: { alignSelf: 'flex-start', backgroundColor: '#e0e0e0' },
  messageText: { color: '#fff' },
  messageTime: { fontSize: 10, color: '#fff', opacity: 0.7, marginTop: 5 },
  inputContainer: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderColor: '#eee' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8 },
  sendButton: { marginLeft: 10, justifyContent: 'center' },
  sendButtonText: { color: '#4CAF50', fontWeight: 'bold' },
});