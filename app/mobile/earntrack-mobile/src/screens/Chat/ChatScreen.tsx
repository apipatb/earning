import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../services/api.service';
import { Message } from '../../types';
import { Colors } from '../../constants/colors';
import { StorageService } from '../../services/storage.service';

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    const user = await StorageService.getUserData();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadMessages = async () => {
    try {
      const data = await ApiService.getChatMessages();
      setMessages(data.reverse());
    } catch (error) {
      console.error('Failed to load messages:', error);
      // Fallback to empty array for demo
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    setSending(true);
    try {
      const message = await ApiService.sendChatMessage(inputText.trim());
      setMessages((prev) => [...prev, message]);
      setInputText('');
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.senderId === currentUserId;

    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.messageContainerRight : styles.messageContainerLeft,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isCurrentUser ? styles.messageBubbleUser : styles.messageBubbleOther,
          ]}
        >
          {!isCurrentUser && (
            <Text style={styles.senderName}>{item.senderName}</Text>
          )}
          <Text
            style={[
              styles.messageText,
              isCurrentUser ? styles.messageTextUser : styles.messageTextOther,
            ]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isCurrentUser ? styles.messageTimeUser : styles.messageTimeOther,
            ]}
          >
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start a conversation</Text>
          </View>
        }
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachButton}>
          <Ionicons name="attach" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
        />

        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  messageContainerLeft: {
    alignItems: 'flex-start',
  },
  messageContainerRight: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  messageBubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: Colors.card,
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextUser: {
    color: '#FFFFFF',
  },
  messageTextOther: {
    color: Colors.text,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  messageTimeUser: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageTimeOther: {
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  attachButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    marginHorizontal: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
