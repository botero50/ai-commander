# Story 32.2 — Full Spectator Flow Validation Checklist

## Overview
This document provides a step-by-step manual validation checklist for the complete spectator user journey.

## Pre-Flight Checks

- [ ] AI Commander is running (npm start)
- [ ] 0 A.D. is installed and accessible
- [ ] Ollama is running (or configured LLM provider)
- [ ] All services are operational (check `/api/health`)
- [ ] Browser console is open (F12) to catch any errors

---

## Phase 1: Application Initialization

### 1.1 Launch AI Commander
- [ ] Navigate to http://localhost:3000
- [ ] Page loads without errors
- [ ] No console errors (F12)
- [ ] Navigation menu visible
- [ ] Application header displays

**Expected Result:** Clean page load, no errors

---

## Phase 2: Match Setup

### 2.1 Configure Match
- [ ] Access match configuration screen
- [ ] Select Player 1: Ollama or configured LLM
- [ ] Select Player 2: Ollama or configured LLM
- [ ] Choose map (default: Islands)
- [ ] Confirm settings

**Expected Result:** Match configuration accepted without errors

### 2.2 Start Match
- [ ] Click "Start Match" button
- [ ] 0 A.D. launches automatically (or opens in browser)
- [ ] Match initialization completes (observe progress)
- [ ] Game window shows both AI players

**Expected Result:** Match starts successfully, no crashes

---

## Phase 3: Live Match Viewing

### 3.1 Verify Match Data Connection
- [ ] `/api/health` endpoint returns "healthy"
- [ ] `/api/match/metadata` returns player info
- [ ] `/api/match/state` returns game state (resources, pop, tech)
- [ ] Metadata shows correct player names and models

**Expected Result:** All data endpoints respond with valid data

### 3.2 Verify HUD Display
- [ ] Game State HUD visible on screen
- [ ] Player 1 resources display (food, wood, metal, stone)
- [ ] Player 2 resources display
- [ ] Population counters visible
- [ ] Technology progress shown
- [ ] HUD updates in real-time as game progresses

**Expected Result:** HUD displays live game state without lag

### 3.3 Verify AI Status Display
- [ ] AI Status shows Player 1 model and provider
- [ ] AI Status shows Player 2 model and provider
- [ ] Latency indicator visible
- [ ] Confidence percentage shown
- [ ] Objective text displays current AI strategy

**Expected Result:** AI telemetry visible for both players

### 3.4 Verify Minimap Display
- [ ] Minimap visible in bottom-left corner
- [ ] Unit positions shown with correct colors
- [ ] Buildings shown with correct symbols
- [ ] Fog of War (darkened areas) visible
- [ ] Map overview matches game state

**Expected Result:** Minimap displays accurate map state

### 3.5 Verify Commentary Display
- [ ] Live commentary appears on screen
- [ ] Commentary updates as major events occur
- [ ] Text is readable and properly formatted
- [ ] New entries appear smoothly (not jumpy)

**Expected Result:** Commentary feeds updates in real-time

### 3.6 Verify Decision Timeline
- [ ] Decision timeline visible (left side)
- [ ] AI decisions logged as they occur
- [ ] Player and action shown for each decision
- [ ] Timestamp or order clear
- [ ] Can scroll through past decisions

**Expected Result:** Timeline captures AI actions

### 3.7 Verify Event Annotations
- [ ] Major events marked on timeline
- [ ] Event types labeled (battle, building destroyed, unit death, etc)
- [ ] Event severity indicated (color or icon)
- [ ] Popup or detail available on hover

**Expected Result:** Major events clearly marked

### 3.8 Verify Objective Tracker
- [ ] Objective evolution timeline visible
- [ ] Shows strategy changes over time
- [ ] Current objective displayed
- [ ] Historical objectives visible

**Expected Result:** Strategy evolution tracked

