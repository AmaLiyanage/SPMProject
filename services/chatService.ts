import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * Create a new chat or return existing chatId.
 * Ensures lastMessage is always updated.
 */
export async function createOrGetChat(
  userId: string,
  mentorId: string,
  firstMessage?: string
) {
  const chatQuery = query(
    collection(db, "chats"),
    where("userId", "==", userId),
    where("mentorId", "==", mentorId)
  );

  const snapshot = await getDocs(chatQuery);

  if (!snapshot.empty) {
    const existingChatId = snapshot.docs[0].id;

    if (firstMessage) {
      await sendMessage(existingChatId, userId, "text", firstMessage);
    }

    return existingChatId;
  }

  const chatRef = await addDoc(collection(db, "chats"), {
    mentorId,
    userId,
    lastMessage: firstMessage || "",
    timestamp: serverTimestamp(),
  });

  if (firstMessage) {
    const messagesRef = collection(db, "chats", chatRef.id, "messages");
    await addDoc(messagesRef, {
      type: "text",
      content: firstMessage,
      senderId: userId,
      timestamp: serverTimestamp(),
      status: "sent",
      deletedFor: [],
    });

    await updateDoc(doc(db, "chats", chatRef.id), {
      lastMessage: firstMessage,
      timestamp: serverTimestamp(),
    });
  }

  return chatRef.id;
}

/**
 * Send a new message in an existing chat
 */
export async function sendMessage(
  chatId: string,
  userId: string,
  type: "text" | "voice" | "video",
  content: string,
  duration?: number
) {
  const messagesRef = collection(db, "chats", chatId, "messages");

  const messageData: any = {
    type,
    content,
    senderId: userId,
    timestamp: serverTimestamp(),
    status: "sent",
    deletedFor: [],
  };

  if (duration) messageData.duration = duration;

  await addDoc(messagesRef, messageData);

  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: type === "text" ? content : `${type} message`,
    timestamp: serverTimestamp(),
  });
}

/**
 * Delete message for current user ("Delete for me")
 */
export async function deleteMessageForMe(
  chatId: string,
  messageId: string,
  userId: string
) {
  const messageRef = doc(db, "chats", chatId, "messages", messageId);
  await updateDoc(messageRef, {
    deletedFor: arrayUnion(userId),
  });
}

/**
 * Delete message for everyone ("Delete for everyone")
 * Only the sender can perform this.
 * Converts the message into a deleted placeholder instead of removing it.
 */
export async function deleteMessageForEveryone(
  chatId: string,
  messageId: string,
  senderId: string,
  currentUserId: string
) {
  if (senderId !== currentUserId) {
    throw new Error("Only the sender can delete message for everyone.");
  }

  const messageRef = doc(db, "chats", chatId, "messages", messageId);
  await updateDoc(messageRef, {
    type: "deleted",
    content: "This message was deleted",
  });
}
