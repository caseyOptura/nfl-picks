// Shapes for league chat. See docs/chat-implementation-plan.md → Shared Contract.

export type ChatMessageKind = 'user' | 'system'

export const REACTION_EMOJI = ['👍', '👎', '😂', '🔥', '😮', '😢', '💯', '🏈'] as const
export type ReactionEmoji = typeof REACTION_EMOJI[number]

export interface ChatMessageRow {
  id: number
  league_id: string
  kind: ChatMessageKind
  user_id: string | null
  body: string
  client_id: string
  system_key: string | null
  reply_to_id: number | null
  created_at: string
  edited_at: string | null
  deleted_at: string | null
  deleted_by: string | null
}

export interface ChatReactionRow {
  message_id: number
  user_id: string
  league_id: string
  emoji: ReactionEmoji
  created_at: string
}

export interface ChatReactionSummary {
  emoji: ReactionEmoji
  count: number
  userIds: string[]
  mine: boolean
}

// Local, not-yet-resolved message state held by useLeagueChat.
export interface LocalChatMessage {
  id: number | null // null while optimistic / pending
  clientId: string
  kind: ChatMessageKind
  userId: string | null
  body: string
  createdAt: string
  editedAt: string | null
  deletedAt: string | null
  deletedBy: string | null
  replyToId: number | null
  status: 'sent' | 'pending' | 'failed'
}

export interface ChatMessageView extends LocalChatMessage {
  displayName: string
  avatarUrl: string | null
  mine: boolean
  mentionsMe: boolean
  canEdit: boolean
  canDelete: boolean
  reactions: ChatReactionSummary[]
  replyTo: ChatReplyPreview | null
}

// ── Realtime payloads (built by the DB triggers in 0005_chat.sql) ──

export interface MessageCreatedEvent {
  id: number
  leagueId: string
  leagueName: string
  kind: ChatMessageKind
  userId: string | null
  senderName: string
  senderAvatarUrl: string | null
  body: string
  clientId: string
  replyToId: number | null
  replyToSnippet: string | null
  mentionedUserIds: string[]
  createdAt: string
}

export interface MessageUpdatedEvent {
  id: number
  leagueId: string
  body: string
  editedAt: string
}

export interface MessageDeletedEvent {
  id: number
  leagueId: string
  deletedBy: string
  deletedAt: string
}

export interface ReactionChangedEvent {
  messageId: number
  leagueId: string
  userId: string
  emoji: ReactionEmoji
  op: 'added' | 'removed'
}

export interface ReactionReceivedEvent {
  messageId: number
  leagueId: string
  leagueName: string
  reactorId: string
  reactorName: string
  reactorAvatarUrl: string | null
  emoji: ReactionEmoji
  snippet: string
}

export interface MemberRemovedEvent {
  leagueId: string
  userId: string
}

export interface ReconnectedEvent {
  leagueId: string
}

export interface ChatHubEvents {
  message_created: MessageCreatedEvent
  message_updated: MessageUpdatedEvent
  message_deleted: MessageDeletedEvent
  reaction_changed: ReactionChangedEvent
  reaction_received: ReactionReceivedEvent
  member_removed: MemberRemovedEvent
  reconnected: ReconnectedEvent
}

export interface ChatNotificationPrefs {
  muted: boolean
  push_messages: boolean
  push_reactions: boolean
}

// Props for the custom vue-sonner toast component (PR 2).
export interface ChatToastProps {
  kind: 'message' | 'reaction' | 'mention'
  avatarUrl: string | null
  senderName: string
  leagueName: string
  snippet: string
  count?: number
  emoji?: string
  to: string
}

// What the composer is doing besides a plain send (PR 5).
export interface ComposerContext {
  kind: 'reply' | 'edit'
  name: string
  snippet: string
}

// A message a reply points at, resolved for display.
export interface ChatReplyPreview {
  id: number
  name: string
  snippet: string
  deleted: boolean
}

export type ChatMessageAction = 'reply' | 'edit' | 'delete' | 'copy'
// Which parts of the message menu to show: emoji row, actions, or both (touch long-press).
export type ChatMenuMode = 'react' | 'actions' | 'both'
