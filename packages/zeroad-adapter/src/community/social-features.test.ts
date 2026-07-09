import { SocialFeaturesManager } from './social-features';

describe('SocialFeaturesManager', () => {
  let manager: SocialFeaturesManager;

  beforeEach(() => {
    manager = new SocialFeaturesManager();
  });

  describe('Player Profiles', () => {
    test('creates player profile', () => {
      const profile = manager.createProfile('player1', 'John Gamer', 'Competitive player');

      expect(profile.profileId).toBeDefined();
      expect(profile.playerId).toBe('player1');
      expect(profile.playerName).toBe('John Gamer');
      expect(profile.level).toBe(1);
      expect(profile.visibility).toBe('public');
    });

    test('gets existing profile', () => {
      manager.createProfile('player1', 'John', 'Bio');
      const profile = manager.getProfile('player1');

      expect(profile).toBeDefined();
      expect(profile?.playerName).toBe('John');
    });

    test('returns null for non-existent profile', () => {
      const profile = manager.getProfile('nonexistent');
      expect(profile).toBeNull();
    });

    test('updates player profile', () => {
      manager.createProfile('player1', 'John', 'Bio');
      const updated = manager.updateProfile('player1', { level: 10 });

      expect(updated).toBe(true);
      const profile = manager.getProfile('player1');
      expect(profile?.level).toBe(10);
    });

    test('tracks last activity time', () => {
      manager.createProfile('player1', 'John');
      const before = Date.now();
      manager.updateProfile('player1', { level: 5 });
      const after = Date.now();

      const profile = manager.getProfile('player1');
      expect(profile?.lastActive).toBeGreaterThanOrEqual(before);
      expect(profile?.lastActive).toBeLessThanOrEqual(after);
    });
  });

  describe('Friend System', () => {
    beforeEach(() => {
      manager.createProfile('player1', 'Player One');
      manager.createProfile('player2', 'Player Two');
      manager.createProfile('player3', 'Player Three');
    });

    test('sends friend request', () => {
      const request = manager.sendFriendRequest('player1', 'player2');

      expect(request).toBeDefined();
      expect(request?.status).toBe('pending');
      expect(request?.playerId).toBe('player1');
      expect(request?.targetPlayerId).toBe('player2');
    });

    test('prevents self-friend requests', () => {
      const request = manager.sendFriendRequest('player1', 'player1');
      expect(request).toBeNull();
    });

    test('prevents duplicate friend requests', () => {
      manager.sendFriendRequest('player1', 'player2');
      const duplicate = manager.sendFriendRequest('player1', 'player2');

      expect(duplicate).toBeNull();
    });

    test('accepts friend request', () => {
      manager.sendFriendRequest('player1', 'player2');
      const accepted = manager.acceptFriendRequest('player2', 'player1');

      expect(accepted).toBe(true);
    });

    test('rejects friend request', () => {
      manager.sendFriendRequest('player1', 'player2');
      const rejected = manager.rejectFriendRequest('player2', 'player1');

      expect(rejected).toBe(true);
    });

    test('gets friends list', () => {
      manager.sendFriendRequest('player1', 'player2');
      manager.acceptFriendRequest('player2', 'player1');

      manager.sendFriendRequest('player1', 'player3');
      manager.acceptFriendRequest('player3', 'player1');

      const friends = manager.getFriends('player1');
      expect(friends.length).toBe(2);
      expect(friends.some((f) => f.playerId === 'player2')).toBe(true);
      expect(friends.some((f) => f.playerId === 'player3')).toBe(true);
    });

    test('gets pending requests', () => {
      manager.sendFriendRequest('player1', 'player2');
      manager.sendFriendRequest('player3', 'player2');

      const pending = manager.getPendingRequests('player2');
      expect(pending.length).toBe(2);
      expect(pending.every((p) => p.status === 'pending')).toBe(true);
    });

    test('blocks player', () => {
      const blocked = manager.blockPlayer('player1', 'player2');
      expect(blocked).toBe(true);
    });
  });

  describe('Messaging', () => {
    beforeEach(() => {
      manager.createProfile('player1', 'Player One');
      manager.createProfile('player2', 'Player Two');
    });

    test('sends message', () => {
      const message = manager.sendMessage('player1', 'player2', 'Hello!');

      expect(message).toBeDefined();
      expect(message?.senderId).toBe('player1');
      expect(message?.recipientId).toBe('player2');
      expect(message?.content).toBe('Hello!');
      expect(message?.edited).toBe(false);
    });

    test('creates conversation on first message', () => {
      manager.sendMessage('player1', 'player2', 'Hello!');
      const conversation = manager.getConversation('player1', 'player2');

      expect(conversation).toBeDefined();
      expect(conversation?.messages.length).toBe(1);
    });

    test('appends message to existing conversation', () => {
      manager.sendMessage('player1', 'player2', 'Message 1');
      manager.sendMessage('player1', 'player2', 'Message 2');

      const conversation = manager.getConversation('player1', 'player2');
      expect(conversation?.messages.length).toBe(2);
    });

    test('marks messages as read', () => {
      manager.sendMessage('player1', 'player2', 'Hello!');
      const marked = manager.markMessagesAsRead('player2', 'player1');

      expect(marked).toBe(true);
      const conversation = manager.getConversation('player2', 'player1');
      expect(conversation?.unreadCount).toBe(0);
    });

    test('gets all conversations', () => {
      manager.createProfile('player3', 'Player Three');

      manager.sendMessage('player1', 'player2', 'Hi');
      manager.sendMessage('player1', 'player3', 'Hello');

      const conversations = manager.getConversations('player1');
      expect(conversations.length).toBe(2);
    });

    test('sorts conversations by recent', () => {
      manager.sendMessage('player1', 'player2', 'Message 1');
      manager.createProfile('player3', 'Player Three');
      // Small delay to ensure different timestamps
      const before = Date.now();
      while (Date.now() === before) {
        // busy wait to ensure time advances
      }
      manager.sendMessage('player1', 'player3', 'Message 2');

      const conversations = manager.getConversations('player1');
      expect(conversations[0].participantIds).toContain('player3');
      expect(conversations[1].participantIds).toContain('player2');
    });
  });

  describe('Social Statistics', () => {
    beforeEach(() => {
      manager.createProfile('player1', 'Player One');
      manager.createProfile('player2', 'Player Two');
    });

    test('calculates social stats', () => {
      manager.sendFriendRequest('player1', 'player2');
      manager.acceptFriendRequest('player2', 'player1');

      manager.sendMessage('player1', 'player2', 'Hi');
      manager.sendMessage('player2', 'player1', 'Hello');

      const stats = manager.getSocialStats('player1');

      expect(stats.friendCount).toBe(1);
      expect(stats.pendingRequests).toBe(0);
      expect(stats.totalMessages).toBe(2);
    });

    test('tracks pending requests in stats', () => {
      manager.createProfile('player3', 'Player Three');
      manager.sendFriendRequest('player2', 'player1');
      manager.sendFriendRequest('player3', 'player1');

      const stats = manager.getSocialStats('player1');
      expect(stats.pendingRequests).toBe(2);
    });

    test('tracks blocked players', () => {
      manager.blockPlayer('player1', 'player2');

      const stats = manager.getSocialStats('player1');
      expect(stats.blockedCount).toBe(1);
    });
  });

  describe('Data Isolation', () => {
    test('players have independent profiles', () => {
      manager.createProfile('player1', 'Player One');
      manager.createProfile('player2', 'Player Two');

      const p1 = manager.getProfile('player1');
      const p2 = manager.getProfile('player2');

      expect(p1?.playerName).toBe('Player One');
      expect(p2?.playerName).toBe('Player Two');
    });

    test('conversations are bidirectional', () => {
      manager.createProfile('player1', 'One');
      manager.createProfile('player2', 'Two');

      manager.sendMessage('player1', 'player2', 'Hi');
      const conv1 = manager.getConversation('player1', 'player2');
      const conv2 = manager.getConversation('player2', 'player1');

      expect(conv1?.conversationId).toBe(conv2?.conversationId);
    });
  });

  describe('Reset', () => {
    test('resets all data', () => {
      manager.createProfile('player1', 'Player One');
      manager.createProfile('player2', 'Player Two');
      manager.sendMessage('player1', 'player2', 'Hi');

      manager.reset();

      expect(manager.getProfile('player1')).toBeNull();
      expect(manager.getConversation('player1', 'player2')).toBeNull();
    });
  });
});
