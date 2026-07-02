# OpenRA-RL Integration Host

## Overview

The OpenRA Integration Host is a bridge component that connects the AI Commander framework to the OpenRA-RL service. It provides callbacks that interface with OpenRA-RL's HTTP API while keeping all OpenRA-RL-specific code isolated from the core framework.

**Architecture Principle:** The Integration Host is a PRODUCT component (not framework), responsible for translating between the external OpenRA-RL service and the framework's callback-based adapter pattern.

## Purpose

The Integration Host solves a key architectural problem:

- **Framework:** Generic, game-agnostic, defines contracts (GameAdapter, ObservationProvider, CommandExecutor)
- **Adapter:** Pure translation layer, converts game state to framework types
- **Integration Host:** Bridges the gap between framework and external service (OpenRA-RL)

This separation keeps concerns clear:

```
┌─────────────────────────────────────────┐
│ AI Commander Framework                  │
│ (Contracts: GameAdapter, callbacks)     │
└──────────────────────┬──────────────────┘
                       ↑
                       │ (callback functions)
                       │
┌──────────────────────▼──────────────────┐
│ OpenRA Adapter                          │
│ (Translates OpenRA types)               │
└──────────────────────┬──────────────────┘
                       ↑
                       │ (HTTP requests)
                       │
┌──────────────────────▼──────────────────┐
│ OpenRA Integration Host                 │
│ (Manages OpenRA-RL service connection)  │
└──────────────────────┬──────────────────┘
                       ↑
                       │ (HTTP API)
                       │
┌──────────────────────▼──────────────────┐
│ OpenRA-RL Service                       │
│ (Docker container or local instance)    │
└─────────────────────────────────────────┘
```

## Components

### OpenRAIntegrationHost

Main class managing the connection to OpenRA-RL.

**Responsibilities:**

1. **Initialization** — Verify OpenRA-RL is reachable before returning
2. **Callback Creation** — Provide three callbacks for the adapter
3. **Service Communication** — Handle HTTP requests with retries
4. **State Conversion** — Convert OpenRA-RL responses to framework types
5. **Error Handling** — Graceful recovery with detailed logging

**Configuration:**

```typescript
interface IntegrationHostConfig {
  baseUrl: string; // OpenRA-RL service URL (e.g., http://localhost:8000)
  timeout?: number; // HTTP request timeout in ms (default: 5000)
  retries?: number; // Number of retries on failure (default: 2)
  verbose?: boolean; // Enable logging (default: false)
}
```

### Callbacks

Three callbacks provided by the Integration Host:

#### 1. gameStateAccessor

**Purpose:** Fetch current game state from OpenRA-RL

**Type:**

```typescript
() => Promise<OpenRAGameState>;
```

**Implementation:**

- Calls `GET /observation` on OpenRA-RL service
- Converts response to `OpenRAGameState` format
- Throws on network error or invalid state

**Example:**

```typescript
const state = await callbacks.gameStateAccessor();
console.log(`Current tick: ${state.world.tick}`);
console.log(`Actors: ${state.world.actors.length}`);
```

#### 2. orderSubmitter

**Purpose:** Send a command to OpenRA-RL

**Type:**

```typescript
(order: any) => Promise<boolean>;
```

**Implementation:**

