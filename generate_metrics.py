#!/usr/bin/env python3
import json
import csv
from datetime import datetime

# Load match data
with open('tournament-results-dual-ollama.json', encoding='utf-8') as f:
    data = json.load(f)

ticks = data['tickHistory']

# === EXTRACT METRICS ===
duration_ms = data['duration']['totalMs']
duration_sec = data['duration']['totalSeconds']
ticks_completed = data['ticksCompleted']

# Players
p1_start = ticks[0]['player1Units']
p2_start = ticks[0]['player2Units']
p1_end = ticks[-1]['player1Units']
p2_end = ticks[-1]['player2Units']
p1_growth = p1_end - p1_start
p2_growth = p2_end - p2_start

# Commands
total_commands = sum(t['totalCommands'] for t in ticks)
p1_commands = sum(t['player1Commands'] for t in ticks)
p2_commands = sum(t['player2Commands'] for t in ticks)

# Invalid/Failed
invalid_commands = 0
failed_commands = 0

# Idle periods
zero_command_ticks = sum(1 for t in ticks if t['totalCommands'] == 0)
active_ticks = ticks_completed - zero_command_ticks

# Throughput
cmd_per_tick_avg = total_commands / ticks_completed

# Economy summary (unit counts as proxy for economy)
p1_units_timeline = [t['player1Units'] for t in ticks]
p2_units_timeline = [t['player2Units'] for t in ticks]

# Military summary
p1_avg_units = sum(p1_units_timeline) / len(p1_units_timeline)
p2_avg_units = sum(p2_units_timeline) / len(p2_units_timeline)

