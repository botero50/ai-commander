/**
 * Chess Move Instrumentation
 *
 * Captures complete decision pipeline for every move:
 * - FEN before move
 * - ASCII board representation
 * - Side to move
 * - Complete prompt sent to LLM
 * - Ollama request parameters
 * - Raw model response
 * - Move extraction process
 * - Extracted move + confidence
 * - Legal move validation
 * - Response latency
 * - Move actually executed
 * - Any errors or warnings
 *
 * Purpose: Identify actual bottleneck in AI decision making
 * No modifications to runtime logic - purely observational
 */

export class MoveInstrumentation {
  constructor(logger) {
    this.logger = logger;
    this.moveHistory = [];
    this.moveCount = 0;
  }

  /**
   * Record complete move decision pipeline
   */
  recordMove(data) {
    this.moveCount++;

    const record = {
      moveNumber: this.moveCount,
      timestamp: new Date().toISOString(),
      gamePhase: data.gamePhase,
      sideToMove: data.sideToMove,

      // Position state
      position: {
        fen: data.fen,
        asciiBoard: data.asciiBoard,
        legalMoveCount: data.legalMoves ? data.legalMoves.length : 0,
        legalMoveList: data.legalMoves ? data.legalMoves.map(m => m.san) : [],
      },

      // Prompt generation
      prompt: {
        full: data.prompt,
        lengthChars: data.prompt ? data.prompt.length : 0,
        lengthTokens: data.promptTokens || 0,
      },

      // Ollama request
      request: {
        model: data.model,
        temperature: data.temperature,
        topP: data.topP,
        topK: data.topK,
        numPredict: data.numPredict,
        stopTokens: data.stopTokens,
        samplingStrategy: data.samplingStrategy,
      },

      // LLM response
      response: {
        raw: data.rawResponse || '',
        lengthChars: data.rawResponse ? data.rawResponse.length : 0,
        responseTokens: data.responseTokens || 0,
        latencyMs: data.latencyMs || 0,
        truncated: data.responseTruncated || false,
      },

      // Extraction process
      extraction: {
        strategy: data.extractionStrategy,
        confidence: data.extractionConfidence,
        candidatesConsidered: data.candidatesConsidered || [],
        extractionErrors: data.extractionErrors || [],
      },

      // Final move
      move: {
        extracted: data.extractedMove,
        isLegal: data.isLegal,
        executed: data.executedMove,
        matchesExtracted: data.executedMove === data.extractedMove,
      },

      // Quality metrics
      quality: {
        moveQuality: data.moveQuality, // 'excellent', 'good', 'bad', 'illegal'
        notes: data.qualityNotes || '',
      },

      // Errors
      errors: data.errors || [],
      warnings: data.warnings || [],
    };

    this.moveHistory.push(record);
    return record;
  }

  /**
   * Analyze move history to identify patterns
   */
  analyzePatterns() {
    if (this.moveHistory.length === 0) {
      return null;
    }

    const analysis = {
      totalMoves: this.moveHistory.length,
      legalMovesPercentage: 0,
      illegalMoves: [],
      extractionFailures: [],
      latencyStats: { min: Infinity, max: 0, avg: 0 },
      modelAccuracy: {},
      strategyDistribution: {},
      errorPatterns: {},
      temperatureCorrelation: {},
      boardRepresentationIssues: [],
      promptLengthCorrelation: {},
    };

    let totalLatency = 0;
    let legalCount = 0;

    for (const record of this.moveHistory) {
      // Track legal moves
      if (record.move.isLegal) {
        legalCount++;
      } else {
        analysis.illegalMoves.push({
          moveNumber: record.moveNumber,
          extracted: record.move.extracted,
          sideToMove: record.sideToMove,
          legalMoves: record.position.legalMoveList,
          reason: record.errors[0] || 'unknown',
        });
      }

      // Track extraction failures
      if (record.extraction.extractionErrors.length > 0) {
        analysis.extractionFailures.push({
          moveNumber: record.moveNumber,
          response: record.response.raw.substring(0, 200),
          error: record.extraction.extractionErrors[0],
        });
      }

      // Latency statistics
      const latency = record.response.latencyMs;
      if (latency > 0) {
        totalLatency += latency;
        analysis.latencyStats.min = Math.min(analysis.latencyStats.min, latency);
        analysis.latencyStats.max = Math.max(analysis.latencyStats.max, latency);
      }

      // Model accuracy tracking
      const model = record.request.model;
      if (!analysis.modelAccuracy[model]) {
        analysis.modelAccuracy[model] = { legal: 0, illegal: 0, total: 0 };
      }
      analysis.modelAccuracy[model].total++;
      if (record.move.isLegal) {
        analysis.modelAccuracy[model].legal++;
      } else {
        analysis.modelAccuracy[model].illegal++;
      }

      // Strategy distribution
      if (!analysis.strategyDistribution[record.extraction.strategy]) {
        analysis.strategyDistribution[record.extraction.strategy] = 0;
      }
      analysis.strategyDistribution[record.extraction.strategy]++;

      // Error pattern analysis
      for (const error of record.errors) {
        if (!analysis.errorPatterns[error]) {
          analysis.errorPatterns[error] = 0;
        }
        analysis.errorPatterns[error]++;
      }

      // Temperature correlation with quality
      const temp = record.request.temperature;
      if (!analysis.temperatureCorrelation[temp]) {
        analysis.temperatureCorrelation[temp] = { legal: 0, total: 0 };
      }
      analysis.temperatureCorrelation[temp].total++;
      if (record.move.isLegal) {
        analysis.temperatureCorrelation[temp].legal++;
      }

      // Prompt length correlation with extraction success
      const promptLen = record.prompt.lengthChars;
      const promptBucket = Math.floor(promptLen / 100) * 100;
      if (!analysis.promptLengthCorrelation[promptBucket]) {
        analysis.promptLengthCorrelation[promptBucket] = { success: 0, total: 0 };
      }
      analysis.promptLengthCorrelation[promptBucket].total++;
      if (record.move.isLegal) {
        analysis.promptLengthCorrelation[promptBucket].success++;
      }
    }

    // Calculate percentages and averages
    analysis.legalMovesPercentage = Math.round((legalCount / this.moveHistory.length) * 100);
    analysis.latencyStats.avg = Math.round(totalLatency / this.moveHistory.length);

    // Convert temperature correlation to percentages
    for (const [temp, stats] of Object.entries(analysis.temperatureCorrelation)) {
      stats.percentage = Math.round((stats.legal / stats.total) * 100);
    }

    // Convert prompt length correlation to percentages
    for (const [bucket, stats] of Object.entries(analysis.promptLengthCorrelation)) {
      stats.percentage = Math.round((stats.success / stats.total) * 100);
    }

    return analysis;
  }

