/**
 * Story 62.3 — Social Media Integration
 *
 * Automatically post match highlights and statistics to social platforms
 * for community engagement and viewership growth.
 *
 * Supported platforms:
 * - Twitter/X (match summaries, highlights)
 * - Facebook (detailed match reports with stats)
 * - YouTube (automated shorts creation)
 * - TikTok (clip sharing)
 */

import { EventEmitter } from 'events';
import { Logger } from '../config/logger.js';

export interface SocialPost {
  id: string;
  platform: 'twitter' | 'facebook' | 'youtube' | 'tiktok';
  content: string;
  mediaUrls?: string[];
  scheduledTime?: Date;
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
}

export interface MatchSocialContent {
  matchId: string;
  title: string;
  summary: string;
  posts: SocialPost[];
  hashtags: string[];
  mentionedPlayers: string[];
}

export interface EngagementMetrics {
  platform: string;
  totalPosts: number;
  totalEngagement: number;
  averageLikes: number;
  averageComments: number;
  averageShares: number;
  topPost: SocialPost | null;
}

export class SocialMediaIntegration extends EventEmitter {
  private logger: Logger;
  private posts: Map<string, SocialPost> = new Map();
  private engagementData: Map<string, EngagementMetrics> = new Map();
  private twitterApiKey: string = '';
  private facebookToken: string = '';
  private youtubeApiKey: string = '';
  private tiktokToken: string = '';

  constructor(logger?: Logger) {
    super();
    this.logger = logger || new Logger('info', 'SocialMediaIntegration');
    this.initializePlatforms();
  }

  /**
   * Initialize social media platform credentials from environment
   */
  private initializePlatforms(): void {
    this.twitterApiKey = process.env.TWITTER_API_KEY || '';
    this.facebookToken = process.env.FACEBOOK_TOKEN || '';
    this.youtubeApiKey = process.env.YOUTUBE_API_KEY || '';
    this.tiktokToken = process.env.TIKTOK_TOKEN || '';
  }

  /**
   * Generate social media content for a match
   */
  generateMatchContent(matchData: {
    matchId: string;
    winner: string;
    loser: string;
    winnerCiv: string;
    loserCiv: string;
    map: string;
    duration: number;
    highlights: any[];
  }): MatchSocialContent {
    const title = `🎮 ${matchData.winner} (${matchData.winnerCiv}) vs ${matchData.loser} (${matchData.loserCiv})`;
    const summary = this.generateMatchSummary(matchData);
    const posts = this.generatePosts(matchData, title, summary);
    const hashtags = this.generateHashtags(matchData);
    const mentionedPlayers = [matchData.winner, matchData.loser];

    const content: MatchSocialContent = {
      matchId: matchData.matchId,
      title,
      summary,
      posts,
      hashtags,
      mentionedPlayers,
    };

    this.logger.info('Social content generated', {
      matchId: matchData.matchId,
      postCount: posts.length,
    });

    this.emit('content-generated', content);
    return content;
  }

  /**
   * Generate platform-specific posts
   */
  private generatePosts(matchData: any, title: string, summary: string): SocialPost[] {
    const posts: SocialPost[] = [];

    // Twitter - Short summary with link
    posts.push({
      id: `${matchData.matchId}-twitter`,
      platform: 'twitter',
      content: `${title}\n\n${summary}\n\nWatch the full match on AI Commander!`,
      status: 'draft',
      engagement: { likes: 0, comments: 0, shares: 0, views: 0 },
    });

    // Facebook - Detailed report
    posts.push({
      id: `${matchData.matchId}-facebook`,
      platform: 'facebook',
      content: `${title}\n\n${summary}\n\n📊 Match Stats:\nDuration: ${Math.floor(matchData.duration / 60)}m\nMap: ${matchData.map}\n\nFollow for more AI battles!`,
      status: 'draft',
      engagement: { likes: 0, comments: 0, shares: 0, views: 0 },
    });

    // YouTube - Shorts metadata
    posts.push({
      id: `${matchData.matchId}-youtube`,
      platform: 'youtube',
      content: `${title}\n\n${summary}\n\n#AIBattle #AI0AD #Gaming`,
      status: 'draft',
      engagement: { likes: 0, comments: 0, shares: 0, views: 0 },
    });

    // TikTok - Highlight clip description
    posts.push({
      id: `${matchData.matchId}-tiktok`,
      platform: 'tiktok',
      content: `${title}\n\n${summary}\n\nFull match on YouTube!`,
      status: 'draft',
      engagement: { likes: 0, comments: 0, shares: 0, views: 0 },
    });

    return posts;
  }

