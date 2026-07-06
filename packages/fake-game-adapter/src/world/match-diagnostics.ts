import type { FakeWorldSnapshot, MatchDiagnostics } from './fake-world-state.js';

/**
 * Diagnostic analysis for match failures and performance
 */

export interface FailureAnalysis {
  readonly failureReason: string;
  readonly failureTick: number;
  readonly bottleneck: string; // What was the limiting factor?
  readonly suggestions: ReadonlyArray<string>; // How to improve
  readonly severity: 'critical' | 'major' | 'minor';
}

export interface MatchAnalysis {
  readonly gameWon: boolean;
  readonly gameLost: boolean;
  readonly totalTicks: number;
  readonly totalCommands: number;
  readonly resourceEfficiency: number; // resources gathered / ticks
  readonly workerEfficiency: number; // workers produced / resources spent
  readonly militaryEfficiency: number; // military units trained / resources spent
  readonly combatEfficiency: number; // enemies killed / military count
  readonly failure?: FailureAnalysis;
}

/**
 * Analyze a match for failures and performance
 */
export function analyzeMatch(world: FakeWorldSnapshot): MatchAnalysis {
  const diag = world.diagnostics;
  const isWon = world.gameState === 'won';
  const isLost = world.gameState === 'lost';

  let failure: FailureAnalysis | undefined;

  if (isLost) {
    failure = analyzeFailure(world);
  }

  const resourceEfficiency = world.tick > 0 ? diag.resourcesEverGathered / world.tick : 0;
  const workerEfficiency =
    diag.workersProduced > 0 ? (diag.workersProduced / (diag.workersProduced * 50)) * 100 : 0;
  const militaryEfficiency =
    diag.militaryTrained > 0 ? (diag.militaryTrained / (diag.militaryTrained * 100)) * 100 : 0;
  const combatEfficiency =
    diag.peakMilitaryCount > 0 ? (diag.enemiesKilled / diag.peakMilitaryCount) * 100 : 0;

  return {
    gameWon: isWon,
    gameLost: isLost,
    totalTicks: world.tick,
    totalCommands: world.commandsExecuted,
    resourceEfficiency,
    workerEfficiency,
    militaryEfficiency,
    combatEfficiency,
    failure,
  };
}

/**
 * Analyze why a match failed
 */
function analyzeFailure(world: FakeWorldSnapshot): FailureAnalysis {
  const diag = world.diagnostics;
  const reason = (diag as any).failureReason || 'unknown';
  const tick = (diag as any).failureTick || world.tick;

  switch (reason) {
    case 'no-workers-no-military':
      return analyzeNoUnitsFailure(world);
    case 'army-defeated':
      return analyzeArmyDefeatFailure(world);
    case 'no-resource-access':
      return analyzeResourceAccessFailure(world);
    case 'economy-failed':
      return analyzeEconomyFailure(world);
    default:
      return {
        failureReason: 'Unknown failure',
        failureTick: tick,
        bottleneck: 'Could not determine failure cause',
        suggestions: ['Check game logs', 'Verify initial conditions'],
        severity: 'minor',
      };
  }
}

/**
 * Analyze failure: no workers and no military
 */
function analyzeNoUnitsFailure(world: FakeWorldSnapshot): FailureAnalysis {
  const diag = world.diagnostics;
  const tick = (diag as any).failureTick || world.tick;

  // Determine what went wrong
  let bottleneck = 'Lost all units';
  let suggestions: string[] = [];
  let severity: 'critical' | 'major' | 'minor' = 'critical';

  if (diag.resourcesEverGathered === 0) {
    bottleneck = 'Never gathered any resources - unable to produce units';
    suggestions = [
      'Move worker to resource deposit location',
      'Ensure worker can reach resources',
      'Check resource deposit locations',
    ];
    severity = 'critical';
  } else if (diag.workersProduced === 0) {
    bottleneck = `Gathered ${diag.resourcesEverGathered} resources but never produced additional workers`;
    suggestions = [
      'Check if resources were actually deposited at base',
      `Need at least 50 resources to produce worker`,
      'Consider early worker production strategy',
    ];
    severity = 'major';
  } else if (diag.militaryTrained === 0) {
    bottleneck = `Produced ${diag.workersProduced} workers but never trained military units`;
    suggestions = [
      'Allocate more resources to military',
      'Military training costs 100 resources',
      `Max resources reached: ${diag.maxResources}`,
      'Consider earlier military transition',
    ];
    severity = 'major';
  } else {
    bottleneck = `All ${diag.militaryTrained} trained units were destroyed by enemy`;
    suggestions = [
      `Trained ${diag.militaryTrained} units but only killed ${diag.enemiesKilled} enemies`,
      'Enemy had superior positioning or numbers',
      'Consider scouting before committing to battle',
      'Build more units before attacking',
    ];
    severity = 'major';
  }

  return {
    failureReason: 'No workers and no military units',
    failureTick: tick,
    bottleneck,
    suggestions: suggestions as ReadonlyArray<string>,
    severity,
  };
}

