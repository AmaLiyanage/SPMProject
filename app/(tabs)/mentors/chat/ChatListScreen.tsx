import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../../../../config/firebase';
import { useAuth } from '../../../../contexts/AuthContext';
import { createOrGetChat } from '../../../../services/chatService';

interface Chat {
  id: string;
  mentorId: string;
  userId: string;
  lastMessage?: string;
  timestamp?: Timestamp;
  unreadCount?: Record<string, number>;
}

interface User {
  displayName: string;
  profilePicture?: string;
}

export default function ChatsListScreen() {
  const { userProfile } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCache, setUserCache] = useState<Record<string, User>>({});
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedChatName, setSelectedChatName] = useState<string>('');
  const router = useRouter();

  const userId = userProfile?.uid;
  const userType = userProfile?.userType;

  /** Fetch chats with last message */
  useEffect(() => {
    if (!userId) return;

    const chatsRef = collection(db, 'chats');
    const q =
      userType === 'mentor'
        ? query(chatsRef, where('mentorId', '==', userId), orderBy('timestamp', 'desc'))
        : query(chatsRef, where('userId', '==', userId), orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatMap: Record<string, Chat> = {};

      await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const chatData = docSnap.data() as Chat;
          const chatId = docSnap.id;
          const otherId = userType === 'mentor' ? chatData.userId : chatData.mentorId;

          const messagesRef = collection(db, 'chats', chatId, 'messages');
          const lastMsgSnap = await getDocs(
            query(messagesRef, orderBy('timestamp', 'desc'), limit(1))
          );

          let lastMessage = 'No messages yet';
          let lastMessageTime = chatData.timestamp || Timestamp.now();

          if (!lastMsgSnap.empty) {
            const lastMsgDoc = lastMsgSnap.docs[0];
            const msgData = lastMsgDoc.data() as {
              type: string;
              content: string;
              timestamp?: Timestamp;
              deletedFor?: string[];
            };

            if (!msgData.deletedFor?.includes(userId)) {
              lastMessage =
                msgData.type === 'text'
                  ? msgData.content
                  : msgData.type === 'voice'
                  ? '🎤 Voice message'
                  : msgData.type === 'video'
                  ? '🎥 Video message'
                  : 'Message';
              lastMessageTime = msgData.timestamp || chatData.timestamp || Timestamp.now();
            }
          }

          if (
            !chatMap[otherId] ||
            (lastMessageTime.seconds || 0) > (chatMap[otherId].timestamp?.seconds || 0)
          ) {
            chatMap[otherId] = {
              id: chatId,
              mentorId: chatData.mentorId,
              userId: chatData.userId,
              lastMessage,
              timestamp: lastMessageTime,
              unreadCount: chatData.unreadCount || {},
            };
          }
        })
      );

      setChats(
        Object.values(chatMap).sort(
          (a, b) => (b.timestamp!.seconds || 0) - (a.timestamp!.seconds || 0)
        )
      );
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, userType]);

  /** Fetch user info */
  const fetchUser = async (uid: string): Promise<User> => {
    if (userCache[uid]) return userCache[uid];
    const docSnap = await getDoc(doc(db, 'users', uid));
    if (docSnap.exists()) {
      const userData = docSnap.data() as User;
      setUserCache((prev) => ({ ...prev, [uid]: userData }));
      return userData;
    }
    return { displayName: uid };
  };

  /** Navigate to chat screen */
  const handleChatPress = async (chat: Chat) => {
    if (!userId) return;
    const otherId = userType === 'mentor' ? chat.userId : chat.mentorId;
    const mentorId = userType === 'mentor' ? userId : otherId;
    const uId = userType === 'mentor' ? otherId : userId;

    try {
      const chatId = await createOrGetChat(uId, mentorId);
      router.push(`/mentors/chat/${chatId}`);
    } catch (err) {
      console.error('Failed to open chat', err);
    }
  };

  /** Show delete confirmation modal */
  const showDeleteConfirmation = (chatId: string, chatName: string) => {
    setSelectedChatId(chatId);
    setSelectedChatName(chatName);
    setDeleteModalVisible(true);
  };

  /** Delete chat */
  const handleDeleteChat = async () => {
    if (!selectedChatId) return;

    try {
      const messagesRef = collection(db, 'chats', selectedChatId, 'messages');
      const messagesSnap = await getDocs(messagesRef);
      const batch = writeBatch(db);

      messagesSnap.forEach((msg) => batch.delete(msg.ref));
      batch.delete(doc(db, 'chats', selectedChatId));
      await batch.commit();

      setChats((prev) => prev.filter((c) => c.id !== selectedChatId));
      setDeleteModalVisible(false);
      setSelectedChatId(null);
      setSelectedChatName('');
    } catch (err) {
      console.error('Error deleting chat:', err);
      setDeleteModalVisible(false);
    }
  };

  /** Cancel delete */
  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setSelectedChatId(null);
    setSelectedChatName('');
  };

  /** Render chat item */
  const ChatItem = ({ chat }: { chat: Chat }) => {
    const [otherUser, setOtherUser] = useState<User>({ displayName: '' });
    const otherId = userType === 'mentor' ? chat.userId : chat.mentorId;
    const unreadCount = userId ? chat.unreadCount?.[userId] || 0 : 0;

    useEffect(() => {
      fetchUser(otherId).then(setOtherUser);
    }, [otherId]);

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleChatPress(chat)}
        onLongPress={() => showDeleteConfirmation(chat.id, otherUser.displayName)}
      >
        {otherUser.profilePicture ? (
          <Image source={{ uri: otherUser.profilePicture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{otherUser.displayName?.[0]?.toUpperCase() || '?'}</Text>
          </View>
        )}
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle} numberOfLines={1}>
              {otherUser.displayName}
            </Text>
            {chat.timestamp && (
              <Text style={styles.timestamp}>
                {new Date(chat.timestamp.seconds * 1000).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            )}
          </View>
          <Text
            style={[styles.lastMessage, unreadCount > 0 && styles.unreadMessage]}
            numberOfLines={1}
          >
            {chat.lastMessage}
          </Text>
        </View>

        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
      </View>

      {/* Chat List */}
      {chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbox-outline" size={64} color="#D6C8FF" />
          <Text style={styles.emptyTitle}>No chats yet</Text>
          <Text style={styles.emptySubtitle}>Start a conversation with your mentors or mentees</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatItem chat={item} />}
          contentContainerStyle={{ paddingBottom: 120 }}
          style={{ flex: 1 }}
        />
      )}

      {/* Find Mentors Button */}
      <Pressable
        style={styles.findMentorsButton}
        onPress={() => router.push('/mentors')} // Ensure this path exists
      >
        <Text style={styles.findMentorsButtonText}>Find Mentors</Text>
      </Pressable>

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={28} color="#8B5CF6" />
              <Text style={styles.modalTitle}>Delete Chat</Text>
            </View>

            <Text style={styles.modalMessage}>
              Are you sure you want to delete your conversation with {selectedChatName}? 
              This action cannot be undone.
            </Text>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelDelete}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleDeleteChat}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  header: {
    backgroundColor: '#8B5CF6',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 10 : 20,
    paddingBottom: 16,
    alignItems: 'center', // Center the title horizontally
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  chatList: { padding: 16 },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EDE9FE' },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  chatContent: { flex: 1, marginLeft: 12 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', flex: 1, marginRight: 8 },
  lastMessage: { fontSize: 14, color: '#6B7280' },
  unreadMessage: { fontWeight: '600', color: '#1F2937' },
  timestamp: { fontSize: 12, color: '#9CA3AF' },
  unreadBadge: { backgroundColor: '#8B5CF6', borderRadius: 20, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F3FF' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#4B5563', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#8B5CF6', marginLeft: 10 },
  modalMessage: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  deleteButton: { backgroundColor: '#8B5CF6' },
  cancelButtonText: { color: '#4B5563', fontSize: 16, fontWeight: '600' },
  deleteButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  findMentorsButton: {
    position: 'absolute',
    marginBottom: 70,
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findMentorsButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
