# EPIC R0.6 — Official RL Interface Verification
**Date Started:** July 9, 2026  
**Investigation Status:** IN PROGRESS  
**Goal:** Determine whether the official 0 A.D. RL Interface works independently  

---

## Executive Summary

This investigation aims to answer **one question**:  
"Does the official 0 A.D. RL Interface actually work as documented?"

Previous investigation (R1.2) showed that AI Commander **cannot** communicate with the RL Interface, leading to the conclusion that "the RL Interface is broken." This investigation separates two possibilities:

1. **AI Commander is sending invalid requests** (RL Interface works, client is wrong)
2. **The RL Interface itself is broken** (no matter what client sends, it fails)

We are testing **independently of AI Commander** using the official 0 A.D. binary.

---

## Story R0.6.1 — Verify Official RL Interface Build ✅ COMPLETE

**Finding:** 0 A.D. version **0.28.0** (release build) is installed.

**Evidence:**
- Executable: `/c/Users/boter/AppData/Local/0 A.D. Empires Ascendant/binaries/system/pyrogenesis.exe`
- Build Version: `release-0.28.0`
- Engine Version: `0.28.0`
- **Critical:** Debug symbol file `rlinterface.pdb` exists in system directory

**Conclusion:** The RL Interface is officially included in this build.

---

## Story R0.6.2 — Reproduce Official Example ⚠️ CRITICAL FINDINGS

### What Worked
✓ **TCP Connection:** Successfully connects to 127.0.0.1:6000
✓ **HTTP Server:** Server responds to HTTP requests on port 6000
✓ **Process:** Game process launches successfully

### What Failed  
✗ **HTTP Endpoints:** Standard REST endpoints not recognized
✗ **Protocol Mismatch:** Server rejects standard HTTP formats

### Raw Evidence

```
Test 1: GET /
Status: 404 Not Found
Body: "Unrecognised URI"

Test 2: GET /state
Status: 404 Not Found
Body: "Unrecognised URI"

Test 3: POST /reset (empty body)
Status: 400 Bad Request
Body: "No POST data found."

Test 4: POST /reset (JSON body: {"tick":0})
Status: (NO RESPONSE - connection closed immediately)

Test 5: POST /reset (JSON body: {"tick":0,"commands":[]})
Status: (NO RESPONSE - connection closed immediately)
```

### Interpretation

The HTTP server is **running but not responding correctly** to standard API requests. When JSON data is sent, the connection closes without response. This indicates either:

1. **Protocol is not REST-based** — The endpoints may use a different format
2. **RL Interface crashes on valid JSON** — Internal bug in 0 A.D. code
3. **Protocol requires specific format** — Expected data structure differs from standard HTTP

---

## Story R0.6.3 — Trace RL Interface Execution (IN PROGRESS)

### What We Need
- 0 A.D. source code to find RL Interface implementation
- Exact protocol specification from official documentation
- Execution trace when game starts with `--rl-interface` flag

### Current Blocker
**Cannot access 0 A.D. source code repository** due to network filtering. Need to:
1. Find official RL Interface protocol documentation  
2. Examine HTTP request/response format more carefully
3. Check if specific headers or encoding is required

### Findings So Far
- Log files show no RL Interface initialization messages
- HTTP server starts but endpoints are not standard REST
- Closing connection on valid JSON suggests protocol mismatch

---

## Story R0.6.4 — Protocol Verification (IN PROGRESS)

### Key Observation: Connection Behavior

**When no body sent:** Server returns error (400, 404)  
**When JSON body sent:** Server closes connection without response

This is **NOT normal HTTP behavior**. Standard servers either:
- Return 4xx/5xx error response, OR
- Process request and return success response

**Closing connection without response indicates:**
- Server is crashing
- Server is using a different protocol layer
- Server expects binary data, not JSON

### Next Steps
1. Capture binary wire protocol with raw socket inspection
2. Test different Content-Type headers
3. Try form-encoded data instead of JSON
4. Look for any reference to the protocol in game binaries or documentation

---

## Story R0.6.5 — Root Cause Analysis (PENDING)

Waiting for findings from R0.6.3 and R0.6.4 before drawing conclusions.

---

## Key Data Points Collected

| Aspect | Finding |
|--------|---------|
| **Version** | 0.28.0 (release) |
| **Binary Contains RL Code** | YES (rlinterface.pdb present) |
| **Process Launches** | YES |
| **Port 6000 Listens** | YES |
| **TCP Connects** | YES |
| **HTTP Server Responds** | PARTIAL (errors only) |
| **Standard REST Works** | NO |
| **JSON Format Accepted** | NO |
| **Official Docs Available** | UNKNOWN |

---

## Timeline

- **18:36:17** — Process launched with `--rl-interface=127.0.0.1:6000`
- **18:36:23** — TCP connection successful
- **18:36:35** — HTTP endpoint testing began
- **18:36:XX** — Protocol testing revealed endpoint issues
- **Current** — Investigating actual protocol format

---

## Next Actions

1. **Complete R0.6.3:** Find RL Interface source code/documentation
2. **Complete R0.6.4:** Test additional protocol formats
3. **Complete R0.6.5:** Draw definitive conclusion about root cause

---

**Investigation Authority:** Forensic verification of official 0 A.D. RL Interface  
**Confidence Level:** Evidence is rigorous, conclusions pending  
**Status:** ONGOING — Evidence collection in progress  
