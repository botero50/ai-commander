/**
 * Visual Review Analyzer
 *
 * Analyzes broadcast for visual quality issues:
 * - Dead time (prolonged inactivity)
 * - Confusing UI elements
 * - Missing information
 * - Visual flicker
 * - Camera issues
 */

export class VisualReviewAnalyzer {
  constructor() {
    this.matches = [];
    this.issues = [];
    this.recommendations = [];
    this.reviewMetrics = {
      totalMatches: 0,
      totalMoves: 0,
      averageGameLength: 0,
      issuesFound: 0,
      criticalIssues: 0,
      warningIssues: 0,
    };
  }

  /**
   * Analyze a match for visual quality
   */
  analyzeMatch(matchData) {
    const match = {
      id: matchData.id || `match-${this.matches.length + 1}`,
      white: matchData.white,
      black: matchData.black,
      moveCount: matchData.moveCount,
      duration: matchData.duration,
      issues: [],
      score: 100,
    };

    // Check for dead time
    this.checkDeadTime(match, matchData);

    // Check for UI clarity
    this.checkUIClarity(match, matchData);

    // Check for missing information
    this.checkMissingInfo(match, matchData);

    // Check for visual flicker
    this.checkVisualFlicker(match, matchData);

    // Check for camera/overlay issues
    this.checkCameraIssues(match, matchData);

    // Update overall score
    match.score = Math.max(0, 100 - (match.issues.length * 5));

    this.matches.push(match);
    this.reviewMetrics.totalMatches++;
    this.reviewMetrics.totalMoves += matchData.moveCount;

    return match;
  }

  /**
   * Check for dead time (long periods without meaningful updates)
   */
  checkDeadTime(match, matchData) {
    // Dead time is when the broadcast shows no activity for >5 seconds
    const moveInterval = (matchData.duration / matchData.moveCount) * 1000; // ms per move

    if (moveInterval > 5000) {
      match.issues.push({
        severity: 'warning',
        category: 'dead-time',
        description: `Slow game pace (${(moveInterval / 1000).toFixed(1)}s per move) may cause viewer boredom`,
        recommendation: 'Show analysis or player stats during slow periods',
      });
    }

    // Check for move clustering
    if (matchData.moveCount < 20) {
      match.issues.push({
        severity: 'info',
        category: 'short-game',
        description: `Short game (${matchData.moveCount} moves) ends quickly`,
        recommendation: 'Ensure post-game summary is compelling to maintain viewer engagement',
      });
    }
  }

  /**
   * Check for UI clarity issues
   */
  checkUIClarity(match, matchData) {
    const checks = [
      {
        name: 'Player Names Visible',
        ok: matchData.overlayPresent && matchData.playerNames,
        issue: 'Player names may be hard to read',
        recommendation: 'Increase font size or add background contrast',
      },
      {
        name: 'Move Counter Clear',
        ok: matchData.overlayPresent && matchData.moveCount > 0,
        issue: 'Move counter not prominently displayed',
        recommendation: 'Display move number in large font (24pt+)',
      },
      {
        name: 'Event Indicators Visible',
        ok: matchData.eventCount > 0,
        issue: 'Event indicators (captures, checks) may be too subtle',
        recommendation: 'Use larger icons or animated transitions for events',
      },
      {
        name: 'Timer Readable',
        ok: matchData.timerVisible,
        issue: 'Game timer not visible or too small',
        recommendation: 'Display timer in upper right corner (18pt+)',
      },
      {
        name: 'Score/Material Count',
        ok: matchData.materialCountVisible,
        issue: 'Material count/score gap not displayed',
        recommendation: 'Show material count (pieces remaining)',
      },
    ];

    for (const check of checks) {
      if (!check.ok) {
        match.issues.push({
          severity: 'warning',
          category: 'ui-clarity',
          description: check.issue,
          recommendation: check.recommendation,
        });
      }
    }
  }

