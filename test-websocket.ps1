# Simple WebSocket Test Script for EPIC 62 Streaming
# Run with: powershell -ExecutionPolicy Bypass -File test-websocket.ps1

Write-Host "Connecting to WebSocket on ws://localhost:8765..."
Write-Host ""

$ws = New-Object System.Net.WebSockets.ClientWebSocket
$cts = New-Object System.Threading.CancellationTokenSource
$cts.CancelAfter([timespan]::FromSeconds(30))

try {
    $ws.ConnectAsync('ws://localhost:8765', $cts.Token).Wait()
    Write-Host "Connected to broadcast server!"
    Write-Host ""
    Write-Host "Listening for messages (30 seconds)..."
    Write-Host "================================================================"
    Write-Host ""

    $buffer = New-Object byte[] 4096
    $receiveCount = 0

    while ($ws.State -eq 'Open' -and -not $cts.Token.IsCancellationRequested) {
        try {
            $received = $ws.ReceiveAsync($buffer, [System.Threading.CancellationToken]::None)

            if ($received.Wait(1000)) {
                $result = $received.Result
                if ($result.Count -gt 0) {
                    $message = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count)
                    $json = $message | ConvertFrom-Json

                    $receiveCount++
                    Write-Host "[$receiveCount] Message Type: $($json.type)"
                    Write-Host "    Timestamp: $($json.timestamp)"

                    if ($json.payload.speaker) {
                        Write-Host "    Speaker: $($json.payload.speaker)"
                        Write-Host "    Message: $($json.payload.message)"
                    }
                    if ($json.payload.eventType) {
                        Write-Host "    Event: $($json.payload.eventType)"
                        Write-Host "    Tick: $($json.payload.tick)"
                    }
                    if ($json.payload.players) {
                        Write-Host "    Players: $($json.payload.players.Count)"
                    }
                    Write-Host ""
                }
            }
        } catch {
            # Timeout or error, continue
        }
    }

    Write-Host "================================================================"
    Write-Host "Received $receiveCount messages"
    Write-Host ""

} catch {
    Write-Host "Connection failed: $_"
} finally {
    if ($ws.State -eq 'Open') {
        $ws.CloseAsync([System.Net.WebSocketCloseStatus]::Normal, "Closing", [System.Threading.CancellationToken]::None).Wait()
    }
    $ws.Dispose()
    $cts.Dispose()
}
