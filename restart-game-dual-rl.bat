@echo off
REM Dual RL Interface setup for two-brain tournament
REM This starts TWO instances of 0 A.D. with different RL Interface ports
REM
REM Instance 1: Player 1 controlled via RL Interface on port 6000
REM Instance 2: Player 2 controlled via RL Interface on port 6001

taskkill /F /IM pyrogenesis.exe 2>nul
timeout /T 3 /nobreak

set PYROGENESIS=%USERPROFILE%\AppData\Local\0 A.D. Empires Ascendant\binaries\system\pyrogenesis.exe

REM This approach won't work - we need a different solution
REM The issue: 0 A.D. can't have two instances in a network game
REM
REM Better approach: Use the SAME instance but let both brains command through it
REM The RL Interface session is tied to one player, but we can:
REM 1. Have both brains make decisions
REM 2. Combine their commands into one /step call
REM 3. Both players execute commands in same tick
REM
REM For now, we'll document this as a known limitation
echo Two-brain tournament requires architectural changes to RL Interface
echo Current limitation: RL Interface controls one player per connection
echo
echo Solution approaches:
echo 1. Multiplexing: Both brains decide, both execute in same /step (preferred)
echo 2. Dual instances: Not supported by 0 A.D. network protocol
echo 3. Sequential control: Alternate between brains each tick (slower)
echo
echo Implementing approach 1: Multiplexed commands
pause