  /**
   * Check for missing information
   */
  checkMissingInfo(match, matchData) {
    const checks = [
      {
        name: 'Opening Name',
        ok: matchData.opening !== undefined,
        issue: 'Opening not identified or displayed',
        recommendation: 'Display opening name during early game',
      },
      {
        name: 'Player Ratings',
        ok: matchData.playerRatings !== undefined,
        issue: 'Player ratings/strength not shown',
        recommendation: 'Display ELO ratings or skill levels in player cards',
      },
      {
        name: 'Game Status',
        ok: matchData.gameStatus !== undefined,
        issue: 'Game status (ongoing/completed) unclear',
        recommendation: 'Add status indicator or final result banner',
      },
      {
        name: 'Commentary Available',
        ok: matchData.commentaryPresent === true,
        issue: 'No live commentary or analysis',
        recommendation: 'Add AI-generated commentary on key moves',
      },
      {
        name: 'Capture Notifications',
        ok: matchData.captureCount > 0,
        issue: 'Piece captures not clearly highlighted',
        recommendation: 'Show capture animation or notification',
      },
    ];

    for (const check of checks) {
      if (!check.ok) {
        match.issues.push({
          severity: 'warning',
          category: 'missing-info',
          description: check.issue,
          recommendation: check.recommendation,
        });
      }
    }
  }

  /**
   * Check for visual flicker or jitter
   */
  checkVisualFlicker(match, matchData) {
    // Flicker check: too many updates per second
    const updatesPerSecond = matchData.overlayUpdates / (matchData.duration / 1000);

    if (updatesPerSecond > 10) {
      match.issues.push({
        severity: 'warning',
        category: 'flicker',
        description: `High update frequency (${updatesPerSecond.toFixed(1)} updates/sec) may cause visual flicker`,
        recommendation: 'Throttle updates to max 5-10 per second, batch UI changes',
      });
    }

    // Check for inconsistent animation timing
    if (matchData.animationLatency && matchData.animationLatency > 200) {
      match.issues.push({
        severity: 'warning',
        category: 'animation',
        description: `Animation latency (${matchData.animationLatency}ms) feels sluggish`,
        recommendation: 'Target 60-100ms animation transitions for snappy feel',
      });
    }

    // Check for frame drops
    if (matchData.droppedFrames > 0) {
      const dropRate = (matchData.droppedFrames / matchData.totalFrames * 100).toFixed(2);
      if (dropRate > 0.5) {
        match.issues.push({
          severity: 'critical',
          category: 'frame-drop',
          description: `Frame drops detected (${dropRate}%) - broadcast may stutter`,
          recommendation: 'Reduce overlay complexity, check system resources, optimize graphics',
        });
      }
    }
  }

  /**
   * Check for camera and overlay positioning issues
   */
  checkCameraIssues(match, matchData) {
    const checks = [
      {
        name: 'Board Visibility',
        ok: matchData.boardFullyVisible === true,
        issue: 'Chessboard partially obscured by UI elements',
        recommendation: 'Reposition overlay elements to avoid blocking board',
      },
      {
        name: 'Overlay Position',
        ok: matchData.overlayInCorner === true,
        issue: 'Overlay positioned in center or obstructing board',
        recommendation: 'Move overlay to corner (typically bottom-left or top-right)',
      },
      {
        name: 'Aspect Ratio',
        ok: matchData.aspectRatio === '16:9',
        issue: `Unusual aspect ratio (${matchData.aspectRatio}) - may not fit standard monitors`,
        recommendation: 'Use 16:9 aspect ratio for standard HD/streaming',
      },
      {
        name: 'Text Contrast',
        ok: matchData.textContrast === 'high',
        issue: 'Text colors may not have sufficient contrast',
        recommendation: 'Use high-contrast colors (white text on dark background)',
      },
      {
        name: 'Responsive Layout',
        ok: matchData.responsiveLayout === true,
        issue: 'Layout not optimized for different screen sizes',
        recommendation: 'Test on 720p, 1080p, 1440p, 2K resolutions',
      },
    ];

    for (const check of checks) {
      if (!check.ok) {
        match.issues.push({
          severity: 'warning',
          category: 'camera',
          description: check.issue,
          recommendation: check.recommendation,
        });
      }
    }
  }