/**
 * Analyze failure: army defeated
 */
function analyzeArmyDefeatFailure(world: FakeWorldSnapshot): FailureAnalysis {
  const diag = world.diagnostics;
  const tick = (diag as any).failureTick || world.tick;

  const bottleneck = `Army destroyed after killing only ${diag.enemiesKilled} of 2 enemies`;
  const suggestions = [
    `Peak military count was ${diag.peakMilitaryCount}`,
    'Enemy forces had superior units or positioning',
    'Consider gathering more resources before attacking',
    'Scout enemy positions before committing',
    'Build mixed unit composition for better combat',
  ];

  return {
    failureReason: 'Army defeated in combat',
    failureTick: tick,
    bottleneck,
    suggestions: suggestions as ReadonlyArray<string>,
    severity: 'major',
  };
}

/**
 * Analyze failure: no resource access
 */
function analyzeResourceAccessFailure(world: FakeWorldSnapshot): FailureAnalysis {
  const diag = world.diagnostics;
  const tick = (diag as any).failureTick || world.tick;

  const bottleneck = `Worker could not reach or gather from resource deposits`;
  const suggestions = [
    'Check resource deposit locations (should be at 20,20 and 30,30)',
    'Verify worker pathfinding to deposits',
    'Ensure worker movement is correct',
    'Check if deposits were depleted',
  ];

  return {
    failureReason: 'Unable to access resources',
    failureTick: tick,
    bottleneck,
    suggestions: suggestions as ReadonlyArray<string>,
    severity: 'critical',
  };
}

/**
 * Analyze failure: economy failed
 */
function analyzeEconomyFailure(world: FakeWorldSnapshot): FailureAnalysis {
  const diag = world.diagnostics;
  const tick = (diag as any).failureTick || world.tick;

  const bottleneck = `Economy could not sustain unit production`;
  const suggestions = [
    `Resources gathered: ${diag.resourcesEverGathered}`,
    `Workers produced: ${diag.workersProduced}`,
    `Peak resources: ${diag.maxResources}`,
    'Consider increasing worker count earlier',
    'Multi-location gathering may improve efficiency',
  ];

  return {
    failureReason: 'Economy system failed',
    failureTick: tick,
    bottleneck,
    suggestions: suggestions as ReadonlyArray<string>,
    severity: 'major',
  };
}

/**
 * Generate human-readable diagnostic report
 */
export function generateDiagnosticReport(world: FakeWorldSnapshot): string {
  const analysis = analyzeMatch(world);
  const diag = world.diagnostics;

  let report = `\n=== MATCH ANALYSIS REPORT ===\n`;
  report += `Game State: ${world.gameState.toUpperCase()}\n`;
  report += `Total Ticks: ${analysis.totalTicks}\n`;
  report += `Total Commands: ${analysis.totalCommands}\n`;
  report += `\n--- RESOURCE METRICS ---\n`;
  report += `Resources Gathered: ${diag.resourcesEverGathered}\n`;
  report += `Max Resources Held: ${diag.maxResources}\n`;
  report += `Resource Efficiency: ${analysis.resourceEfficiency.toFixed(2)} res/tick\n`;
  report += `\n--- PRODUCTION METRICS ---\n`;
  report += `Workers Produced: ${diag.workersProduced}\n`;
  report += `Peak Worker Count: ${diag.peakWorkerCount}\n`;
  report += `Military Units Trained: ${diag.militaryTrained}\n`;
  report += `Peak Military Count: ${diag.peakMilitaryCount}\n`;
  report += `\n--- COMBAT METRICS ---\n`;
  report += `Enemies Killed: ${diag.enemiesKilled} / 2\n`;
  report += `Combat Efficiency: ${analysis.combatEfficiency.toFixed(1)}%\n`;

  if (analysis.failure) {
    report += `\n--- FAILURE ANALYSIS ---\n`;
    report += `Reason: ${analysis.failure.failureReason}\n`;
    report += `Tick: ${analysis.failure.failureTick}\n`;
    report += `Bottleneck: ${analysis.failure.bottleneck}\n`;
    report += `Severity: ${analysis.failure.severity.toUpperCase()}\n`;
    report += `\n--- SUGGESTIONS FOR IMPROVEMENT ---\n`;
    analysis.failure.suggestions.forEach((s, i) => {
      report += `${i + 1}. ${s}\n`;
    });
  }

  return report;
}
