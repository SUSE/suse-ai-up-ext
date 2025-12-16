#!/bin/bash

# MCP Server Demo Simulation Script
# This script simulates MCP servers starting in sequence, then cycling through
# shutdown/restart phases to demonstrate real-time UI updates.

# Configuration
SERVERS=(
    "mcp-server-1:8911"
    "mcp-server-2:8912"
    "mcp-server-3:8911"
    "mcp-server-4:8914"
)

STARTUP_DELAY=10    # seconds between server starts
CYCLE_TIME=30       # seconds between shutdown cycles
RESTART_DELAY=10    # seconds to wait before restart after shutdown

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Mock server processes (using files to store PIDs)
PID_DIR="/tmp/mcp-demo-pids"
mkdir -p "$PID_DIR"

# Function to start a mock server
start_server() {
    local server=$1
    local name=$(echo $server | cut -d: -f1)
    local port=$(echo $server | cut -d: -f2)
    local pid_file="$PID_DIR/${name}.pid"

    echo -e "${GREEN}$(date): Starting $name on port $port${NC}"

    # Start a background process to simulate the server
    # In a real implementation, this would start the actual MCP server
    (sleep 999999) &
    local pid=$!
    echo $pid > "$pid_file"

    # Simulate server startup time
    sleep 2
    echo -e "${GREEN}$(date): $name is now running (PID: $pid)${NC}"
}

# Function to stop a mock server
stop_server() {
    local server=$1
    local name=$(echo $server | cut -d: -f1)
    local pid_file="$PID_DIR/${name}.pid"

    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        echo -e "${RED}$(date): Stopping $name${NC}"
        kill $pid 2>/dev/null
        rm -f "$pid_file"
        echo -e "${RED}$(date): $name stopped${NC}"
    fi
}

# Function to check if any servers are running
servers_running() {
    for server in "${SERVERS[@]}"; do
        local name=$(echo $server | cut -d: -f1)
        local pid_file="$PID_DIR/${name}.pid"
        if [[ -f "$pid_file" ]]; then
            return 0
        fi
    done
    return 1
}

# Function to stop all servers
stop_all_servers() {
    echo -e "${YELLOW}$(date): Stopping all servers...${NC}"
    for server in "${SERVERS[@]}"; do
        stop_server "$server"
    done
    rm -rf "$PID_DIR"
}

# Function to check if any servers are running
servers_running() {
    for server in "${SERVERS[@]}"; do
        local name=$(echo $server | cut -d: -f1)
        local pid_file="$PID_DIR/${name}.pid"
        if [[ -f "$pid_file" ]]; then
            return 0
        fi
    done
    return 1
}

# Signal handler for clean shutdown
trap 'echo -e "\n${YELLOW}Received interrupt signal. Stopping all servers...${NC}"; stop_all_servers; exit 0' INT TERM

# Main simulation loop
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  MCP Server Demo Simulation Started${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo "Servers will start $STARTUP_DELAY seconds apart"
    echo "Every $CYCLE_TIME seconds: shutdown → wait $RESTART_DELAY seconds → restart"
    echo "Press Ctrl+C to stop"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    local cycle_count=1

    while true; do
        echo -e "${BLUE}$(date): === CYCLE $cycle_count: STARTUP PHASE ===${NC}"

        # Phase 1: Sequential startup
        local server_count=${#SERVERS[@]}
        local current_index=0
        for server in "${SERVERS[@]}"; do
            start_server "$server"
            current_index=$((current_index + 1))
            if [[ $current_index -lt $server_count ]]; then
                echo -e "${YELLOW}Waiting $STARTUP_DELAY seconds before next server...${NC}"
                sleep $STARTUP_DELAY
            fi
        done

        echo -e "${GREEN}$(date): All servers are now running${NC}"
        echo -e "${YELLOW}Running for $CYCLE_TIME seconds...${NC}"

        # Phase 2: Run for CYCLE_TIME seconds
        local elapsed=0
        while [[ $elapsed -lt $CYCLE_TIME ]]; do
            sleep 5
            elapsed=$((elapsed + 5))
            remaining=$((CYCLE_TIME - elapsed))
            if [[ $remaining -gt 0 ]]; then
                echo -e "${YELLOW}$(date): $remaining seconds remaining in current cycle${NC}"
            fi
        done

        # Phase 3: Shutdown all servers
        echo -e "${BLUE}$(date): === CYCLE $cycle_count: SHUTDOWN PHASE ===${NC}"
        stop_all_servers

        # Phase 4: Wait before restart
        echo -e "${YELLOW}$(date): Waiting $RESTART_DELAY seconds before restart...${NC}"
        sleep $RESTART_DELAY

        cycle_count=$((cycle_count + 1))
        echo ""
    done
}

# Run main function
main