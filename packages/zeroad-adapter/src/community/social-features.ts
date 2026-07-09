/**
 * Social Features
 * Player profiles, follow system, and messaging
 */

export interface PlayerProfile {
  profileId: string;
  playerId: string;
  playerName: string;
  bio?: string;
  avatar?: string;
  level: number;
  totalMatches: number;
  totalWins: number;
  favoriteStrategy?: string;
  joinedAt: number;
  lastActive: number;
  visibility: 'public' | 'private' | 'friends_only';
  statistics: {
    totalElo: number;
    averageWinrate: number;
    favoriteMap?: string;
    preferredCiv?: string;
  };
}

export interface SocialConnection {
  connectionId: string;
  playerId: string;
  targetPlayerId: string;
  status: 'friend' | 'pending' | 'blocked';
  connectedAt?: number;
  requestedAt?: number;
}

export interface Message {
  messageId: string;
  senderId: string;
  recipientId: string;
  content: string;
  sentAt: number;
  readAt?: number;
  edited: boolean;
}

export interface Conversation {
  conversationId: string;
  participantIds: string[];
  messages: Message[];
  lastMessageAt: number;
  unreadCount: number;
}

/**
 * Social features manager
 */
export class SocialFeaturesManager {
  private profiles: Map<string, PlayerProfile> = new Map();
  private connections: Map<string, SocialConnection[]> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private socialCounter: number = 0;

  constructor() {}

  /**
   * Create player profile
   */
  createProfile(
    playerId: string,
    playerName: string,
    bio?: string
  ): PlayerProfile {
    const profileId = `prof_${Date.now()}_${this.socialCounter++}`;

    const profile: PlayerProfile = {
      profileId,
      playerId,
      playerName,
      bio,
      level: 1,
      totalMatches: 0,
      totalWins: 0,
      joinedAt: Date.now(),
      lastActive: Date.now(),
      visibility: 'public',
      statistics: {
        totalElo: 1000,
        averageWinrate: 0,
        favoriteMap: 'Default',
        preferredCiv: 'Britons',
      },
    };

    this.profiles.set(playerId, profile);

    return { ...profile };
  }

  /**
   * Get player profile
   */
  getProfile(playerId: string): PlayerProfile | null {
    return this.profiles.get(playerId) || null;
  }

  /**
   * Update profile
   */
  updateProfile(playerId: string, updates: Partial<PlayerProfile>): boolean {
    const profile = this.profiles.get(playerId);
    if (!profile) return false;

    Object.assign(profile, updates);
    profile.lastActive = Date.now();

    return true;
  }

  /**
   * Send friend request
   */
  sendFriendRequest(playerId: string, targetPlayerId: string): SocialConnection | null {
    if (playerId === targetPlayerId) return null;

    const connections = this.connections.get(playerId) || [];

    // Check if already connected
    if (connections.find((c) => c.targetPlayerId === targetPlayerId)) {
      return null;
    }

    const connectionId = `conn_${Date.now()}_${this.socialCounter++}`;

    const connection: SocialConnection = {
      connectionId,
      playerId,
      targetPlayerId,
      status: 'pending',
      requestedAt: Date.now(),
    };

    connections.push(connection);
    this.connections.set(playerId, connections);

    return { ...connection };
  }

  /**
   * Accept friend request
   */
  acceptFriendRequest(playerId: string, senderId: string): boolean {
    const senderConnections = this.connections.get(senderId) || [];
    const connection = senderConnections.find((c) => c.targetPlayerId === playerId && c.status === 'pending');

    if (!connection) return false;

    connection.status = 'friend';
    connection.connectedAt = Date.now();

    // Create reverse connection for recipient
    const recipientConnections = this.connections.get(playerId) || [];
    recipientConnections.push({
      connectionId: `conn_${Date.now()}_${this.socialCounter++}`,
      playerId,
      targetPlayerId: senderId,
      status: 'friend',
      connectedAt: Date.now(),
    });
    this.connections.set(playerId, recipientConnections);

    return true;
  }

  /**
   * Reject friend request
   */
  rejectFriendRequest(playerId: string, senderId: string): boolean {
    const senderConnections = this.connections.get(senderId) || [];
    const index = senderConnections.findIndex(
      (c) => c.targetPlayerId === playerId && c.status === 'pending'
    );

    if (index === -1) return false;

    senderConnections.splice(index, 1);

    return true;
  }