  /**
   * Identify most likely bottlenecks
   */
  identifyBottlenecks() {
    const analysis = this.analyzePatterns();
    if (!analysis) return null;

    const bottlenecks = [];

    // Check 1: Extraction failures
    if (analysis.extractionFailures.length > 0) {
      const failureRate = (analysis.extractionFailures.length / analysis.totalMoves) * 100;
      bottlenecks.push({
        rank: 0,
        issue: 'Move Extraction Failures',
        severity: failureRate > 10 ? 'CRITICAL' : failureRate > 5 ? 'HIGH' : 'MEDIUM',
        rate: `${failureRate.toFixed(1)}%`,
        evidence: `${analysis.extractionFailures.length} of ${analysis.totalMoves} moves failed to parse`,
        impact: 'Model responses not being understood correctly',
        investigation: `Analyze extraction patterns: ${JSON.stringify(analysis.strategyDistribution)}`,
      });
    }

    // Check 2: Illegal moves
    if (analysis.illegalMoves.length > 0) {
      const illegalRate = 100 - analysis.legalMovesPercentage;
      bottlenecks.push({
        rank: 1,
        issue: 'Illegal Move Generation',
        severity: illegalRate > 10 ? 'CRITICAL' : illegalRate > 5 ? 'HIGH' : 'MEDIUM',
        rate: `${illegalRate.toFixed(1)}%`,
        evidence: `${analysis.illegalMoves.length} of ${analysis.totalMoves} moves were illegal`,
        impact: 'Model generating moves outside legal move list',
        investigation: 'Check if legal moves are being provided in prompt',
      });
    }

    // Check 3: Model strength
    // This would be inferred from quality of legal moves, not just legality
    bottlenecks.push({
      rank: 2,
      issue: 'Model Playing Strength',
      severity: 'UNKNOWN',
      evidence: 'Requires analysis of actual move quality (checks, captures, positioning)',
      impact: 'Model may not be strong enough for chess',
      investigation: 'Analyze legal moves for strategic merit vs available alternatives',
    });

    // Check 4: Prompt effectiveness
    const promptLengthCounts = Object.entries(analysis.promptLengthCorrelation)
      .map(([bucket, stats]) => ({
        promptLength: `${bucket}-${parseInt(bucket) + 100}`,
        successRate: `${stats.percentage}%`,
        count: stats.total,
      }));

    bottlenecks.push({
      rank: 3,
      issue: 'Prompt Design',
      severity: 'UNKNOWN',
      evidence: `Prompt length vs success: ${JSON.stringify(promptLengthCounts)}`,
      impact: 'Prompt may be confusing model or missing important context',
      investigation: 'Compare successful vs unsuccessful prompts for patterns',
    });

    // Check 5: Ollama parameters
    const tempStats = Object.entries(analysis.temperatureCorrelation)
      .map(([temp, stats]) => ({
        temperature: temp,
        legalMoveRate: `${stats.percentage}%`,
        sampleSize: stats.total,
      }));

    bottlenecks.push({
      rank: 4,
      issue: 'Ollama Inference Parameters',
      severity: 'UNKNOWN',
      evidence: `Temperature correlation: ${JSON.stringify(tempStats)}`,
      impact: 'Parameters may be producing overly creative or deterministic responses',
      investigation: 'Analyze legal move rate vs temperature settings',
    });

    return bottlenecks.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, UNKNOWN: 3 };
      return (severityOrder[a.severity] || 999) - (severityOrder[b.severity] || 999);
    });
  }

  /**
   * Generate detailed report
   */
  generateReport() {
    const analysis = this.analyzePatterns();
    const bottlenecks = this.identifyBottlenecks();

    if (!analysis) {
      return 'No move history recorded';
    }

    const lines = [];
    lines.push('═'.repeat(70));
    lines.push('CHESS AI INSTRUMENTATION REPORT');
    lines.push('═'.repeat(70));
    lines.push('');

    // Summary
    lines.push('SUMMARY');
    lines.push('-'.repeat(70));
    lines.push(`Total moves analyzed: ${analysis.totalMoves}`);
    lines.push(`Legal moves: ${analysis.legalMovesPercentage}%`);
    lines.push(`Illegal moves: ${100 - analysis.legalMovesPercentage}%`);
    lines.push(`Average latency: ${analysis.latencyStats.avg}ms`);
    lines.push(`Latency range: ${analysis.latencyStats.min}ms - ${analysis.latencyStats.max}ms`);
    lines.push('');

    // Model accuracy
    lines.push('MODEL ACCURACY');
    lines.push('-'.repeat(70));
    for (const [model, stats] of Object.entries(analysis.modelAccuracy)) {
      const accuracy = Math.round((stats.legal / stats.total) * 100);
      lines.push(`${model}: ${accuracy}% legal (${stats.legal}/${stats.total})`);
    }
    lines.push('');

    // Extraction strategies
    lines.push('EXTRACTION STRATEGY USAGE');
    lines.push('-'.repeat(70));
    let totalStrategies = 0;
    for (const count of Object.values(analysis.strategyDistribution)) {
      totalStrategies += count;
    }
    for (const [strategy, count] of Object.entries(analysis.strategyDistribution)) {
      const pct = Math.round((count / totalStrategies) * 100);
      lines.push(`${strategy}: ${pct}% (${count} moves)`);
    }
    lines.push('');

    // Temperature analysis
    lines.push('TEMPERATURE CORRELATION WITH LEGALITY');
    lines.push('-'.repeat(70));
    for (const [temp, stats] of Object.entries(analysis.temperatureCorrelation)) {
      lines.push(`Temp ${temp}: ${stats.percentage}% legal (${stats.legal}/${stats.total} moves)`);
    }
    lines.push('');

    // Bottlenecks
    lines.push('IDENTIFIED BOTTLENECKS (Ranked by Severity)');
    lines.push('-'.repeat(70));
    for (const bottleneck of bottlenecks) {
      lines.push(`${bottleneck.rank + 1}. ${bottleneck.issue} [${bottleneck.severity}]`);
      lines.push(`   Rate: ${bottleneck.rate}`);
      lines.push(`   Evidence: ${bottleneck.evidence}`);
      lines.push(`   Impact: ${bottleneck.impact}`);
      lines.push(`   Investigation: ${bottleneck.investigation}`);
      lines.push('');
    }

    // Illegal moves detail
    if (analysis.illegalMoves.length > 0 && analysis.illegalMoves.length <= 20) {
      lines.push('ILLEGAL MOVES DETAIL (First 20)');
      lines.push('-'.repeat(70));
      for (const illegal of analysis.illegalMoves.slice(0, 20)) {
        lines.push(`Move ${illegal.moveNumber} (${illegal.sideToMove}): tried "${illegal.extracted}"`);
        lines.push(`  Legal moves were: ${illegal.legalMoves.join(' ')}`);
        lines.push(`  Reason: ${illegal.reason}`);
      }
      lines.push('');
    }

    // Error patterns
    if (Object.keys(analysis.errorPatterns).length > 0) {
      lines.push('ERROR PATTERNS');
      lines.push('-'.repeat(70));
      for (const [error, count] of Object.entries(analysis.errorPatterns)) {
        const rate = ((count / analysis.totalMoves) * 100).toFixed(1);
        lines.push(`${error}: ${count} occurrences (${rate}%)`);
      }
      lines.push('');
    }

    lines.push('═'.repeat(70));

    return lines.join('\n');
  }

  /**
   * Export raw data for external analysis
   */
  exportJSON(filePath = null) {
    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalMoves: this.moveHistory.length,
      },
      moves: this.moveHistory,
      analysis: this.analyzePatterns(),
      bottlenecks: this.identifyBottlenecks(),
    };
  }
}

export default MoveInstrumentation;