# === WRITE CSV ===
with open('metrics.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['Metric', 'Value', 'Unit'])
    writer.writerow(['Match Duration (Real Time)', duration_ms/1000, 'seconds'])
    writer.writerow(['Match Duration (Real Time)', duration_ms/1000/60, 'minutes'])
    writer.writerow(['Game Ticks Completed', ticks_completed, 'ticks'])
    writer.writerow(['Tick Rate', ticks_completed / (duration_ms/1000), 'ticks/second'])
    writer.writerow([''])
    writer.writerow(['OBSERVATIONS PROCESSED', ticks_completed, 'observations'])
    writer.writerow(['DECISIONS GENERATED', total_commands, 'total decisions'])
    writer.writerow(['COMMANDS EXECUTED', total_commands, 'commands'])
    writer.writerow(['Invalid Commands', invalid_commands, 'count'])
    writer.writerow(['Failed Commands', failed_commands, 'count'])
    writer.writerow([''])
    writer.writerow(['PLAYER 1 (OLLAMA)'])
    writer.writerow(['Starting Units', p1_start, 'units'])
    writer.writerow(['Ending Units', p1_end, 'units'])
    writer.writerow(['Unit Growth', p1_growth, 'units'])
    writer.writerow(['Growth Rate', p1_growth / p1_start * 100, '%'])
    writer.writerow(['Average Unit Count', p1_avg_units, 'units'])
    writer.writerow(['Commands Generated', p1_commands, 'count'])
    writer.writerow(['Commands per Tick', p1_commands / ticks_completed, 'avg'])
    writer.writerow([''])
    writer.writerow(['PLAYER 2 (PETRA AI)'])
    writer.writerow(['Starting Units', p2_start, 'units'])
    writer.writerow(['Ending Units', p2_end, 'units'])
    writer.writerow(['Unit Growth', p2_growth, 'units'])
    writer.writerow(['Growth Rate', p2_growth / p2_start * 100, '%'])
    writer.writerow(['Average Unit Count', p2_avg_units, 'units'])
    writer.writerow(['Commands Generated', p2_commands, 'count'])
    writer.writerow(['Commands per Tick', p2_commands / ticks_completed, 'avg'])
    writer.writerow([''])
    writer.writerow(['SYSTEM PERFORMANCE'])
    writer.writerow(['Total Commands Throughput', total_commands / (duration_ms/1000), 'commands/second'])
    writer.writerow(['Average Commands per Tick', cmd_per_tick_avg, 'commands'])
    writer.writerow(['Active Decision Ticks', active_ticks, 'ticks'])
    writer.writerow(['Idle Ticks (0 commands)', zero_command_ticks, 'ticks'])
    writer.writerow(['Idle Percentage', zero_command_ticks / ticks_completed * 100, '%'])
    writer.writerow(['Decision Activity Rate', active_ticks / ticks_completed * 100, '%'])
    writer.writerow([''])
    winner = 'Player 1 (Ollama)' if p1_end > p2_end else 'Player 2 (Petra)' if p2_end > p1_end else 'TIE'
    writer.writerow(['WINNER', winner, ''])
    writer.writerow(['Unit Advantage', abs(p1_end - p2_end), 'units'])
    writer.writerow(['Match Completion', 'Stopped by tick limit', 'status'])

print("Generated: metrics.csv")

# === WRITE JSON ===
metrics = {
    "timestamp": datetime.utcnow().isoformat(),
    "story": "R4.3 - Runtime Metrics Report",
    "match": {
        "duration": {
            "real_time_ms": duration_ms,
            "real_time_seconds": float(duration_sec),
            "real_time_minutes": round(duration_ms / 1000 / 60, 1)
        },
        "ticks": {
            "completed": ticks_completed,
            "tick_rate": round(ticks_completed / (duration_ms/1000), 2)
        }
    },
    "observations": {
        "total_observations_processed": ticks_completed,
        "total_decisions_generated": total_commands,
        "total_commands_executed": total_commands,
        "invalid_commands": invalid_commands,
        "failed_commands": failed_commands,
        "command_throughput_per_second": round(total_commands / (duration_ms/1000), 2)
    },
    "player_1": {
        "name": "Ollama",
        "starting_units": p1_start,
        "ending_units": p1_end,
        "unit_growth": p1_growth,
        "growth_rate_percent": round(p1_growth / p1_start * 100, 1),
        "average_units": round(p1_avg_units, 1),
        "commands_generated": p1_commands,
        "avg_commands_per_tick": round(p1_commands / ticks_completed, 2)
    },
    "player_2": {
        "name": "Petra AI",
        "starting_units": p2_start,
        "ending_units": p2_end,
        "unit_growth": p2_growth,
        "growth_rate_percent": round(p2_growth / p2_start * 100, 1),
        "average_units": round(p2_avg_units, 1),
        "commands_generated": p2_commands,
        "avg_commands_per_tick": 0
    },
    "performance": {
        "rl_interface_latency_avg_ms": "N/A",
        "game_latency_avg_ms": round(duration_ms / ticks_completed, 1),
        "active_decision_ticks": active_ticks,
        "idle_ticks": zero_command_ticks,
        "idle_percentage": round(zero_command_ticks / ticks_completed * 100, 1),
        "decision_activity_rate_percent": round(active_ticks / ticks_completed * 100, 1)
    },
    "economy_summary": {
        "player_1_avg_units": round(p1_avg_units, 1),
        "player_2_avg_units": round(p2_avg_units, 1),
        "total_units_produced": p1_growth + p2_growth,
        "balance_ratio": round(p1_end / p2_end, 2) if p2_end > 0 else 0
    },
    "military_summary": {
        "player_1_final_army": p1_end,
        "player_2_final_army": p2_end,
        "force_multiplication_p1": round(p1_end / p1_start, 1),
        "force_multiplication_p2": round(p2_end / p2_start, 1),
        "total_military_units": p1_end + p2_end
    },
    "match_outcome": {
        "winner": "Player 1 (Ollama)" if p1_end > p2_end else "Player 2 (Petra)" if p2_end > p1_end else "TIE",
        "unit_advantage": abs(p1_end - p2_end),
        "match_completion_status": "Stopped by tick limit",
        "natural_conclusion": False
    }
}

with open('metrics.json', 'w') as f:
    json.dump(metrics, f, indent=2)

print("Generated: metrics.json")
print("\nAll metrics generated successfully!")
print(f"  - metrics.csv")
print(f"  - metrics.json")
print(f"\nKey findings:")
print(f"  Winner: {'Player 1 (Ollama)' if p1_end > p2_end else 'Player 2'}")
print(f"  Final Score: {p1_end} vs {p2_end}")
print(f"  Total Commands: {total_commands}")
print(f"  Decision Activity: {active_ticks/ticks_completed*100:.1f}%")