### 3.9 Verify Stream Mode
- [ ] Press Ctrl+Shift+S to activate stream mode
- [ ] All debug UI disappears
- [ ] Only spectator information visible
- [ ] Professional appearance achieved
- [ ] Press Ctrl+Shift+S again to deactivate

**Expected Result:** Stream mode toggles cleanly

---

## Phase 4: Match Playback Control

### 4.1 Test Play/Pause
- [ ] Click Play button
- [ ] Match continues if paused
- [ ] Click Pause button
- [ ] Game freezes at current tick
- [ ] Data still updates (no stale data)

**Expected Result:** Play/pause controls work smoothly

### 4.2 Test Seek/Scrubbing
- [ ] Drag timeline slider to different tick
- [ ] Game jumps to that point
- [ ] Data updates to match new tick
- [ ] Performance remains smooth

**Expected Result:** Seek function accurate and responsive

### 4.3 Test Speed Control
- [ ] Set playback speed to 0.5x
- [ ] Game plays slower than real-time
- [ ] Set playback speed to 2x
- [ ] Game plays faster than real-time
- [ ] Return to 1x (live) speed

**Expected Result:** Speed control functional

### 4.4 Test Slow Motion
- [ ] During major battle, slow motion activates automatically
- [ ] Speed reduced to cinematic level (e.g., 0.5x)
- [ ] Battle plays in slow motion for dramatic effect
- [ ] Speed returns to normal after battle ends

**Expected Result:** Cinematic slow motion triggers appropriately

---

## Phase 5: Instant Replay & Highlights

### 5.1 Test Instant Replay
- [ ] Major event occurs (building destroyed, large battle)
- [ ] Instant Replay option appears or auto-triggers
- [ ] Last 30 seconds replays automatically
- [ ] Can seek within replay
- [ ] Smooth transition back to live

**Expected Result:** Instant replay captures key moments

### 5.2 Test Highlight Generation
- [ ] Match progresses to completion
- [ ] Highlights are automatically identified
- [ ] 3-minute reel available after match ends
- [ ] Highlights include: biggest battle, largest army, fastest expansion, economy, decisive attack
- [ ] Highlights ranked by importance

**Expected Result:** Highlights automatically generated and available

### 5.3 View Highlight Reel
- [ ] Access highlights after match completion
- [ ] Watch 3-minute reel
- [ ] Transitions between highlights smooth
- [ ] All highlight types represented

**Expected Result:** Reel is watchable and professional

---

## Phase 6: Post-Game Review

### 6.1 Match Report Available
- [ ] After match ends, report screen appears
- [ ] Shows match summary (duration, winner, score)
- [ ] Shows player statistics
- [ ] Shows key moments

**Expected Result:** Report accessible immediately after match

### 6.2 Replay Access
- [ ] Replay file saved after match
- [ ] Can access replay from match history
- [ ] Replay loads quickly
- [ ] Full match available to rewatch

**Expected Result:** Replay saved and accessible

### 6.3 Match Browser
- [ ] Access match history view
- [ ] List shows all completed matches
- [ ] Each match shows: date, players, duration, winner
- [ ] Can sort by date, duration, winner
- [ ] Can filter by player name

**Expected Result:** Match history browsable and searchable

### 6.4 Match Comparison
- [ ] Select two matches to compare
- [ ] Side-by-side view shows key stats
- [ ] Economy progression shown
- [ ] Military strength compared
- [ ] Differences highlighted

**Expected Result:** Match comparison insightful

### 6.5 AI Profiles
- [ ] View Player 1 profile
- [ ] Shows ELO rating
- [ ] Shows win/loss record
- [ ] Shows win rate percentage
- [ ] Shows recent match results
- [ ] Shows favorite strategies and races

**Expected Result:** AI profiles show comprehensive stats

---

## Phase 7: Performance & Stability

### 7.1 Monitor CPU Usage
- [ ] CPU usage during match: < 50% (reasonable)
- [ ] No CPU spikes during major events
- [ ] No stuttering or frame drops

**Acceptable:** Consistent performance, no stalls

