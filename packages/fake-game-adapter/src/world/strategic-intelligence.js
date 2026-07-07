/**
 * Advanced strategic intelligence for autonomous RTS gameplay
 */
/**
 * Strategic intelligence engine
 */
export class StrategicIntelligence {
    constructor() {
        this.threatHistory = [];
        this.decisionHistory = [];
        this.behaviorPatterns = [];
    }
    assessThreat(world) {
        const enemyCount = world.enemyUnits.length;
        let totalEnemyDamage = 0;
        let closestDistance = Infinity;
        // Calculate enemy threat metrics
        for (const enemy of world.enemyUnits) {
            const type = enemy.type;
            const damage = type === 'infantry' ? 10 : type === 'ranged' ? 15 : 20;
            totalEnemyDamage += damage;
            // Find closest enemy
            if (world.militaryUnits.length > 0) {
                const closestMilitary = world.militaryUnits[0];
                const distance = Math.hypot(enemy.x - closestMilitary.x, enemy.y - closestMilitary.y);
                closestDistance = Math.min(closestDistance, distance);
            }
        }
        // Calculate player strength
        let playerDamage = 0;
        for (const unit of world.militaryUnits) {
            const type = unit.type;
            const damage = type === 'infantry' ? 10 : type === 'ranged' ? 15 : 20;
            playerDamage += damage;
        }
        const playerAdvantage = playerDamage - totalEnemyDamage;
        const estimatedCombatDuration = Math.max(1, totalEnemyDamage > 0 ? Math.ceil(playerDamage / totalEnemyDamage) : 0);
        let level = 'none';
        const recommendations = [];
        if (enemyCount === 0) {
            level = 'none';
            recommendations.push('No threats detected');
            recommendations.push('Focus on economy expansion');
        }
        else if (playerAdvantage > 50) {
            level = 'low';
            recommendations.push('Player has significant military advantage');
            recommendations.push('Consider aggressive expansion');
        }
        else if (playerAdvantage > 0) {
            level = 'medium';
            recommendations.push('Slight player advantage in combat');
            recommendations.push('Strengthen military position');
        }
        else if (playerAdvantage > -50) {
            level = 'high';
            recommendations.push('Enemy has combat advantage');
            recommendations.push('Increase military production');
            recommendations.push('Consider defensive positioning');
        }
        else {
            level = 'critical';
            recommendations.push('Critical military disadvantage');
            recommendations.push('Emergency military buildup required');
            recommendations.push('Consider strategic retreat');
        }
        const assessment = {
            level,
            enemyCount,
            totalEnemyDamage,
            closestEnemyDistance: closestDistance === Infinity ? 1000 : closestDistance,
            estimatedCombatDuration,
            playerAdvantage,
            recommendations: Object.freeze(recommendations),
        };
        this.threatHistory.push(assessment);
        return assessment;
    }
    determinePriority(world) {
        const threat = this.assessThreat(world);
        const workerCount = world.workers.length;
        const militaryCount = world.militaryUnits.length;
        const resources = world.playerResources;
        let phase;
        const priorityList = [];
        if (militaryCount === 0 && threat.level === 'none') {
            phase = 'early-economy';
            // Focus on workers
            if (workerCount < 5) {
                priorityList.push({
                    type: 'worker',
                    priority: 90,
                    cost: 50,
                    rationale: 'Early game worker production maximizes economic output',
                });
            }
            if (resources > 100) {
                priorityList.push({
                    type: 'military-infantry',
                    priority: 20,
                    cost: 100,
                    rationale: 'Start military as safety measure',
                });
            }
        }
        else if (threat.level === 'none' && workerCount > 5) {
            phase = 'balanced-growth';
            // Mix of workers and military
            priorityList.push({
                type: 'worker',
                priority: 50,
                cost: 50,
                rationale: 'Maintain economic growth',
            });
            priorityList.push({
                type: 'military-ranged',
                priority: 60,
                cost: 100,
                rationale: 'Ranged units offer good damage with flexibility',
            });
        }
        else if (threat.level === 'medium' || threat.level === 'high' || threat.level === 'critical') {
            phase = 'military-buildup';
            // Emergency military production
            const urgency = threat.level === 'critical' ? 95 : threat.level === 'high' ? 80 : 60;
            priorityList.push({
                type: 'military-tank',
                priority: urgency,
                cost: 100,
                rationale: 'Tank units provide best defense against damage',
            });
            priorityList.push({
                type: 'military-ranged',
                priority: urgency - 10,
                cost: 100,
                rationale: 'Ranged support for tank formations',
            });
            if (workerCount < 3) {
                priorityList.push({
                    type: 'worker',
                    priority: 40,
                    cost: 50,
                    rationale: 'Minimum workers for resource gathering',
                });
            }
        }
        else {
            phase = 'expansion';
            // Defensive expansion
            priorityList.push({
                type: 'worker',
                priority: 60,
                cost: 50,
                rationale: 'Expand economy to new resource zones',
            });
            priorityList.push({
                type: 'military-infantry',
                priority: 50,
                cost: 100,
                rationale: 'Infantry scouts for new territory',
            });
        }
        return {
            phase,
            workerTarget: phase === 'early-economy' ? 10 : phase === 'military-buildup' ? 3 : 5,
            militaryTarget: threat.level === 'none' ? 5 : threat.level === 'low' ? 8 : 15,
            priorityList: Object.freeze(priorityList),
        };
    }
    planPositioning(world) {
        const baseX = 10;
        const baseY = 10;
        const baseDefensePositions = [];
        const scoutPatrol = [];
        const attackFormation = [];
        const gatheringPattern = [];
        // Create defense perimeter around base
        const defenseRadius = 5;
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2;
            const x = baseX + Math.round(defenseRadius * Math.cos(angle));
            const y = baseY + Math.round(defenseRadius * Math.sin(angle));
            baseDefensePositions.push({
                unitId: `defense-${i}`,
                currentX: baseX,
                currentY: baseY,
                targetX: x,
                targetY: y,
                role: 'defending',
            });
        }
        // Scout patrol points
        const scoutPoints = [
            [25, 25],
            [35, 25],
            [35, 35],
            [25, 35],
        ];
        for (let i = 0; i < scoutPoints.length; i++) {
            scoutPatrol.push({
                unitId: `scout-${i}`,
                currentX: baseX,
                currentY: baseY,
                targetX: scoutPoints[i][0],
                targetY: scoutPoints[i][1],
                role: 'scouting',
            });
        }
        // Attack formation (wedge)
        const formationStarts = [
            [15, 15],
            [18, 18],
            [12, 18],
        ];
        for (let i = 0; i < formationStarts.length; i++) {
            attackFormation.push({
                unitId: `attack-${i}`,
                currentX: baseX,
                currentY: baseY,
                targetX: formationStarts[i][0],
                targetY: formationStarts[i][1],
                role: 'attacking',
            });
        }
        // Gathering pattern (to resource locations)
        gatheringPattern.push({
            unitId: 'gather-1',
            currentX: baseX,
            currentY: baseY,
            targetX: 20,
            targetY: 20,
            role: 'gathering',
        });
        gatheringPattern.push({
            unitId: 'gather-2',
            currentX: baseX,
            currentY: baseY,
            targetX: 30,
            targetY: 30,
            role: 'gathering',
        });
        return {
            baseDefensePositions: Object.freeze(baseDefensePositions),
            scoutPatrol: Object.freeze(scoutPatrol),
            attackFormation: Object.freeze(attackFormation),
            gatheringPattern: Object.freeze(gatheringPattern),
        };
    }
    analyzeBehaviorPattern(world, previousWorlds) {
        const knownEnemies = world.knownEnemies.length; // Use scouted enemies, not all enemies
        const enemyMovement = previousWorlds ? this.analyzeMovement(world, previousWorlds) : 0;
        let type = 'mixed';
        const indicators = [];
        if (knownEnemies > 5) {
            type = 'aggressive';
            indicators.push('High known enemy count suggests aggressive strategy');
        }
        else if (knownEnemies > 0 && knownEnemies < 3) {
            type = 'defensive';
            indicators.push('Low known enemy count suggests defensive posture');
        }
        else {
            type = 'economic';
            indicators.push('No known enemy units detected, economic focus');
        }
        if (enemyMovement > 5) {
            indicators.push('Enemies moving toward player position');
            if (type !== 'aggressive')
                type = 'aggressive';
        }
        const confidence = Math.min(100, 60 + indicators.length * 10);
        return {
            type,
            confidence,
            indicators: Object.freeze(indicators),
            predictedNextMove: type === 'aggressive'
                ? 'Direct attack on player base'
                : type === 'defensive'
                    ? 'Defensive position holding'
                    : 'Economic expansion',
        };
    }
    analyzeMovement(current, previous) {
        let movementDistance = 0;
        for (const known of current.knownEnemies) {
            const prev = previous.knownEnemies.find((e) => e.unitId === known.unitId);
            if (prev) {
                const distance = Math.hypot(known.x - prev.x, known.y - prev.y);
                movementDistance += distance;
            }
        }
        return movementDistance;
    }
    recordDecision(decision) {
        const fullDecision = {
            ...decision,
            timestamp: Date.now(),
        };
        this.decisionHistory.push(fullDecision);
        return fullDecision;
    }
    getDecisionHistory() {
        return Object.freeze([...this.decisionHistory]);
    }
    getThreatHistory() {
        return Object.freeze([...this.threatHistory]);
    }
    generateStrategicReport(world) {
        const threat = this.assessThreat(world);
        const priority = this.determinePriority(world);
        const positioning = this.planPositioning(world);
        const behavior = this.analyzeBehaviorPattern(world);
        let report = `\n=== STRATEGIC INTELLIGENCE REPORT ===\n`;
        report += `Timestamp: ${new Date().toISOString()}\n\n`;
        report += `--- THREAT ASSESSMENT ---\n`;
        report += `Level: ${threat.level.toUpperCase()}\n`;
        report += `Enemy Units: ${threat.enemyCount}\n`;
        report += `Total Enemy Damage: ${threat.totalEnemyDamage}\n`;
        report += `Player Advantage: ${threat.playerAdvantage}\n`;
        report += `Estimated Combat Duration: ${threat.estimatedCombatDuration} turns\n`;
        for (const rec of threat.recommendations) {
            report += `• ${rec}\n`;
        }
        report += '\n';
        report += `--- RESOURCE STRATEGY ---\n`;
        report += `Phase: ${priority.phase}\n`;
        report += `Worker Target: ${priority.workerTarget}\n`;
        report += `Military Target: ${priority.militaryTarget}\n`;
        report += `Priorities:\n`;
        for (const alloc of priority.priorityList) {
            report += `  [${alloc.priority}] ${alloc.type}: ${alloc.rationale}\n`;
        }
        report += '\n';
        report += `--- UNIT POSITIONING ---\n`;
        report += `Defense Positions: ${positioning.baseDefensePositions.length}\n`;
        report += `Scout Patrols: ${positioning.scoutPatrol.length}\n`;
        report += `Attack Formation: ${positioning.attackFormation.length}\n`;
        report += `Gathering Sites: ${positioning.gatheringPattern.length}\n\n`;
        report += `--- ENEMY BEHAVIOR ---\n`;
        report += `Pattern Type: ${behavior.type}\n`;
        report += `Confidence: ${behavior.confidence}%\n`;
        report += `Predicted Move: ${behavior.predictedNextMove}\n`;
        report += `Indicators:\n`;
        for (const indicator of behavior.indicators) {
            report += `  • ${indicator}\n`;
        }
        return report;
    }
    reset() {
        this.threatHistory = [];
        this.decisionHistory = [];
        this.behaviorPatterns = [];
    }
}
/**
 * Global strategic intelligence instance
 */
export const globalStrategicIntelligence = new StrategicIntelligence();
//# sourceMappingURL=strategic-intelligence.js.map