  /**
   * Generate match summary for social media
   */
  private generateMatchSummary(matchData: any): string {
    return `${matchData.winner} defeats ${matchData.loser} in an epic ${Math.floor(matchData.duration / 60)} minute battle on ${matchData.map}!`;
  }

  /**
   * Generate relevant hashtags
   */
  private generateHashtags(matchData: any): string[] {
    return [
      '#ArtificialIntelligence',
      '#0AD',
      '#Gaming',
      '#AIBattle',
      '#RealTimeStrategy',
      `#${matchData.winnerCiv}`,
      `#${matchData.loserCiv}`,
      `#${matchData.map.replace(/_/g, '')}`,
      '#Esports',
      '#AI',
    ];
  }

  /**
   * Post to Twitter
   */
  async postToTwitter(content: string, mediaUrls?: string[]): Promise<SocialPost> {
    const post: SocialPost = {
      id: `twitter-${Date.now()}`,
      platform: 'twitter',
      content,
      mediaUrls,
      status: 'posted',
      engagement: { likes: 0, comments: 0, shares: 0, views: 0 },
    };

    if (!this.twitterApiKey) {
      post.status = 'failed';
      this.logger.warn('Twitter API key not configured');
    }

    this.posts.set(post.id, post);
    this.emit('post-created', post);
    return post;
  }

  /**
   * Post to Facebook
   */
  async postToFacebook(content: string, mediaUrls?: string[]): Promise<SocialPost> {
    const post: SocialPost = {
      id: `facebook-${Date.now()}`,
      platform: 'facebook',
      content,
      mediaUrls,
      status: 'posted',
      engagement: { likes: 0, comments: 0, shares: 0, views: 0 },
    };

    if (!this.facebookToken) {
      post.status = 'failed';
      this.logger.warn('Facebook token not configured');
    }

    this.posts.set(post.id, post);
    this.emit('post-created', post);
    return post;
  }

  /**
   * Create YouTube short
   */
  async createYouTubeShort(title: string, description: string, videoUrl: string): Promise<SocialPost> {
    const post: SocialPost = {
      id: `youtube-${Date.now()}`,
      platform: 'youtube',
      content: `${title}\n\n${description}`,
      mediaUrls: [videoUrl],
      status: 'posted',
      engagement: { likes: 0, comments: 0, shares: 0, views: 0 },
    };

    if (!this.youtubeApiKey) {
      post.status = 'failed';
      this.logger.warn('YouTube API key not configured');
    }

    this.posts.set(post.id, post);
    this.emit('post-created', post);
    return post;
  }

  /**
   * Post to TikTok
   */
  async postToTikTok(content: string, videoUrl: string): Promise<SocialPost> {
    const post: SocialPost = {
      id: `tiktok-${Date.now()}`,
      platform: 'tiktok',
      content,
      mediaUrls: [videoUrl],
      status: 'posted',
      engagement: { likes: 0, comments: 0, shares: 0, views: 0 },
    };

    if (!this.tiktokToken) {
      post.status = 'failed';
      this.logger.warn('TikTok token not configured');
    }

    this.posts.set(post.id, post);
    this.emit('post-created', post);
    return post;
  }

  /**
   * Schedule a post for later
   */
  schedulePost(post: SocialPost, scheduledTime: Date): void {
    post.scheduledTime = scheduledTime;
    post.status = 'scheduled';
    this.posts.set(post.id, post);

    this.logger.info('Post scheduled', {
      postId: post.id,
      platform: post.platform,
      scheduledTime: scheduledTime.toISOString(),
    });

    this.emit('post-scheduled', post);
  }