  /**
   * Get friends list
   */
  getFriends(playerId: string): PlayerProfile[] {
    const connections = this.connections.get(playerId) || [];
    const friendIds = connections
      .filter((c) => c.status === 'friend')
      .map((c) => c.targetPlayerId);

    return friendIds
      .map((id) => this.profiles.get(id))
      .filter((p) => p !== undefined) as PlayerProfile[];
  }

  /**
   * Get pending requests
   */
  getPendingRequests(playerId: string): SocialConnection[] {
    const pending: SocialConnection[] = [];

    for (const [senderId, connections] of this.connections) {
      const request = connections.find(
        (c) => c.targetPlayerId === playerId && c.status === 'pending'
      );
      if (request) {
        pending.push(request);
      }
    }

    return pending;
  }

  /**
   * Send message
   */
  sendMessage(senderId: string, recipientId: string, content: string): Message | null {
    const conversationId = this.getConversationId(senderId, recipientId);
    let conversation = this.conversations.get(conversationId);

    if (!conversation) {
      conversation = {
        conversationId,
        participantIds: [senderId, recipientId],
        messages: [],
        lastMessageAt: Date.now(),
        unreadCount: 1,
      };
      this.conversations.set(conversationId, conversation);
    }

    const message: Message = {
      messageId: `msg_${Date.now()}_${this.socialCounter++}`,
      senderId,
      recipientId,
      content,
      sentAt: Date.now(),
      edited: false,
    };

    conversation.messages.push(message);
    conversation.lastMessageAt = Date.now();
    conversation.unreadCount++;

    return { ...message };
  }

  /**
   * Get conversation
   */
  getConversation(playerId: string, targetId: string): Conversation | null {
    const conversationId = this.getConversationId(playerId, targetId);
    const conversation = this.conversations.get(conversationId);

    if (conversation) {
      conversation.unreadCount = 0; // Mark as read
      return { ...conversation };
    }

    return null;
  }

  /**
   * Mark messages as read
   */
  markMessagesAsRead(playerId: string, targetId: string): boolean {
    const conversationId = this.getConversationId(playerId, targetId);
    const conversation = this.conversations.get(conversationId);

    if (!conversation) return false;

    for (const message of conversation.messages) {
      if (message.recipientId === playerId && !message.readAt) {
        message.readAt = Date.now();
      }
    }

    conversation.unreadCount = 0;

    return true;
  }

  /**
   * Get all conversations for player
   */
  getConversations(playerId: string): Conversation[] {
    const conversations: Conversation[] = [];

    for (const conversation of this.conversations.values()) {
      if (conversation.participantIds.includes(playerId)) {
        conversations.push({ ...conversation });
      }
    }

    return conversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  }

  /**
   * Block player
   */
  blockPlayer(playerId: string, blockedId: string): boolean {
    const connections = this.connections.get(playerId) || [];

    // Remove existing connection
    const index = connections.findIndex((c) => c.targetPlayerId === blockedId);
    if (index >= 0) {
      connections.splice(index, 1);
    }

    // Add blocked connection
    connections.push({
      connectionId: `conn_${Date.now()}_${this.socialCounter++}`,
      playerId,
      targetPlayerId: blockedId,
      status: 'blocked',
    });

    this.connections.set(playerId, connections);

    return true;
  }

  /**
   * Get social statistics
   */
  getSocialStats(playerId: string): {
    friendCount: number;
    pendingRequests: number;
    blockedCount: number;
    totalMessages: number;
  } {
    const connections = this.connections.get(playerId) || [];
    const conversations = this.getConversations(playerId);

    const friendCount = connections.filter((c) => c.status === 'friend').length;
    const pendingRequests = this.getPendingRequests(playerId).length;
    const blockedCount = connections.filter((c) => c.status === 'blocked').length;
    const totalMessages = conversations.reduce((sum, c) => sum + c.messages.length, 0);

    return {
      friendCount,
      pendingRequests,
      blockedCount,
      totalMessages,
    };
  }

  /**
   * Reset all social data
   */
  reset(): void {
    this.profiles.clear();
    this.connections.clear();
    this.conversations.clear();
    this.socialCounter = 0;
  }

  /**
   * Helper: Generate conversation ID
   */
  private getConversationId(playerId: string, targetId: string): string {
    const ids = [playerId, targetId].sort();
    return `conv_${ids[0]}_${ids[1]}`;
  }
}
