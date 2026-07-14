# Get debug data from AI Commander API endpoints
# Usage: .\get-debug-data.ps1

param(
    [string]$Endpoint = "world-state",  # world-state or camera-test
    [string]$SaveFile = $true
)

$baseUrl = "http://localhost:8080/api/debug"

Write-Host "Fetching $Endpoint data..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/$Endpoint" -UseBasicParsing
    $data = $response.Content

    # Pretty print the JSON
    $json = $data | ConvertFrom-Json
    $prettyJson = $json | ConvertTo-Json -Depth 100

    Write-Host $prettyJson

    # Save to file
    if ($SaveFile -eq "true" -or $SaveFile -eq $true) {
        $filename = "debug-$Endpoint-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').json"
        $prettyJson | Out-File -FilePath $filename -Encoding UTF8
        Write-Host "`nSaved to: $filename" -ForegroundColor Green
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Make sure the arena is running: npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts" -ForegroundColor Yellow
}