  /**
   * Generate visual review summary
   */
  generateReviewSummary() {
    if (this.matches.length === 0) {
      return { error: 'No matches analyzed' };
    }

    // Calculate metrics
    this.reviewMetrics.averageGameLength = this.reviewMetrics.totalMoves / this.reviewMetrics.totalMatches;
    this.reviewMetrics.issuesFound = this.matches.reduce((sum, m) => sum + m.issues.length, 0);
    this.reviewMetrics.criticalIssues = this.issues.filter(i => i.severity === 'critical').length;
    this.reviewMetrics.warningIssues = this.issues.filter(i => i.severity === 'warning').length;

    // Group issues by category
    const issuesByCategory = {};
    for (const match of this.matches) {
      for (const issue of match.issues) {
        if (!issuesByCategory[issue.category]) {
          issuesByCategory[issue.category] = [];
        }
        issuesByCategory[issue.category].push({
          match: match.id,
          ...issue,
        });
      }
    }

    // Calculate average score
    const averageScore = this.matches.reduce((sum, m) => sum + m.score, 0) / this.matches.length;

    // Generate recommendations
    const recommendations = [];
    for (const category in issuesByCategory) {
      const categoryIssues = issuesByCategory[category];
      if (categoryIssues.length > 0) {
        const uniqRecommendations = [...new Set(categoryIssues.map(i => i.recommendation))];
        recommendations.push({
          category,
          count: categoryIssues.length,
          recommendations: uniqRecommendations,
        });
      }
    }

    return {
      summary: {
        matchesReviewed: this.reviewMetrics.totalMatches,
        totalMoves: this.reviewMetrics.totalMoves,
        averageGameLength: this.reviewMetrics.averageGameLength.toFixed(0),
        averageScore: averageScore.toFixed(1),
      },
      issues: {
        critical: this.reviewMetrics.criticalIssues,
        warning: this.reviewMetrics.warningIssues,
        total: this.reviewMetrics.issuesFound,
      },
      byCategory: issuesByCategory,
      recommendations,
      overallAssessment:
        averageScore >= 90 ? '✅ EXCELLENT - Professional broadcast quality' :
        averageScore >= 75 ? '⚠️  GOOD - Minor improvements recommended' :
        averageScore >= 60 ? '⚠️  FAIR - Several improvements needed' :
        '❌ POOR - Significant issues must be addressed',
    };
  }

  /**
   * Display detailed review report
   */
  displayReviewReport() {
    const summary = this.generateReviewSummary();

    console.log('\n' + '═'.repeat(70));
    console.log('  🎬 VISUAL REVIEW ANALYSIS REPORT');
    console.log('═'.repeat(70));

    console.log(`\n  Matches Reviewed: ${summary.summary.matchesReviewed}`);
    console.log(`  Total Moves: ${summary.summary.totalMoves}`);
    console.log(`  Average Game Length: ${summary.summary.averageGameLength} moves`);
    console.log(`  Average Quality Score: ${summary.summary.averageScore}/100`);

    console.log(`\n  Issues Found:`);
    console.log(`    Critical: ${summary.issues.critical}`);
    console.log(`    Warning: ${summary.issues.warning}`);
    console.log(`    Total: ${summary.issues.total}`);

    console.log(`\n  Issues by Category:`);
    for (const [category, issues] of Object.entries(summary.byCategory)) {
      console.log(`    ${category}: ${issues.length} issues`);
    }

    console.log(`\n  Key Recommendations:`);
    for (const rec of summary.recommendations.slice(0, 5)) {
      console.log(`    • ${rec.category} (${rec.count} issues)`);
      for (const recommendation of rec.recommendations.slice(0, 2)) {
        console.log(`      - ${recommendation}`);
      }
    }

    console.log(`\n  Overall Assessment: ${summary.overallAssessment}`);

    console.log('\n' + '═'.repeat(70) + '\n');

    return summary;
  }

  /**
   * Get match review details
   */
  getMatchReview(matchId) {
    return this.matches.find(m => m.id === matchId);
  }

  /**
   * Get all reviews
   */
  getAllReviews() {
    return this.matches;
  }
}

export default VisualReviewAnalyzer;
