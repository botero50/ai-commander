#!/bin/bash
# Initialize OpenRA game content in Docker volume
# Run this once before starting tournaments

set -e

echo "Initializing OpenRA-RL game content..."
echo

# Use the openra-rl image to set up content
docker run --rm -v openra-content:/root/.config/openra/Content \
  openra-rl:latest bash -c '
    set -e
    mkdir -p /root/.config/openra/Content/ra/v2/{expand,cnc}

    cd /tmp

    echo "Attempting to download Red Alert game content..."

    # Try to download
    if curl -sL --max-time 60 -o ra.zip https://openra.baxxster.no/openra/ra-quickinstall.zip 2>/dev/null; then
        echo "✓ Download succeeded"
        unzip -q ra.zip
        cp *.mix /root/.config/openra/Content/ra/v2/ 2>/dev/null || true
        [ -d expand ] && cp expand/* /root/.config/openra/Content/ra/v2/expand/ 2>/dev/null || true
        [ -d cnc ] && cp cnc/* /root/.config/openra/Content/ra/v2/cnc/ 2>/dev/null || true
    else
        echo "⚠ Download failed - game content not available"
        echo "  You will need to manually set up game content."
        exit 1
    fi
  '

# Verify content
echo
echo "Verifying game content..."
docker run --rm -v openra-content:/data alpine ls -la /data/ra/v2/ | head -20

echo
echo "✓ Game content setup complete!"
echo
echo "You can now run tournaments:"
echo "  npx ts-node ollama-tournament.ts"
echo "  npx ts-node chatgpt-tournament.ts"
