#!/bin/bash
# Quick camera address finder

echo "🎬 Quick Camera Address Finder"
echo "=============================="
echo ""
echo "Make sure you have:"
echo "1. 0 A.D. running with a game in progress"
echo "2. Python 3 installed"
echo ""

# Check if pymem is installed
python3 -c "import pymem" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "📦 Installing pymem..."
    pip install pymem psutil
fi

echo ""
echo "🔍 Starting camera address finder..."
echo ""

# Run the finder
python3 "$(dirname "$0")/find-camera-address.py"

echo ""
echo "Done!"
