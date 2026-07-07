#!/bin/bash
set -e

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  OpenRA-RL Docker Image Loader        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ARCHIVE="$SCRIPT_DIR/openra-rl-latest.tar.gz"

# Check if archive exists
if [ ! -f "$ARCHIVE" ]; then
    echo -e "${YELLOW}✗ Archive not found: $ARCHIVE${NC}"
    exit 1
fi

echo -e "${BLUE}Step 1: Loading Docker image...${NC}"
if docker load < "$ARCHIVE"; then
    echo -e "${GREEN}✓ Image loaded${NC}"
else
    echo -e "${YELLOW}✗ Load failed (try with sudo)${NC}"
    exit 1
fi

echo -e "${BLUE}Step 2: Verifying image...${NC}"
if docker images openra-rl:latest | grep -q openra-rl; then
    echo -e "${GREEN}✓ Image verified${NC}"
else
    echo -e "${YELLOW}✗ Image not found${NC}"
    exit 1
fi

echo
echo -e "${BLUE}Step 3: Creating volume for game content...${NC}"
if docker volume inspect openra-content &>/dev/null; then
    echo -e "${YELLOW}! Volume already exists${NC}"
else
    docker volume create openra-content
    echo -e "${GREEN}✓ Volume created${NC}"
fi

echo
echo -e "${BLUE}Step 4: Setting up game content (this may take a minute)...${NC}"
docker run --rm -v openra-content:/root/.config/openra/Content \
  openra-rl:latest bash -c '
    mkdir -p /root/.config/openra/Content/ra/v2/{expand,cnc}
    cd /tmp
    echo "Downloading game content..."
    if curl -sL -o ra.zip https://openra.baxxster.no/openra/ra-quickinstall.zip 2>/dev/null; then
        unzip -q ra.zip
        cp *.mix /root/.config/openra/Content/ra/v2/ 2>/dev/null || true
        cp expand/* /root/.config/openra/Content/ra/v2/expand/ 2>/dev/null || true
        cp cnc/* /root/.config/openra/Content/ra/v2/cnc/ 2>/dev/null || true
        echo "✓ Game content ready"
    else
        echo "⚠ Could not download game content (network issue)"
        echo "  You can set it up later with the setup-content.sh script"
    fi
  '

echo
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Ready to run!                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo
echo -e "${BLUE}Start the container with:${NC}"
echo -e "  ${YELLOW}docker run -p 9999:9999 -v openra-content:/root/.config/openra/Content openra-rl:latest${NC}"
echo
echo -e "${BLUE}Or use the run script:${NC}"
echo -e "  ${YELLOW}./run.sh${NC}"
echo
