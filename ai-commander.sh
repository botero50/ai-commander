#!/bin/bash

# AI Commander CLI Script
# Usage: ./ai-commander.sh match start [options]
#        ./ai-commander.sh tournament run [options]
#        ./ai-commander.sh replay export [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Download from: https://nodejs.org/"
    exit 1
fi

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}Installing pnpm...${NC}"
    npm install -g pnpm
fi

# Navigate to project
cd "$SCRIPT_DIR"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing dependencies...${NC}"
    pnpm install
fi

# Check if project is built
if [ ! -d "packages/zeroad-adapter/dist" ]; then
    echo -e "${BLUE}Building project...${NC}"
    pnpm build
fi

# Function to show help
show_help() {
    cat << EOF
${GREEN}AI Commander CLI${NC}

Usage: ${BLUE}./ai-commander.sh <command> [options]${NC}

Commands:
    ${BLUE}match start${NC}         Start a match between two AI brains
    ${BLUE}tournament run${NC}      Run a tournament
    ${BLUE}tournament status${NC}   Show tournament status
    ${BLUE}tournament list${NC}     List all tournaments
    ${BLUE}config preset list${NC}  List available presets
    ${BLUE}help${NC}                Show this help message
    ${BLUE}version${NC}             Show version information

Examples:
    # Start a simple match
    ${BLUE}./ai-commander.sh match start${NC}

    # Start match with custom options
    ${BLUE}./ai-commander.sh match start --brain1 Ollama --brain2 Ollama --max-ticks 5000${NC}

    # Run a tournament
    ${BLUE}./ai-commander.sh tournament run --preset multi-llm${NC}

    # Get help
    ${BLUE}./ai-commander.sh match start --help${NC}

For detailed setup and usage instructions, see:
    ${YELLOW}GETTING-STARTED.md${NC}

EOF
}

# Function to show version
show_version() {
    echo -e "${GREEN}AI Commander v1.0.0-mvp${NC}"
    echo "Node.js: $(node --version)"
    echo "pnpm: $(pnpm --version)"
}

# Check for no arguments
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

# Parse command
case "$1" in
    help|--help|-h)
        show_help
        exit 0
        ;;
    version|--version|-v)
        show_version
        exit 0
        ;;
    match|tournament|config|replay)
        # Valid command, pass through to CLI
        echo -e "${BLUE}Running: ai-commander $@${NC}"
        echo ""
        node --input-type=module -e "
            import { createCLI } from './packages/zeroad-adapter/dist/cli/index.js';
            const cli = createCLI();
            const exitCode = await cli.run(['node', 'cli', ...'$@'.split(' ')]);
            process.exit(exitCode);
        "
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
