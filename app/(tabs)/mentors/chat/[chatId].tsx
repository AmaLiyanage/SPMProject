import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { Audio, ResizeMode, Video } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../../../config/firebase";

interface ChatMessage {
  id: string;
  type: "text" | "voice" | "video" | "deleted" | "task";
  content: string;
  senderId: string;
  timestamp: Timestamp | null;
  duration?: number;
  status?: "sent" | "seen";
  deletedFor?: string[];
  // Task-specific fields
  title?: string;
  taskStatus?: "pending" | "completed";
  // Editing fields
  edited?: boolean;
  lastEdited?: Timestamp | null;
}

interface UserProfile {
  uid: string;
  displayName: string;
  profilePicture?: string;
  userType?: string;
}

interface ChatData {
  mentorId: string;
  userId: string;
  [key: string]: any;
}

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [playingSound, setPlayingSound] = useState<Audio.Sound | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [playbackPosition, setPlaybackPosition] = useState<number>(0);
  const [playbackDuration, setPlaybackDuration] = useState<number>(0);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [deletedMessagesQueue, setDeletedMessagesQueue] = useState<ChatMessage[]>([]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"voice" | "video" | null>(null);
  const [otherUser, setOtherUser] = useState<UserProfile>({
    uid: "",
    displayName: "User",
  });
  const [currentUserType, setCurrentUserType] = useState<string>("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [showTasksOnly, setShowTasksOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [editText, setEditText] = useState("");

  const flatListRef = useRef<FlatList>(null);
  const auth = getAuth();
  const userId = auth.currentUser?.uid || "";

  /** Fetch current user type and other user info */
  useEffect(() => {
    if (!chatId || !userId) return;

    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        
        // Fetch current user info to get userType
        const currentUserDoc = await getDoc(doc(db, "users", userId));
        if (currentUserDoc.exists()) {
          const data = currentUserDoc.data() as UserProfile;
          setCurrentUserType(data.userType || "");
        }

        // Fetch other user info
        const chatDoc = await getDoc(doc(db, "chats", chatId));
        if (!chatDoc.exists()) {
          return;
        }

        const chatData = chatDoc.data() as ChatData;
        const otherId = chatData.mentorId === userId ? chatData.userId : chatData.mentorId;

        const userDoc = await getDoc(doc(db, "users", otherId));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          setOtherUser({ ...data, uid: otherId });
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [chatId, userId]);

  /** Load messages & mark unseen as seen */
  useEffect(() => {
    if (!chatId || !userId) return;
    const messagesRef = collection(doc(db, "chats", chatId), "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgs: ChatMessage[] = [];
      let hasUnreadMessages = false;
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as ChatMessage;
        const messageId = docSnap.id;

        if (data.deletedFor?.includes(userId)) continue;

        if (data.senderId !== userId && data.status === "sent") {
          await updateDoc(doc(db, "chats", chatId, "messages", messageId), { status: "seen" });
          data.status = "seen";
          hasUnreadMessages = true;
        }

        msgs.push({ ...data, id: messageId });
      }

      setMessages(msgs);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      
      // Update the parent chat document to reset unread count
      if (hasUnreadMessages) {
        await updateDoc(doc(db, "chats", chatId), {
          [`unreadCount.${userId}`]: 0,
          lastSeen: {
            ...(await getDoc(doc(db, "chats", chatId))).data()?.lastSeen || {},
            [userId]: serverTimestamp()
          }
        });
      }
    });

    return () => unsubscribe();
  }, [chatId, userId]);

  const formatTime = (timestamp?: Timestamp | null) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
      return "";
    }
    
    try {
      const date = timestamp.toDate();
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "";
    }
  };

  const toggleSelectMessage = (id: string) => {
    const newSet = new Set(selectedMessages);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedMessages(newSet);
  };

  /** Check if message can be edited (within 10 minutes) */
  const canEditMessage = (message: ChatMessage) => {
    // Only allow editing text and task messages, not voice, video, or deleted
    if (message.type === "voice" || message.type === "video" || message.type === "deleted") return false;
    if (message.senderId !== userId) return false;
    if (!message.timestamp) return false;
    
    try {
      const messageTime = message.timestamp.toDate().getTime();
      const currentTime = new Date().getTime();
      const tenMinutes = 10 * 60 * 1000;
      
      return currentTime - messageTime <= tenMinutes;
    } catch (error) {
      console.error("Error checking if message can be edited:", error);
      return false;
    }
  };

  /** Start editing a message */
  const startEditing = (message: ChatMessage) => {
    if (!canEditMessage(message)) return;
    
    setEditingMessage(message);
    if (message.type === "text") {
      setEditText(message.content);
    } else if (message.type === "task") {
      setTaskTitle(message.title || "");
      setTaskDescription(message.content);
      setShowTaskModal(true);
    }
  };

  /** Save edited message */
  const saveEdit = async () => {
    if (!editingMessage || !chatId) return;
    
    try {
      const updateData: any = {
        lastEdited: serverTimestamp(),
        edited: true
      };
      
      if (editingMessage.type === "text") {
        updateData.content = editText;
      }
      
      await updateDoc(doc(db, "chats", chatId, "messages", editingMessage.id), updateData);
      
      setEditingMessage(null);
      setEditText("");
    } catch (error) {
      console.error("Error updating message:", error);
      Alert.alert("Error", "Failed to update message");
    }
  };

  /** Save edited task */
  const saveTaskEdit = async () => {
    if (!editingMessage || !chatId) return;
    
    try {
      await updateDoc(doc(db, "chats", chatId, "messages", editingMessage.id), {
        title: taskTitle,
        content: taskDescription,
        lastEdited: serverTimestamp(),
        edited: true
      });
      
      setEditingMessage(null);
      setTaskTitle("");
      setTaskDescription("");
      setShowTaskModal(false);
    } catch (error) {
      console.error("Error updating task:", error);
      Alert.alert("Error", "Failed to update task");
    }
  };

  /** Delete Messages */
  const deleteSelectedMessages = () => {
    if (selectedMessages.size === 0) return;
    setShowDeleteModal(true);
  };

  const deleteMessagesForMe = async () => {
    if (!chatId || !userId) return;
    const msgsToDelete = messages.filter((m) => selectedMessages.has(m.id));
    setDeletedMessagesQueue(msgsToDelete);

    await Promise.all(
      msgsToDelete.map((m) =>
        updateDoc(doc(db, "chats", chatId, "messages", m.id), { deletedFor: arrayUnion(userId) })
      )
    );
    setSelectedMessages(new Set());
    setShowDeleteModal(false);
    setTimeout(() => setDeletedMessagesQueue([]), 5000);
  };

  const deleteMessagesForEveryone = async () => {
    if (!chatId || !userId) return;
    const msgsToDelete = messages.filter((m) => selectedMessages.has(m.id) && m.senderId === userId);

    await Promise.all(
      msgsToDelete.map((m) =>
        updateDoc(doc(db, "chats", chatId, "messages", m.id), {
          type: "deleted",
          content: "This message was deleted",
        })
      )
    );
    setSelectedMessages(new Set());
    setShowDeleteModal(false);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
  };

  const undoDelete = async () => {
    if (!chatId || deletedMessagesQueue.length === 0) return;

    await Promise.all(
      deletedMessagesQueue.map((m) =>
        updateDoc(doc(db, "chats", chatId, "messages", m.id), {
          deletedFor: arrayRemove(userId)
        })
      )
    );
    setDeletedMessagesQueue([]);
  };

  /** Send message */
  const sendMessage = async () => {
    if (!newMessage.trim() || !userId || !chatId) return;

    await addDoc(collection(doc(db, "chats", chatId), "messages"), {
      type: "text",
      content: newMessage,
      senderId: userId,
      timestamp: serverTimestamp() as Timestamp,
      status: "sent",
      deletedFor: [],
    });

    // Update lastMessage in parent chat document and increment unread count for recipient
    const chatDoc = await getDoc(doc(db, "chats", chatId));
    const chatData = chatDoc.data() as ChatData;
    const otherUserId = chatData.mentorId === userId ? chatData.userId : chatData.mentorId;
    
    await updateDoc(doc(db, "chats", chatId), {
      lastMessage: newMessage,
      timestamp: serverTimestamp(),
      [`unreadCount.${otherUserId}`]: (chatData.unreadCount?.[otherUserId] || 0) + 1
    });

    setNewMessage("");
  };

  /** Send Task */
  const sendTask = async () => {
    if (!taskTitle.trim() || !userId || !chatId) return;

    await addDoc(collection(doc(db, "chats", chatId), "messages"), {
      type: "task",
      content: taskDescription,
      title: taskTitle,
      senderId: userId,
      timestamp: serverTimestamp() as Timestamp,
      status: "sent",
      taskStatus: "pending",
      deletedFor: [],
    });

    // Update lastMessage in parent chat document and increment unread count for recipient
    const chatDoc = await getDoc(doc(db, "chats", chatId));
    const chatData = chatDoc.data() as ChatData;
    const otherUserId = chatData.mentorId === userId ? chatData.userId : chatData.mentorId;
    const lastMessageText = `📋 Task: ${taskTitle}`;
    
    await updateDoc(doc(db, "chats", chatId), {
      lastMessage: lastMessageText,
      timestamp: serverTimestamp(),
      [`unreadCount.${otherUserId}`]: (chatData.unreadCount?.[otherUserId] || 0) + 1
    });

    setTaskTitle("");
    setTaskDescription("");
    setShowTaskModal(false);
  };

  /** Complete Task */
  const completeTask = async (messageId: string) => {
    if (!chatId) return;
    
    await updateDoc(doc(db, "chats", chatId, "messages", messageId), {
      taskStatus: "completed",
    });
  };

  /** Recording voice */
  const startRecording = async () => {
    if (recording) return;
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Microphone permission is required to record voice messages",
        [{ text: "OK", style: "default" }],
        { userInterfaceStyle: 'dark' }
      );
      return;
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    setRecording(newRecording);
  };

  const stopRecording = async () => {
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    if (!uri) return;

    setPreviewUri(uri);
    setPreviewType("voice");
  };

  /** Capture video */
  const recordVideo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Camera permission is required to record videos",
        [{ text: "OK", style: "default" }],
        { userInterfaceStyle: 'dark' }
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 1 });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPreviewUri(result.assets[0].uri);
      setPreviewType("video");
    }
  };

  /** Send previewed media */
  const sendPreview = async () => {
    if (!previewUri || !previewType || !userId || !chatId) return;

    const response = await fetch(previewUri);
    const blob = await response.blob();
    const storage = getStorage();
    const path = `${previewType}/${userId}/${Date.now()}${previewType === "voice" ? ".m4a" : ".mp4"}`;
    const mediaRef = ref(storage, path);
    await uploadBytes(mediaRef, blob);
    const downloadURL = await getDownloadURL(mediaRef);

    const messageData: Partial<ChatMessage> = {
      type: previewType,
      content: downloadURL,
      senderId: userId,
      timestamp: serverTimestamp() as Timestamp,
      status: "sent",
      deletedFor: [],
    };

    if (previewType === "voice") {
      const { sound } = await Audio.Sound.createAsync({ uri: previewUri });
      const status = await sound.getStatusAsync();
      messageData.duration = "isLoaded" in status && status.isLoaded && status.durationMillis
        ? status.durationMillis / 1000
        : 0;
    }

    await addDoc(collection(doc(db, "chats", chatId), "messages"), messageData);

    // Update lastMessage in parent chat document and increment unread count for recipient
    const chatDoc = await getDoc(doc(db, "chats", chatId));
    const chatData = chatDoc.data() as ChatData;
    const otherUserId = chatData.mentorId === userId ? chatData.userId : chatData.mentorId;
    const lastMessageText = previewType === "voice" ? "🎤 Voice" : "📹 Video";
    
    await updateDoc(doc(db, "chats", chatId), {
      lastMessage: lastMessageText,
      timestamp: serverTimestamp(),
      [`unreadCount.${otherUserId}`]: (chatData.unreadCount?.[otherUserId] || 0) + 1
    });

    setPreviewUri(null);
    setPreviewType(null);
  };

  const cancelPreview = () => {
    setPreviewUri(null);
    setPreviewType(null);
  };

  /** Play audio */
  const playAudio = async (message: ChatMessage) => {
    if (playingSound) {
      await playingSound.stopAsync();
      await playingSound.unloadAsync();
      setPlayingSound(null);
      setPlayingMessageId(null);
    }

    const { sound } = await Audio.Sound.createAsync({ uri: message.content });
    setPlayingSound(sound);
    setPlayingMessageId(message.id);

    sound.setOnPlaybackStatusUpdate((status) => {
      if ("isLoaded" in status && status.isLoaded) {
        setPlaybackPosition(status.positionMillis);
        setPlaybackDuration(status.durationMillis || 0);

        if (status.didJustFinish) {
          sound.unloadAsync();
          setPlayingSound(null);
          setPlayingMessageId(null);
          setPlaybackPosition(0);
          setPlaybackDuration(0);
        }
      }
    });

    await sound.playAsync();
  };

  // Filter messages to show only tasks if needed
  const filteredMessages = showTasksOnly 
    ? messages.filter(msg => msg.type === "task") 
    : messages;

  // Check if current user is a mentor
  const isMentor = currentUserType === "mentor";

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {otherUser.profilePicture ? (
          <Image source={{ uri: otherUser.profilePicture }} style={styles.userAvatar} />
        ) : (
          <View style={styles.userPlaceholder}>
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              {otherUser.displayName[0]?.toUpperCase() || "?"}
            </Text>
          </View>
        )}
        <View style={styles.headerTextContainer}>
          <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
            {otherUser.displayName}
          </Text>
          <Text style={styles.userRole}>
            {otherUser.userType === "mentor" ? "Mentor" : "Mentee"}
          </Text>
        </View>
        
        {/* Task Filter Toggle */}
        <TouchableOpacity 
          onPress={() => setShowTasksOnly(!showTasksOnly)}
          style={styles.taskFilterButton}
        >
          <FontAwesome5 
            name={showTasksOnly ? "list" : "tasks"} 
            size={20} 
            color="white" 
          />
          <Text style={styles.taskFilterText}>
            {showTasksOnly ? "All" : "Tasks"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Edit Message Modal */}
      <Modal visible={!!editingMessage && editingMessage.type === "text"} transparent animationType="slide">
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalContainer}>
            <Text style={styles.editModalTitle}>Edit Message</Text>
            
            <TextInput
              placeholder="Edit your message"
              placeholderTextColor="#999"
              value={editText}
              onChangeText={setEditText}
              multiline
              style={styles.editInput}
            />
            
            <View style={styles.editModalButtons}>
              <TouchableOpacity 
                onPress={() => setEditingMessage(null)} 
                style={[styles.editModalButton, styles.editModalCancelButton]}
              >
                <Text style={styles.editModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={saveEdit} 
                style={[styles.editModalButton, styles.editModalSaveButton]}
                disabled={!editText.trim()}
              >
                <Text style={styles.editModalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Task Creation/Edit Modal */}
      <Modal visible={showTaskModal} transparent animationType="slide">
        <View style={styles.taskModalOverlay}>
          <View style={styles.taskModalContainer}>
            <Text style={styles.taskModalTitle}>
              {editingMessage ? "Edit Task" : "Create New Task"}
            </Text>
            
            <TextInput
              placeholder="Task Title"
              placeholderTextColor="#999"
              value={taskTitle}
              onChangeText={setTaskTitle}
              style={styles.taskInput}
            />
            
            <TextInput
              placeholder="Task Description"
              placeholderTextColor="#999"
              value={taskDescription}
              onChangeText={setTaskDescription}
              multiline
              style={[styles.taskInput, styles.taskDescriptionInput]}
            />
            
            <View style={styles.taskModalButtons}>
              <TouchableOpacity 
                onPress={() => {
                  setShowTaskModal(false);
                  setEditingMessage(null);
                }} 
                style={[styles.taskModalButton, styles.taskModalCancelButton]}
              >
                <Text style={styles.taskModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={editingMessage ? saveTaskEdit : sendTask} 
                style={[styles.taskModalButton, styles.taskModalSendButton]}
                disabled={!taskTitle.trim()}
              >
                <Text style={styles.taskModalButtonText}>
                  {editingMessage ? "Update Task" : "Create Task"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContainer}>
            <Text style={styles.deleteModalTitle}>Delete Messages</Text>
            <Text style={styles.deleteModalMessage}>Choose delete option</Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity onPress={cancelDelete} style={[styles.deleteModalButton, styles.deleteModalCancelButton]}>
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={deleteMessagesForMe} style={[styles.deleteModalButton, styles.deleteModalActionButton]}>
                <Text style={styles.deleteModalActionText}>Delete for me</Text>
              </TouchableOpacity>
              {messages.some((m) => selectedMessages.has(m.id) && m.senderId === userId) && (
                <TouchableOpacity onPress={deleteMessagesForEveryone} style={[styles.deleteModalButton, styles.deleteModalActionButton]}>
                  <Text style={styles.deleteModalActionText}>Delete for everyone</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Preview Modal */}
      <Modal visible={!!previewUri} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "#000000aa", justifyContent: "center", alignItems: "center" }}>
          <View style={styles.previewModal}>
            {previewType === "voice" && previewUri && (
              <TouchableOpacity onPress={() => playAudio({ content: previewUri, id: "preview", senderId: userId, type: "voice", timestamp: Timestamp.now() })} style={styles.previewButton}>
                <FontAwesome5 name="play" size={24} color="#7B4DFF" />
                <Text style={styles.previewText}>Play Voice</Text>
              </TouchableOpacity>
            )}
            {previewType === "video" && previewUri && (
              <Video source={{ uri: previewUri }} useNativeControls resizeMode={ResizeMode.CONTAIN} style={{ width: 300, height: 200, borderRadius: 10 }} />
            )}
            <View style={styles.previewButtons}>
              <TouchableOpacity onPress={sendPreview} style={[styles.previewActionButton, styles.sendActionButton]}>
                <Text style={styles.previewActionText}>Send</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelPreview} style={[styles.previewActionButton, styles.cancelButton]}>
                <Text style={styles.previewActionText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Undo bar - Only shown for delete for me */}
      {deletedMessagesQueue.length > 0 && (
        <View style={styles.undoContainer}>
          <Text style={styles.undoText}>Messages deleted</Text>
          <TouchableOpacity onPress={undoDelete}>
            <Text style={styles.undoButton}>UNDO</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Chat list */}
      <FlatList
        ref={flatListRef}
        data={filteredMessages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 10 }}
        renderItem={({ item }) => {
          const isMine = item.senderId === userId;
          const isSelected = selectedMessages.has(item.id);
          const isDeleted = item.type === "deleted";
          const canEdit = canEditMessage(item);

          return (
            <TouchableOpacity 
              onLongPress={() => toggleSelectMessage(item.id)}
              onPress={() => canEdit && startEditing(item)}
              style={[styles.messageWrapper, isMine ? styles.myMessageWrapper : styles.theirMessageWrapper]}
            >
              <View style={[
                styles.messageBubble, 
                isMine ? styles.myMessageBubble : styles.theirMessageBubble, 
                isSelected && styles.selectedMessage,
                item.type === "task" && styles.taskMessageBubble,
                canEdit && styles.editableMessage
              ]}>
                {isDeleted ? (
                  <Text style={[styles.messageText, styles.deletedMessage]}>{item.content}</Text>
                ) : (
                  <>
                    {item.type === "text" && <Text style={styles.messageText}>{item.content}</Text>}
                    
                    {item.type === "voice" && (
                      <TouchableOpacity onPress={() => playAudio(item)} style={styles.voiceMessage}>
                        <FontAwesome5 name={playingMessageId === item.id ? "pause" : "play"} size={16} color="#7B4DFF" />
                        <Text style={styles.voiceText}>{playingMessageId === item.id ? "Playing" : "Voice"}</Text>
                        <Text style={styles.voiceDuration}>({Math.round(playingMessageId === item.id ? playbackPosition / 1000 : item.duration || 0)}s / {Math.round(item.duration || 0)}s)</Text>
                      </TouchableOpacity>
                    )}
                    
                    {item.type === "video" && (
                      <Video source={{ uri: item.content }} useNativeControls resizeMode={ResizeMode.CONTAIN} style={styles.videoMessage} />
                    )}
                    
                    {item.type === "task" && (
                      <View style={styles.taskContainer}>
                        <View style={styles.taskHeader}>
                          <FontAwesome5 name="tasks" size={16} color="#7B4DFF" />
                          <Text style={styles.taskTitle}>{item.title}</Text>
                        </View>
                        {item.content && <Text style={styles.taskDescription}>{item.content}</Text>}
                        <View style={styles.taskFooter}>
                          <View style={[
                            styles.taskStatus, 
                            item.taskStatus === "completed" ? styles.taskCompleted : styles.taskPending
                          ]}>
                            <Text style={styles.taskStatusText}>
                             {item.taskStatus === "completed" ? "Completed" : "Pending"}
                            </Text>
                          </View>
                          {!isMine && item.taskStatus === "pending" && (
                            <TouchableOpacity 
                              onPress={() => completeTask(item.id)}
                              style={styles.completeTaskButton}
                            >
                              <Text style={styles.completeTaskText}>Mark Complete</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                  </>
                )}
                <View style={styles.messageFooter}>
                  <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
                  {item.edited && <Text style={styles.editedLabel}> (edited)</Text>}
                  {isMine && item.status && !isDeleted && (
                    <FontAwesome5 name={item.status === "seen" ? "check-double" : "check"} size={12} color="#7B4DFF" style={styles.statusIcon} />
                  )}
                </View>
                {/* Only show edit indicator for text and task messages, not voice or video */}
                {canEdit && (item.type === "text" || item.type === "task") && (
                  <View style={styles.editIndicator}>
                    <FontAwesome5 name="pencil-alt" size={10} color="#7B4DFF" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Input bar */}
      <View style={styles.inputContainer}>
        {selectedMessages.size > 0 ? (
          <TouchableOpacity onPress={deleteSelectedMessages} style={styles.deleteButton}>
            <FontAwesome5 name="trash" size={20} color="white" />
          </TouchableOpacity>
        ) : (
          <>
            {/* Only show task button for mentors */}
            {isMentor && (
              <TouchableOpacity 
                onPress={() => setShowTaskModal(true)}
                style={styles.taskButton}
              >
                <FontAwesome5 name="plus" size={16} color="#7B4DFF" />
                <Text style={styles.taskButtonText}>Task</Text>
              </TouchableOpacity>
            )}
            
            <TextInput 
              value={newMessage} 
              onChangeText={setNewMessage} 
              placeholder="Type a message..." 
              placeholderTextColor="#999"
              style={[styles.input, !isMentor && { marginLeft: 0 }]} 
            />
            <View style={styles.iconContainer}>
              {newMessage.trim() ? (
                <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
                  <MaterialIcons name="send" size={24} color="white" />
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity onPressIn={startRecording} onPressOut={stopRecording} style={styles.micButton}>
                    <MaterialIcons name={recording ? "keyboard-voice" : "mic"} size={24} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={recordVideo} style={styles.cameraButton}>
                    <FontAwesome5 name="camera" size={22} color="white" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}
        {recording && <Text style={styles.recordingIndicator}>Recording...</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f2" },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#f2f2f2"
  },
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: 15, 
    backgroundColor: "#7B4DFF", 
    borderBottomWidth: 1, 
    borderColor: "#6A3DCC",
    minHeight: 60,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  userAvatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#FFFFFF"
  },
  userPlaceholder: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: "#6A3DCC", 
    marginRight: 12, 
    justifyContent: "center", 
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF"
  },
  userName: { 
    fontSize: 18, 
    fontWeight: "bold", 
    color: "#FFFFFF",
  },
  userRole: {
    fontSize: 12,
    color: "#D6C8FF",
    marginTop: 2,
  },
  taskFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 8,
    borderRadius: 20,
    marginLeft: 10,
  },
  taskFilterText: {
    color: "white",
    marginLeft: 5,
    fontWeight: "500",
  },
  messageWrapper: { 
    flexDirection: "row", 
    marginVertical: 6, 
    paddingHorizontal: 12 
  },
  myMessageWrapper: { 
    justifyContent: "flex-end" 
  },
  theirMessageWrapper: { 
    justifyContent: "flex-start" 
  },
  messageBubble: { 
    maxWidth: "75%", 
    padding: 12, 
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: "relative"
  },
  myMessageBubble: { 
    backgroundColor: "#D6C8FF", 
    borderTopRightRadius: 4 
  },
  theirMessageBubble: { 
    backgroundColor: "#FFFFFF", 
    borderTopLeftRadius: 4 
  },
  taskMessageBubble: {
    backgroundColor: "#FFF8E1",
    borderLeftWidth: 4,
    borderLeftColor: "#FFD54F",
  },
  selectedMessage: { 
    borderWidth: 2, 
    borderColor: "#FFD700" 
  },
  editableMessage: {
    borderWidth: 1,
    borderColor: "#7B4DFF",
    borderStyle: "dashed"
  },
  messageText: { 
    fontSize: 16, 
    color: "#000",
    lineHeight: 20
  },
  deletedMessage: { 
    fontStyle: "italic", 
    color: "#999" 
  },
  voiceMessage: { 
    flexDirection: "row", 
    alignItems: "center",
    padding: 8
  },
  voiceText: { 
    fontSize: 14, 
    color: "#7B4DFF", 
    marginLeft: 8,
    fontWeight: "500"
  },
  voiceDuration: { 
    fontSize: 12, 
    color: "#666", 
    marginLeft: 8 
  },
  videoMessage: { 
    width: 200, 
    height: 150, 
    borderRadius: 12 
  },
  taskContainer: {
    width: "100%",
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
    color: "#333",
  },
  taskDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    lineHeight: 20,
  },
  taskFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  taskStatus: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  taskPending: {
    backgroundColor: "#FFECB3",
  },
  taskCompleted: {
    backgroundColor: "#C8E6C9",
  },
  taskStatusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  completeTaskButton: {
    backgroundColor: "#7B4DFF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  completeTaskText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
  },
  messageFooter: { 
    flexDirection: "row", 
    justifyContent: "flex-end", 
    marginTop: 6,
    alignItems: "center"
  },
  timestamp: { 
    fontSize: 11, 
    color: "#666", 
    textAlign: "right" 
  },
  editedLabel: {
    fontSize: 11,
    color: "#999",
    fontStyle: "italic"
  },
  statusIcon: { 
    marginLeft: 6 
  },
  editIndicator: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 8,
    padding: 4,
  },
  inputContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: 12, 
    borderTopWidth: 1, 
    borderColor: "#E0E0E0", 
    backgroundColor: "#FFFFFF" 
  },
  taskButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0EBFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  taskButtonText: {
    color: "#7B4DFF",
    fontWeight: "500",
    marginLeft: 5,
  },
  iconContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: "#E0E0E0", 
    borderRadius: 25, 
    paddingHorizontal: 16, 
    height: 45, 
    backgroundColor: "#F8F8F8",
    fontSize: 16,
    color: "#333",
    marginLeft: 8
  },
  sendButton: { 
    backgroundColor: "#7B4DFF", 
    padding: 12, 
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: "#FF4757",
    padding: 12,
    borderRadius: 25,
    marginLeft: 8
  },
  micButton: { 
    backgroundColor: "#7B4DFF", 
    padding: 12, 
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  cameraButton: { 
    backgroundColor: "#7B4DFF", 
    padding: 12, 
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  recordingIndicator: { 
    color: "#FF4757", 
    marginLeft: 12, 
    fontWeight: "bold",
    fontSize: 14
  },
  undoContainer: { 
    flexDirection: "row", 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "#7B4DFF", 
    padding: 12 
  },
  undoText: { 
    color: "white", 
    fontSize: 14,
    fontWeight: "500"
  },
  undoButton: { 
    color: "#FFD700", 
    marginLeft: 12, 
    fontWeight: "bold",
    fontSize: 14
  },
  previewModal: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    width: '85%'
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F0EBFF',
    borderRadius: 12,
    marginBottom: 20
  },
  previewText: {
    fontSize: 16,
    color: '#7B4DFF',
    fontWeight: '500',
    marginLeft: 12
  },
  previewButtons: {
    flexDirection: "row",
    marginTop: 20,
    gap: 12
  },
  previewActionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    minWidth: 100
  },
  sendActionButton: {
    backgroundColor: "#7B4DFF"
  },
  cancelButton: {
    backgroundColor: "#FF4757"
  },
  previewActionText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center"
  },
  // Edit Modal Styles
  editModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  editModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 400,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#7B4DFF",
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  editModalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  editModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
  },
  editModalCancelButton: {
    backgroundColor: "#E0E0E0",
  },
  editModalSaveButton: {
    backgroundColor: "#7B4DFF",
  },
  editModalButtonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  // Task Modal Styles
  taskModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  taskModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 400,
  },
  taskModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#7B4DFF",
  },
  taskInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  taskDescriptionInput: {
    height: 100,
    textAlignVertical: "top",
  },
  taskModalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  taskModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
  },
  taskModalCancelButton: {
    backgroundColor: "#E0E0E0",
  },
  taskModalSendButton: {
    backgroundColor: "#7B4DFF",
  },
  taskModalButtonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  // Delete Modal Styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteModalContainer: {
    backgroundColor: "#7B4DFF",
    borderRadius: 16,
    padding: 24,
    width: "80%",
    maxWidth: 400,
  },
  deleteModalTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  deleteModalMessage: {
    color: "#D6C8FF",
    fontSize: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  deleteModalButtons: {
    flexDirection: "column",
    gap: 12,
  },
  deleteModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteModalActionButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  deleteModalCancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  deleteModalActionText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  deleteModalCancelText: {
    color: "#FFD700",
    fontWeight: "bold",
    fontSize: 16,
  },
});