- Calls `POST /step` on OpenRA-RL service
- Submits order as JSON body
- Returns success status (true/false)
- Gracefully handles errors (returns false, doesn't throw)

**Example:**

```typescript
const order = {
  orderName: 'Move',
  playerIndex: 0,
  targetPosition: { x: 600, y: 600 },
};
const success = await callbacks.orderSubmitter(order);
console.log(`Order submitted: ${success}`);
```

#### 3. stateChecker

**Purpose:** Verify OpenRA-RL is available

**Type:**

```typescript
() => Promise<boolean>;
```

**Implementation:**

- Calls `GET /status` on OpenRA-RL service
- Returns true if service status is 'ready' or 'connecting'
- Returns false if unavailable or error
- Never throws

**Example:**

```typescript
const available = await callbacks.stateChecker();
if (!available) {
  console.log('OpenRA-RL service unavailable');
}
```

## Usage

### Basic Integration

```typescript
import { createOpenRAIntegrationHost } from './openra-rl-integration-host.js';
import { OpenRAGameAdapter } from '@ai-commander/openra-adapter';

// Step 1: Create integration host
const host = await createOpenRAIntegrationHost({
  baseUrl: 'http://localhost:8000',
  verbose: true,
});

// Step 2: Get callbacks from host
const callbacks = host.createCallbacks();

// Step 3: Initialize adapter with callbacks
const adapter = new OpenRAGameAdapter();
await adapter.initialize({
  gameInstanceAccessor: callbacks.gameStateAccessor,
  orderSubmitter: callbacks.orderSubmitter,
  stateChecker: callbacks.stateChecker,
});

// Step 4: Create session (from adapter)
const session = await adapter.createSession();

// Step 5: Use session as normal
const worldState = await session.observationProvider.getWorldState();
```

### With OpenRA Mission Agent

```typescript
import { OpenRAMissionAgent } from './openra-mission-agent.js';
import { createOpenRAIntegrationHost } from './openra-rl-integration-host.js';

// Create host
const host = await createOpenRAIntegrationHost({
  baseUrl: 'http://localhost:8000',
  verbose: true,
});

// Get callbacks
const callbacks = host.createCallbacks();

// Create and run mission
const agent = new OpenRAMissionAgent(
  512,
  512, // target coordinates
  callbacks.gameStateAccessor,
  callbacks.orderSubmitter,
  callbacks.stateChecker
);

await agent.initialize();
await agent.run();
await agent.shutdown();
```

## Prerequisites

### Running OpenRA-RL

You must have OpenRA-RL running before using the integration host.

#### Option 1: Docker (Recommended)

```bash
# Pull the latest image
docker pull openra-rl

# Run the container
docker run -d -p 8000:8000 -p 9999:9999 openra-rl

# Verify it's running
curl http://localhost:8000/status
```

#### Option 2: Local Installation

```bash
# Install openra-rl
pip install openra-rl

# Start the server
openra-rl server start

# Verify it's running
openra-rl server status
```

#### Option 3: Building from Source

```bash
git clone --recurse-submodules https://github.com/yxc20089/OpenRA-RL.git
cd OpenRA-RL
python -m openra_env server start --local
```

### Verify Connection

```bash
# Check status endpoint
curl http://localhost:8000/status

# Expected response:
# {"status": "ready", "timestamp": 1234567890}
```

## Error Handling

### Initialization Errors

If `createOpenRAIntegrationHost` throws:

```
OpenRA-RL service not reachable at http://localhost:8000.
Ensure OpenRA-RL Docker container is running or service is started locally.
```

**Solutions:**

1. Start OpenRA-RL using Docker or local installation
2. Verify the URL is correct (check `--openra-url` argument)
3. Check firewall rules (port 8000 must be accessible)
4. Verify OpenRA-RL started successfully (`docker logs` or server logs)

### Runtime Errors

If callbacks fail at runtime:

**gameStateAccessor throws:**

- Network error (service unreachable)
- Service returned error status (500, 503)
- Invalid response format

**Solution:** Check OpenRA-RL logs and service status

**orderSubmitter returns false:**

- Service returned error status
- Order validation failed on service side
- Service is busy

**Solution:** Retry the order or log for debugging

**stateChecker returns false:**

- Service is temporarily unavailable
- Service returned error status

**Solution:** Implementation automatically retries; user doesn't need to handle

## Logging

Enable verbose logging to see detailed diagnostics:

```typescript
const host = await createOpenRAIntegrationHost({
  baseUrl: 'http://localhost:8000',
  verbose: true, // Enable logging
});
```

Output shows:

```
Initializing OpenRA-RL integration host...
  Base URL: http://localhost:8000
  Checking OpenRA-RL availability...
  ✓ Service is ready
✓ OpenRA-RL service connection established
Creating adapter callbacks...
✓ Callbacks registered with OpenRA adapter
  - gameStateAccessor: Fetches world state from OpenRA-RL
  - orderSubmitter: Submits orders to OpenRA-RL
  - stateChecker: Verifies OpenRA-RL availability
```

## Testing

The integration host includes comprehensive tests (`openra-rl-integration-host.test.ts`):

```bash
# Run integration host tests only
pnpm --filter reference test openra-rl-integration-host

# Run all reference tests
pnpm --filter reference test

# Run with coverage
pnpm --filter reference test -- --coverage
```

**Test Coverage:**

- **Initialization:** Connection success/failure, timeout handling
- **Callbacks:** gameStateAccessor, orderSubmitter, stateChecker
- **Retry Logic:** Network failures with exponential backoff
- **Configuration:** Custom URLs, timeouts, retry counts
- **Error Handling:** Network errors, HTTP errors, timeouts

## Command-Line Interface

The integration host is demonstrated via CLI:

```bash
# Run mission to default target (512, 512)
pnpm --filter reference exec ts-node src/openra-mission-with-integration-host-cli.ts run

# Run mission with custom target
pnpm --filter reference exec ts-node src/openra-mission-with-integration-host-cli.ts run --target-x 600 --target-y 600

# Custom OpenRA-RL URL
pnpm --filter reference exec ts-node src/openra-mission-with-integration-host-cli.ts run --openra-url http://custom.host:8000

# Display trace only
pnpm --filter reference exec ts-node src/openra-mission-with-integration-host-cli.ts trace

# JSON output
pnpm --filter reference exec ts-node src/openra-mission-with-integration-host-cli.ts run --json
```

## Architecture Principles

### Separation of Concerns

- **Framework** = Generic contracts (no game knowledge)
- **Adapter** = Type translation (game-specific but no service knowledge)
- **Integration Host** = Service management (no framework knowledge)
- **OpenRA-RL** = Game execution (no agent knowledge)

### No Framework Modification

The adapter remains completely untouched:

- No imports from integration host
- No OpenRA-RL-specific code
- No changes to callback signatures
- Callbacks work exactly as designed

### Pluggability

Can replace OpenRA-RL with another service:

```typescript
// Current: OpenRA-RL
const host = await createOpenRAIntegrationHost({...});
const callbacks = host.createCallbacks();

// Future: Different service (different host, same callbacks)
const host = await createOpenRAClassicHost({...});  // hypothetical
const callbacks = host.createCallbacks();

// Adapter works unchanged
await adapter.initialize(callbacks);
```

## Performance Characteristics

### Latency

- **Initialization:** ~100-500ms (includes health check)
- **Per observation:** ~50-200ms (network + JSON parsing)
- **Per order submission:** ~50-200ms (network)
- **Per health check:** ~50-200ms (network)

### Scalability

- Can handle multiple agents (separate callback instances)
- No connection pooling (one HTTP client per host instance)
- Supports 25 Hz game ticks (40ms per tick)

### Error Recovery

- **Automatic retries** with exponential backoff
- **Timeout handling** (default 5000ms, configurable)
- **Graceful degradation** (callbacks return errors, don't throw)

## Related Documents

- [OpenRA Integration Research](../../.foundation/reports/OPENRA_INTEGRATION_RESEARCH.md) — Evaluation of integration approaches
- [OpenRA-RL Reusability Assessment](../../.foundation/reports/OPENRA_RL_REUSABILITY_ASSESSMENT.md) — Why reuse OpenRA-RL vs fork
- [OpenRA Technical Assessment](../../.foundation/reports/OPENRA_INTEGRATION_ASSESSMENT.md) — How OpenRA integration currently works

## Next Steps

1. **Verify OpenRA-RL is running** (Docker or local)
2. **Run the CLI** to test integration end-to-end
3. **Enable verbose logging** to see diagnostic output
4. **Check OpenRA-RL service logs** if issues occur
5. **Extend** for additional game scenarios

## Troubleshooting

### OpenRA-RL Not Starting

**Docker:**

```bash
# Check if image exists
docker images | grep openra-rl

# Check if container is running
docker ps | grep openra-rl

# View container logs
docker logs <container-id>
```

**Local:**

```bash
# Check if installed
pip list | grep openra-rl

# Check service status
openra-rl server status

# View server logs
openra-rl server logs --follow
```

### Callbacks Return False/Error

**Check:**

1. OpenRA-RL is running (`curl http://localhost:8000/status`)
2. Network connectivity (firewall, port 8000)
3. Service logs for errors
4. Integration host logs (enable `verbose: true`)

### Timeouts

**Solution:** Increase timeout

```typescript
const host = await createOpenRAIntegrationHost({
  baseUrl: 'http://localhost:8000',
  timeout: 10000, // Increase from default 5000
});
```

### State Deserialization Errors

**Check:**

1. OpenRA-RL version matches expected state format
2. Game state is valid (check service logs)
3. Network didn't corrupt response (timeouts?)

## Code Examples

### Custom Timeout and Retries

```typescript
const host = await createOpenRAIntegrationHost({
  baseUrl: 'http://localhost:8000',
  timeout: 10000, // 10 second timeout
  retries: 3, // Try up to 3 times on failure
  verbose: true, // Show diagnostics
});
```

### Error Handling Pattern

```typescript
const callbacks = host.createCallbacks();

try {
  // This throws on network error
  const state = await callbacks.gameStateAccessor();
} catch (error) {
  console.error('Failed to get game state:', error);
  // Re-throw or handle gracefully
}

// This returns false on error (doesn't throw)
const success = await callbacks.orderSubmitter(order);
if (!success) {
  console.error('Order submission failed');
  // Handle retry or failure
}

// This returns false on error (doesn't throw)
const available = await callbacks.stateChecker();
if (!available) {
  console.error('Service unavailable');
  // Handle gracefully
}
```
