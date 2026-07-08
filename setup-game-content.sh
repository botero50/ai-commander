#!/bin/bash
# Setup OpenRA game content for Docker container
# This script attempts to download Red Alert game content or provides instructions

set -e

CONTENT_DIR="/var/lib/docker/volumes/openra-content/_data"
RA_DIR="$CONTENT_DIR/ra/v2"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  OpenRA Game Content Setup                                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo

# Check if content already exists
if [ -f "$RA_DIR/allies.mix" ] 2>/dev/null; then
    echo "✓ Game content already set up"
    exit 0
fi

echo "Setting up OpenRA game content directory structure..."
mkdir -p "$RA_DIR/expand"
mkdir -p "$RA_DIR/cnc"

echo
echo "Attempting to download Red Alert game content..."
echo

# Try to download from multiple sources
DOWNLOAD_SUCCESS=false

# Try source 1: baxxster.no (original source in script)
echo "Trying source 1: openra.baxxster.no..."
if curl -sL --max-time 30 -o /tmp/ra-quickinstall.zip https://openra.baxxster.no/openra/ra-quickinstall.zip 2>/dev/null; then
    if unzip -t /tmp/ra-quickinstall.zip >/dev/null 2>&1; then
        echo "✓ Downloaded successfully from baxxster.no"
        unzip -q /tmp/ra-quickinstall.zip -d /tmp/ra-content
        cp /tmp/ra-content/*.mix "$RA_DIR/" 2>/dev/null || true
        cp /tmp/ra-content/expand/* "$RA_DIR/expand/" 2>/dev/null || true
        cp /tmp/ra-content/cnc/* "$RA_DIR/cnc/" 2>/dev/null || true
        DOWNLOAD_SUCCESS=true
    fi
fi

# Try source 2: SourceForge mirror (if available)
if [ "$DOWNLOAD_SUCCESS" = false ]; then
    echo "Trying source 2: SourceForge..."
    if curl -sL --max-time 30 -o /tmp/openra-mirror.zip https://sourceforge.net/projects/openra.mirror/files/Game%20Content/ra-quickinstall.zip 2>/dev/null; then
        if unzip -t /tmp/openra-mirror.zip >/dev/null 2>&1; then
            echo "✓ Downloaded successfully from SourceForge"
            unzip -q /tmp/openra-mirror.zip -d /tmp/ra-content
            cp /tmp/ra-content/*.mix "$RA_DIR/" 2>/dev/null || true
            cp /tmp/ra-content/expand/* "$RA_DIR/expand/" 2>/dev/null || true
            cp /tmp/ra-content/cnc/* "$RA_DIR/cnc/" 2>/dev/null || true
            DOWNLOAD_SUCCESS=true
        fi
    fi
fi

if [ "$DOWNLOAD_SUCCESS" = false ]; then
    echo
    echo "⚠ Could not automatically download game content"
    echo
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║  Manual Setup Instructions                                     ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo
    echo "You need to obtain the Red Alert game content files manually."
    echo
    echo "Option 1: From the OpenRA Launcher (Recommended)"
    echo "  1. Install OpenRA: https://www.openra.net/download/"
    echo "  2. Launch OpenRA and select Red Alert mod"
    echo "  3. When prompted, download the game content"
    echo "  4. Files are located in:"
    echo "     - Windows: %APPDATA%\\OpenRA\\Content\\ra\\v2\\"
    echo "     - macOS: ~/Library/Application\\ Support/OpenRA/Content/ra/v2/"
    echo "     - Linux: ~/.config/openra/Content/ra/v2/"
    echo
    echo "Option 2: From Original Game CDs or Freeware"
    echo "  1. You need these .mix files in $RA_DIR:"
    echo "     - allies.mix, russian.mix, hires.mix, lores.mix"
    echo "     - interior.mix, local.mix, conquer.mix, scores.mix"
    echo "     - snow.mix, sounds.mix, speech.mix, temperat.mix"
    echo "  2. Also needed in $RA_DIR/cnc/:"
    echo "     - desert.mix"
    echo "  3. Also needed in $RA_DIR/expand/:"
    echo "     - expansion content files"
    echo
    echo "Once you have the files, copy them to the Docker volume:"
    echo "  docker cp ./ra/v2/* openra-content:/root/.config/openra/Content/ra/v2/"
    echo
    echo "Or mount them as a volume when starting the container:"
    echo "  docker run -p 8000:8000 -v /path/to/ra/v2:/root/.config/openra/Content/ra/v2 openra-rl:latest"
    echo
    exit 1
fi

# Verify content is in place
if [ -f "$RA_DIR/allies.mix" ]; then
    echo
    echo "✓ Game content setup complete!"
    ls -lh "$RA_DIR" | grep -E "\.mix$" | wc -l | xargs echo "  Found"  "mix files"
    exit 0
else
    echo
    echo "⚠ Content files not found. Please follow the manual setup instructions above."
    exit 1
fi
