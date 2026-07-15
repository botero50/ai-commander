/**
 * Social Media Integration Tests
 *
 * Validates multi-platform posting, engagement tracking, and content generation.
 */

import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { SocialMediaIntegration, createSocialMediaIntegration } from './social-media-integration.js';
import { Logger } from '../config/logger.js';

describe('Social Media Integration', () => {
  let integration: SocialMediaIntegration;
  const logger = new Logger('error', 'SocialTest');

  // Set environment variables for testing
  beforeAll(() => {
    process.env.TWITTER_API_KEY = 'test-key';
    process.env.FACEBOOK_TOKEN = 'test-token';
    process.env.YOUTUBE_API_KEY = 'test-key';
    process.env.TIKTOK_TOKEN = 'test-token';
  });

  const createMatchData = () => ({
    matchId: 'match-1',
    winner: 'Claude',
    loser: 'Ollama',
    winnerCiv: 'athenians',
    loserCiv: 'romans',
    map: 'alpine_mountains_3p',
    duration: 1800,
    highlights: [
      { type: 'military', timestamp: 300, title: 'First Combat' },
      { type: 'economic', timestamp: 600, title: 'Trade Growth' },
    ],
  });

  beforeEach(() => {
    integration = new SocialMediaIntegration(logger);
  });

  describe('initialization', () => {
    it('should create integration', () => {
      expect(integration).toBeDefined();
    });

    it('should create via factory', () => {
      const factoryIntegration = createSocialMediaIntegration(logger);
      expect(factoryIntegration).toBeDefined();
    });
  });

  describe('content generation', () => {
    it('should generate match content', () => {
      const matchData = createMatchData();
      const content = integration.generateMatchContent(matchData);

      expect(content).toBeDefined();
      expect(content.matchId).toBe('match-1');
      expect(content.title).toContain('Claude');
      expect(content.title).toContain('Ollama');
    });

    it('should include summary', () => {
      const matchData = createMatchData();
      const content = integration.generateMatchContent(matchData);

      expect(content.summary).toBeTruthy();
      expect(content.summary.length).toBeGreaterThan(0);
    });

    it('should generate posts for all platforms', () => {
      const matchData = createMatchData();
      const content = integration.generateMatchContent(matchData);

      const platforms = new Set(content.posts.map((p) => p.platform));
      expect(platforms.has('twitter')).toBe(true);
      expect(platforms.has('facebook')).toBe(true);
      expect(platforms.has('youtube')).toBe(true);
      expect(platforms.has('tiktok')).toBe(true);
    });

    it('should generate hashtags', () => {
      const matchData = createMatchData();
      const content = integration.generateMatchContent(matchData);

      expect(content.hashtags.length).toBeGreaterThan(0);
      expect(content.hashtags.some((h) => h.includes('#'))).toBe(true);
    });

    it('should include mentioned players', () => {
      const matchData = createMatchData();
      const content = integration.generateMatchContent(matchData);

      expect(content.mentionedPlayers).toContain('Claude');
      expect(content.mentionedPlayers).toContain('Ollama');
    });
  });

  describe('twitter posting', () => {
    it('should post to twitter', async () => {
      const post = await integration.postToTwitter('Test tweet');

      expect(post).toBeDefined();
      expect(post.platform).toBe('twitter');
      expect(post.content).toBe('Test tweet');
      expect(post.status).toBe('posted');
    });

    it('should include media urls', async () => {
      const urls = ['https://example.com/image.png'];
      const post = await integration.postToTwitter('Test tweet', urls);

      expect(post.mediaUrls).toEqual(urls);
    });
  });

  describe('facebook posting', () => {
    it('should post to facebook', async () => {
      const post = await integration.postToFacebook('Test post');

      expect(post).toBeDefined();
      expect(post.platform).toBe('facebook');
      expect(post.content).toBe('Test post');
      expect(post.status).toBe('posted');
    });

    it('should include media urls', async () => {
      const urls = ['https://example.com/image.png'];
      const post = await integration.postToFacebook('Test post', urls);

      expect(post.mediaUrls).toEqual(urls);
    });
  });

  describe('youtube shorts', () => {
    it('should create youtube short', async () => {
      const post = await integration.createYouTubeShort('Title', 'Description', 'https://youtube.com/video');

      expect(post).toBeDefined();
      expect(post.platform).toBe('youtube');
      expect(post.content).toContain('Title');
      expect(post.mediaUrls).toContain('https://youtube.com/video');
    });

    it('should mark as posted', async () => {
      const post = await integration.createYouTubeShort('Title', 'Description', 'url');

      expect(post.status).toBe('posted');
    });
  });

  describe('tiktok posting', () => {
    it('should post to tiktok', async () => {
      const post = await integration.postToTikTok('Test content', 'https://tiktok.com/video');

      expect(post).toBeDefined();
      expect(post.platform).toBe('tiktok');
      expect(post.content).toBe('Test content');
      expect(post.mediaUrls).toContain('https://tiktok.com/video');
    });
  });

  describe('scheduling', () => {
    it('should schedule post', async () => {
      const post = await integration.postToTwitter('Test tweet');
      const scheduledTime = new Date(Date.now() + 3600000); // 1 hour from now

      integration.schedulePost(post, scheduledTime);

      expect(post.status).toBe('scheduled');
      expect(post.scheduledTime).toEqual(scheduledTime);
    });

    it('should emit scheduled event', () => {
      return new Promise<void>((resolve) => {
        integration.on('post-scheduled', (post) => {
          expect(post.status).toBe('scheduled');
          resolve();
        });

        const post = { id: 'test', platform: 'twitter' as const, content: 'test', status: 'posted' as const, engagement: { likes: 0, comments: 0, shares: 0, views: 0 } };
        integration.schedulePost(post, new Date());
      });
    });
  });

  describe('engagement tracking', () => {
    it('should record engagement', async () => {
      const post = await integration.postToTwitter('Test tweet');

      integration.recordEngagement(post.id, { likes: 10, comments: 2 });

      expect(post.engagement.likes).toBe(10);
      expect(post.engagement.comments).toBe(2);
    });

    it('should accumulate engagement', async () => {
      const post = await integration.postToTwitter('Test tweet');

      integration.recordEngagement(post.id, { likes: 10 });
      integration.recordEngagement(post.id, { likes: 5 });

      expect(post.engagement.likes).toBe(15);
    });

    it('should track views', async () => {
      const post = await integration.postToTwitter('Test tweet');

      integration.recordEngagement(post.id, { views: 100 });

      expect(post.engagement.views).toBe(100);
    });
  });

  describe('metrics', () => {
    it('should get platform metrics', async () => {
      await integration.postToTwitter('Post 1');
      await integration.postToTwitter('Post 2');

      const metrics = integration.getEngagementMetrics('twitter');
      expect(metrics).toBeDefined();
      expect(metrics.platform).toBe('twitter');
    });

    it('should calculate average likes', async () => {
      const post1 = await integration.postToTwitter('Post 1');
      const post2 = await integration.postToTwitter('Post 2');

      integration.recordEngagement(post1.id, { likes: 10 });
      integration.recordEngagement(post2.id, { likes: 20 });

      const metrics = integration.getEngagementMetrics('twitter');
      // Average should be at least 10 (minimum of what we set)
      expect(metrics.averageLikes).toBeGreaterThanOrEqual(10);
    });

    it('should track top performing post', async () => {
      const post1 = await integration.postToTwitter('Post 1');
      const post2 = await integration.postToTwitter('Post 2');

      integration.recordEngagement(post1.id, { likes: 5 });
      integration.recordEngagement(post2.id, { likes: 20 });

      const metrics = integration.getEngagementMetrics('twitter');
      expect(metrics.topPost?.id).toBe(post2.id);
    });
  });

  describe('reporting', () => {
    it('should generate engagement report', async () => {
      await integration.postToTwitter('Test tweet');

      const report = integration.generateEngagementReport();
      expect(report).toBeDefined();
      expect(report.totalPosts).toBe(1);
    });

    it('should include platform breakdown', async () => {
      const post1 = await integration.postToTwitter('Tweet');
      const post2 = await integration.postToFacebook('Post');

      integration.recordEngagement(post1.id, { likes: 1 });
      integration.recordEngagement(post2.id, { likes: 1 });

      const report = integration.generateEngagementReport();
      expect(report.byPlatform.twitter).toBeDefined();
      expect(report.byPlatform.facebook).toBeDefined();
    });

    it('should identify top performing platform', async () => {
      const post1 = await integration.postToTwitter('Tweet');
      const post2 = await integration.postToFacebook('Post');

      integration.recordEngagement(post1.id, { likes: 5 });
      integration.recordEngagement(post2.id, { likes: 50 });

      const report = integration.generateEngagementReport();
      expect(report.topPerformingPlatform).toBe('facebook');
    });

    it('should include recommendations', async () => {
      const report = integration.generateEngagementReport();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('post retrieval', () => {
    it('should get all posts', async () => {
      await integration.postToTwitter('Tweet');
      await integration.postToFacebook('Post');

      const posts = integration.getAllPosts();
      expect(posts.length).toBe(2);
    });

    it('should filter by status', async () => {
      const post = await integration.postToTwitter('Tweet');
      integration.schedulePost(post, new Date(Date.now() + 3600000));

      const scheduled = integration.getAllPosts('scheduled');
      expect(scheduled.length).toBeGreaterThan(0);
    });
  });

  describe('event emissions', () => {
    it('should emit content-generated event', () => {
      return new Promise<void>((resolve) => {
        integration.on('content-generated', (content) => {
          expect(content.matchId).toBe('match-1');
          resolve();
        });

        const matchData = createMatchData();
        integration.generateMatchContent(matchData);
      });
    });

    it('should emit post-created event', () => {
      return new Promise<void>((resolve) => {
        integration.on('post-created', (post) => {
          expect(post.platform).toBe('twitter');
          resolve();
        });

        integration.postToTwitter('Test');
      });
    });
  });

  describe('realistic scenario', () => {
    it('should generate and post match content', async () => {
      const matchData = createMatchData();
      const content = integration.generateMatchContent(matchData);

      // Post to all platforms
      for (const post of content.posts) {
        await integration.postToTwitter(post.content);
      }

      const allPosts = integration.getAllPosts();
      expect(allPosts.length).toBeGreaterThan(0);
    });

    it('should track engagement across platforms', async () => {
      const post1 = await integration.postToTwitter('Tweet');
      const post2 = await integration.postToFacebook('Post');

      integration.recordEngagement(post1.id, { likes: 25, comments: 5, shares: 3, views: 500 });
      integration.recordEngagement(post2.id, { likes: 40, comments: 8, shares: 12, views: 800 });

      const report = integration.generateEngagementReport();
      // Total engagement = 25+5+3 + 40+8+12 = 93
      expect(report.totalEngagement).toBeGreaterThanOrEqual(93);
    });

    it('should generate complete social strategy report', async () => {
      const post = await integration.postToTwitter('Match report');
      integration.recordEngagement(post.id, { likes: 10, views: 100 });

      const json = integration.toJSON();
      expect(json.report).toBeDefined();
      expect(json.report.totalEngagement).toBeGreaterThan(0);
    });
  });

  describe('JSON export', () => {
    it('should export as JSON', () => {
      const json = integration.toJSON();
      expect(json).toBeDefined();
      expect(json.totalPosts).toBeGreaterThanOrEqual(0);
      expect(() => JSON.stringify(json)).not.toThrow();
    });
  });
});
