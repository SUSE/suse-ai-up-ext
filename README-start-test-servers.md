# MCP Server Demo Simulation

This script simulates MCP (Model Context Protocol) servers for demonstration purposes, providing realistic server lifecycle behavior to test the Rancher UI's real-time update capabilities.

## Features

- **Sequential Startup**: Servers start 10 seconds apart from each other
- **Cyclic Operation**: Every 30 seconds, all servers shut down, wait 10 seconds, then restart
- **Real-time Simulation**: Perfect for testing UI refresh and server discovery features
- **Clean Shutdown**: Properly handles interrupts and cleans up processes

## Usage

```bash
# Make executable (first time only)
chmod +x start-test-servers.sh

# Run the simulation
./start-test-servers.sh

# Stop with Ctrl+C
```

## Server Configuration

Currently simulates 4 MCP servers:
- `mcp-server-1:8911`
- `mcp-server-2:8912`
- `mcp-server-3:8911`
- `mcp-server-4:8914`

## Timing Sequence

1. **T=0s**: Server 1 starts
2. **T=10s**: Server 2 starts
3. **T=20s**: Server 3 starts
4. **T=30s**: Server 4 starts
5. **T=30s-60s**: All servers running
6. **T=60s**: All servers shut down
7. **T=70s**: Cycle repeats

## Integration with UI

Run this script alongside the Rancher UI to test:
- Real-time server discovery
- Table updates every 5 seconds
- Server lifecycle visualization
- Registration button functionality

## Technical Details

- Uses background processes to simulate server instances
- Stores PIDs in `/tmp/mcp-demo-pids/` for process management
- Handles SIGINT/SIGTERM for clean shutdown
- Compatible with bash shell environments