### 7.2 Monitor Memory Usage
- [ ] Starting memory: < 200MB
- [ ] After 5 minutes: < 300MB
- [ ] After 15 minutes: < 400MB
- [ ] No memory leaks detected

**Acceptable:** Stable memory usage

### 7.3 Monitor UI Responsiveness
- [ ] HUD updates: < 100ms latency
- [ ] Controls respond immediately: < 50ms
- [ ] No lag when interacting with UI

**Acceptable:** UI feels responsive

### 7.4 Test Network Resilience
- [ ] Disconnect internet briefly
- [ ] Overlay shows "offline" status
- [ ] Reconnect internet
- [ ] Connection restored automatically
- [ ] Data syncs without user intervention

**Acceptable:** Graceful disconnection handling

---

## Phase 8: Error Scenarios

### 8.1 Handle Missing Data
- [ ] If `/api/match/metadata` fails, show graceful error
- [ ] HUD still displays whatever data is available
- [ ] No crash or blank screen
- [ ] Error message is user-friendly

**Expected:** Graceful degradation on missing data

### 8.2 Handle Slow Network
- [ ] Temporarily throttle network to 3G
- [ ] Application doesn't crash
- [ ] Data loads eventually
- [ ] UI doesn't freeze

**Expected:** Handles slow network gracefully

### 8.3 Handle Invalid API Response
- [ ] Send malformed JSON from test endpoint
- [ ] Application catches error gracefully
- [ ] User sees error message, not console error
- [ ] Can retry or proceed

**Expected:** Robust error handling

---

## Phase 9: Keyboard Shortcuts

### 9.1 Test HUD Toggle
- [ ] Press `H`
- [ ] HUD hides
- [ ] Press `H` again
- [ ] HUD reappears

**Expected:** HUD toggle works

### 9.2 Test Stream Mode Toggle
- [ ] Press `Ctrl+Shift+S`
- [ ] Stream mode activates
- [ ] All debug UI disappears
- [ ] Press `Ctrl+Shift+S` again
- [ ] Exits stream mode

**Expected:** Stream mode toggle responsive

### 9.3 Test Minimap Toggle
- [ ] Press `M`
- [ ] Minimap hides
- [ ] Press `M` again
- [ ] Minimap reappears

**Expected:** Minimap toggle works

### 9.4 Test Close Dialogs
- [ ] Open any dialog/popup
- [ ] Press `Escape`
- [ ] Dialog closes

**Expected:** Escape closes dialogs

---

## Phase 10: Complete Flow End-to-End

### 10.1 Full Match Cycle
- [ ] Start application
- [ ] Configure match (Ollama vs Ollama)
- [ ] Watch match for 2-3 minutes
- [ ] Pause and review at key moment
- [ ] Watch instant replay
- [ ] Let match complete
- [ ] Review final report
- [ ] View highlights
- [ ] Browse match history
- [ ] Compare with previous match
- [ ] View AI profiles

**Expected:** Complete user journey works without manual intervention

### 10.2 Document Any Issues
- [ ] For each issue found, record:
  - [ ] Step where it occurred
  - [ ] Exact error message (if any)
  - [ ] Steps to reproduce
  - [ ] Impact on user experience (critical/high/medium/low)

**Expected:** Issues logged for triage

---

## Sign-Off

- [ ] All phases completed
- [ ] All critical issues resolved or documented
- [ ] All data endpoints tested
- [ ] All UI components rendering correctly
- [ ] All keyboard shortcuts functional
- [ ] Complete match cycle validated
- [ ] No crashes or unhandled errors
- [ ] Performance acceptable

**Date Completed:** ________________

**Validated By:** ________________

**Notes:**

```
[Add any observations or issues discovered]
```

---

## Issues Found

| # | Step | Issue | Severity | Status |
|---|------|-------|----------|--------|
|   |      |       |          |        |
|   |      |       |          |        |
|   |      |       |          |        |

---

## Recommendations

```
[List any improvements or fixes recommended for next iteration]
```
