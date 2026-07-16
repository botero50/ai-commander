import { TournamentScheduler } from './src/tournament-scheduler.js';
import type { TournamentConfig } from './src/tournament-types.js';

const config: TournamentConfig = {
  id: 'test-odd',
  name: 'Test Odd',
  format: 'round-robin',
  players: ['Alice', 'Bob', 'Charlie'],
  timeControl: 'infinite',
  k_factor: 32,
};

const scheduler = new TournamentScheduler(config);
const schedule = scheduler.generateSchedule();

console.log(`Total matches: ${schedule.totalMatches}`);
console.log(`Total rounds: ${schedule.rounds.length}`);

const pairings = new Set<string>();
for (let roundIdx = 0; roundIdx < schedule.rounds.length; roundIdx++) {
  const round = schedule.rounds[roundIdx];
  console.log(`\nRound ${roundIdx}:`);
  for (const match of round) {
    const pair = [match.white, match.black].sort().join('|');
    console.log(`  ${match.white} vs ${match.black} (pair: ${pair})`);
    pairings.add(pair);
  }
}

console.log(`\nTotal pairings: ${pairings.size}`);
console.log(`Pairings:`, Array.from(pairings));
console.log(`Bob|Charlie exists? ${pairings.has('Bob|Charlie')}`);
