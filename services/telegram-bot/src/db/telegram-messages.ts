import { getDatabase } from "./client"
import type { TelegramMessage } from "../types/intake"

export interface CreateTelegramMessageInput {
  sessionId: string
  telegramId: number
  telegramChatId: number
  direction: "inbound" | "outbound"
  messageType: TelegramMessage["messageType"]
  content: string
  messageId?: number
  metadata?: Record<string, unknown>
}

function mapRowToTelegramMessage(row: Record<string, unknown>): TelegramMessage {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    telegramId: row.telegram_id as number,
    telegramChatId: row.telegram_chat_id as number,
    direction: row.direction as "inbound" | "outbound",
    messageType: row.message_type as TelegramMessage["messageType"],
    content: row.content as string,
    messageId: row.message_id as number | null,
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: new Date(row.created_at as string),
  }
}

export async function createTelegramMessage(
  input: CreateTelegramMessageInput
): Promise<TelegramMessage | null> {
  const db = getDatabase()
  if (!db) return null

  const { data, error } = await db
    .from("intel_telegram_messages")
    .insert({
      session_id: input.sessionId,
      telegram_id: input.telegramId,
      telegram_chat_id: input.telegramChatId,
      direction: input.direction,
      message_type: input.messageType,
      content: input.content,
      message_id: input.messageId || null,
      metadata: input.metadata || {},
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating telegram message:", error)
    return null
  }

  return mapRowToTelegramMessage(data)
}

export async function getMessagesBySession(
  sessionId: string
): Promise<TelegramMessage[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_telegram_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching telegram messages:", error)
    return []
  }

  return (data || []).map(mapRowToTelegramMessage)
}

export async function getMessagesByTelegramId(
  telegramId: number,
  limit: number = 100
): Promise<TelegramMessage[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_telegram_messages")
    .select("*")
    .eq("telegram_id", telegramId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching telegram messages by user:", error)
    return []
  }

  return (data || []).map(mapRowToTelegramMessage).reverse()
}

export async function getRecentMessages(
  telegramId: number,
  count: number = 10
): Promise<TelegramMessage[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_telegram_messages")
    .select("*")
    .eq("telegram_id", telegramId)
    .order("created_at", { ascending: false })
    .limit(count)

  if (error) {
    console.error("Error fetching recent messages:", error)
    return []
  }

  return (data || []).map(mapRowToTelegramMessage).reverse()
}

export async function getMessagesByType(
  sessionId: string,
  messageType: TelegramMessage["messageType"]
): Promise<TelegramMessage[]> {
  const db = getDatabase()
  if (!db) return []

  const { data, error } = await db
    .from("intel_telegram_messages")
    .select("*")
    .eq("session_id", sessionId)
    .eq("message_type", messageType)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching messages by type:", error)
    return []
  }

  return (data || []).map(mapRowToTelegramMessage)
}

export async function logInboundMessage(
  sessionId: string,
  telegramId: number,
  chatId: number,
  content: string,
  messageId?: number
): Promise<TelegramMessage | null> {
  return createTelegramMessage({
    sessionId,
    telegramId,
    telegramChatId: chatId,
    direction: "inbound",
    messageType: "answer",
    content,
    messageId,
  })
}

export async function logOutboundQuestion(
  sessionId: string,
  telegramId: number,
  chatId: number,
  content: string,
  messageId?: number
): Promise<TelegramMessage | null> {
  return createTelegramMessage({
    sessionId,
    telegramId,
    telegramChatId: chatId,
    direction: "outbound",
    messageType: "question",
    content,
    messageId,
  })
}

export async function logOutboundStatus(
  sessionId: string,
  telegramId: number,
  chatId: number,
  content: string,
  messageId?: number
): Promise<TelegramMessage | null> {
  return createTelegramMessage({
    sessionId,
    telegramId,
    telegramChatId: chatId,
    direction: "outbound",
    messageType: "status",
    content,
    messageId,
  })
}

export async function logOutboundDeliverable(
  sessionId: string,
  telegramId: number,
  chatId: number,
  content: string,
  deliverableType: string,
  messageId?: number
): Promise<TelegramMessage | null> {
  return createTelegramMessage({
    sessionId,
    telegramId,
    telegramChatId: chatId,
    direction: "outbound",
    messageType: "deliverable",
    content,
    messageId,
    metadata: { deliverableType },
  })
}

export async function logOutboundError(
  sessionId: string,
  telegramId: number,
  chatId: number,
  content: string,
  errorDetails?: Record<string, unknown>
): Promise<TelegramMessage | null> {
  return createTelegramMessage({
    sessionId,
    telegramId,
    telegramChatId: chatId,
    direction: "outbound",
    messageType: "error",
    content,
    metadata: errorDetails,
  })
}

export async function deleteMessagesBySession(
  sessionId: string
): Promise<boolean> {
  const db = getDatabase()
  if (!db) return false

  const { error } = await db
    .from("intel_telegram_messages")
    .delete()
    .eq("session_id", sessionId)

  if (error) {
    console.error("Error deleting telegram messages:", error)
    return false
  }

  return true
}

export async function getConversationContext(
  telegramId: number,
  maxMessages: number = 20
): Promise<string> {
  const messages = await getRecentMessages(telegramId, maxMessages)
  
  return messages
    .map(m => `${m.direction === "inbound" ? "User" : "KORA"}: ${m.content}`)
    .join("\n\n")
}
