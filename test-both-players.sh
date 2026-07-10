#!/bin/bash

echo "=== Testing Player 1 (Athenians) ==="
curl -s -X POST http://127.0.0.1:6000/step -H "Content-Type: text/plain" -d '' > /tmp/p1_before.json

curl -s -X POST http://127.0.0.1:6000/step -H "Content-Type: text/plain" -d '{"type":"move","entities":[9340],"x":100,"z":100,"queued":false}' > /tmp/p1_after.json

p1_before=$(python3 -c "import json; d=json.load(open('/tmp/p1_before.json')); u=d['entities']['9340']['position']; print(f'{u[0]:.1f},{u[1]:.1f}')")
p1_after=$(python3 -c "import json; d=json.load(open('/tmp/p1_after.json')); u=d['entities']['9340']['position']; print(f'{u[0]:.1f},{u[1]:.1f}')")

echo "Player 1 unit 9340: $p1_before -> $p1_after"

echo ""
echo "=== Testing Player 2 (Gaul) ==="
curl -s -X POST http://127.0.0.1:6000/step -H "Content-Type: text/plain" -d '' > /tmp/p2_before.json

curl -s -X POST http://127.0.0.1:6000/step -H "Content-Type: text/plain" -d '{"type":"move","entities":[9345],"x":100,"z":100,"queued":false}' > /tmp/p2_after.json

p2_before=$(python3 -c "import json; d=json.load(open('/tmp/p2_before.json')); u=d['entities']['9345']['position']; print(f'{u[0]:.1f},{u[1]:.1f}')")
p2_after=$(python3 -c "import json; d=json.load(open('/tmp/p2_after.json')); u=d['entities']['9345']['position']; print(f'{u[0]:.1f},{u[1]:.1f}')")

echo "Player 2 unit 9345: $p2_before -> $p2_after"

echo ""
echo "Conclusion:"
python3 << 'PYTHON'
import json

p1_before = json.load(open('/tmp/p1_before.json'))
p1_after = json.load(open('/tmp/p1_after.json'))
p2_before = json.load(open('/tmp/p2_before.json'))
p2_after = json.load(open('/tmp/p2_after.json'))

u1_before = p1_before['entities']['9340']['position']
u1_after = p1_after['entities']['9340']['position']
dist1 = ((u1_after[0]-u1_before[0])**2 + (u1_after[1]-u1_before[1])**2)**0.5

u2_before = p2_before['entities']['9345']['position']
u2_after = p2_after['entities']['9345']['position']
dist2 = ((u2_after[0]-u2_before[0])**2 + (u2_after[1]-u2_before[1])**2)**0.5

if dist1 > 0.5:
    print("✓ Player 1 units RESPOND to commands")
else:
    print("✗ Player 1 units DON'T respond")

if dist2 > 0.5:
    print("✓ Player 2 units RESPOND to commands")
else:
    print("✗ Player 2 units DON'T respond")

if dist1 > 0.5 and dist2 == 0:
    print("\n=> RL Interface controls PLAYER 1 only")
elif dist2 > 0.5 and dist1 == 0:
    print("\n=> RL Interface controls PLAYER 2 only")
elif dist1 > 0.5 and dist2 > 0.5:
    print("\n=> RL Interface controls BOTH players (multiplexed)")
else:
    print("\n=> RL Interface controls NEITHER player (issue!)")
PYTHON