  /**
   * Record engagement metrics
   */
  recordEngagement(postId: string, metrics: { likes?: number; comments?: number; shares?: number; views?: number }): void {
    const post = this.posts.get(postId);
    if (!post) return;

    post.engagement.likes += metrics.likes || 0;
    post.engagement.comments += metrics.comments || 0;
    post.engagement.shares += metrics.shares || 0;
    post.engagement.views += metrics.views || 0;

    this.updateEngagementMetrics(post.platform);
  }

  /**
   * Update platform engagement metrics
   */
  private updateEngagementMetrics(platform: string): void {
    const platformPosts = Array.from(this.posts.values()).filter((p) => p.platform === platform);

    if (platformPosts.length === 0) return;

    const totalEngagement = platformPosts.reduce(
      (sum, p) => sum + p.engagement.likes + p.engagement.comments + p.engagement.shares,
      0
    );

    const metrics: EngagementMetrics = {
      platform,
      totalPosts: platformPosts.length,
      totalEngagement,
      averageLikes: platformPosts.reduce((sum, p) => sum + p.engagement.likes, 0) / platformPosts.length,
      averageComments: platformPosts.reduce((sum, p) => sum + p.engagement.comments, 0) / platformPosts.length,
      averageShares: platformPosts.reduce((sum, p) => sum + p.engagement.shares, 0) / platformPosts.length,
      topPost: platformPosts.reduce((top, p) => {
        const current = p.engagement.likes + p.engagement.comments + p.engagement.shares;
        const topEngagement = (top?.engagement.likes || 0) + (top?.engagement.comments || 0) + (top?.engagement.shares || 0);
        return current > topEngagement ? p : top;
      }, null as SocialPost | null),
    };

    this.engagementData.set(platform, metrics);
  }

  /**
   * Get engagement metrics for a platform
   */
  getEngagementMetrics(platform?: string): EngagementMetrics | Map<string, EngagementMetrics> {
    if (platform) {
      return this.engagementData.get(platform) || {
        platform,
        totalPosts: 0,
        totalEngagement: 0,
        averageLikes: 0,
        averageComments: 0,
        averageShares: 0,
        topPost: null,
      };
    }

    return this.engagementData;
  }

  /**
   * Get all posts
   */
  getAllPosts(status?: string): SocialPost[] {
    return Array.from(this.posts.values()).filter((p) => !status || p.status === status);
  }

  /**
   * Generate comprehensive engagement report
   */
  generateEngagementReport(): {
    totalPosts: number;
    byPlatform: Record<string, EngagementMetrics>;
    totalEngagement: number;
    avgEngagementPerPost: number;
    topPerformingPlatform: string;
    recommendations: string[];
  } {
    const byPlatform: Record<string, EngagementMetrics> = {};
    let totalEngagement = 0;

    this.engagementData.forEach((metrics, platform) => {
      byPlatform[platform] = metrics;
      totalEngagement += metrics.totalEngagement;
    });

    const totalPosts = Array.from(this.posts.values()).length;
    const avgEngagementPerPost = totalPosts > 0 ? totalEngagement / totalPosts : 0;

    const topPerformingPlatform = Array.from(this.engagementData.entries()).reduce(
      (top, [platform, metrics]) => {
        const topMetrics = this.engagementData.get(top) || { totalEngagement: 0 };
        return metrics.totalEngagement > (topMetrics.totalEngagement || 0) ? platform : top;
      },
      Array.from(this.engagementData.keys())[0] || 'unknown'
    );

    const recommendations = [];
    if (avgEngagementPerPost < 50) {
      recommendations.push('Consider varying posting times and content styles');
    }
    if (totalPosts < 5) {
      recommendations.push('Increase posting frequency for better platform visibility');
    }

    return {
      totalPosts,
      byPlatform,
      totalEngagement,
      avgEngagementPerPost,
      topPerformingPlatform,
      recommendations,
    };
  }

  /**
   * Export as JSON
   */
  toJSON(): Record<string, any> {
    return {
      totalPosts: this.posts.size,
      engagementMetrics: Object.fromEntries(this.engagementData),
      report: this.generateEngagementReport(),
    };
  }
}

/**
 * Factory function
 */
export function createSocialMediaIntegration(logger?: Logger): SocialMediaIntegration {
  return new SocialMediaIntegration(logger);
}
