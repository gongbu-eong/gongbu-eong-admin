[CmdletBinding()]
param(
    [string]$BaseUrl = 'https://gongbueong.career.co.kr:9988',
    [string]$WorkerKey = $env:ANALYTICS_FACT_WORKER_KEY,
    [ValidateRange(1, 3600)]
    [int]$TimeoutSec = 90,
    [ValidateRange(1, 100000)]
    [int]$MaxRequests = 1000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($WorkerKey)) {
    throw 'Set ANALYTICS_FACT_WORKER_KEY or pass -WorkerKey. Do not put the key in this script.'
}

$baseUri = $null
if (-not [Uri]::TryCreate($BaseUrl, [UriKind]::Absolute, [ref]$baseUri) -or
    $baseUri.Scheme -notin @('http', 'https') -or $baseUri.UserInfo -or
    $baseUri.Query -or $baseUri.Fragment -or $baseUri.AbsolutePath -ne '/') {
    throw 'BaseUrl must be a plain origin, for example https://gongbueong.career.co.kr:9988 (not a Markdown link).'
}

$uri = $baseUri.GetLeftPart([UriPartial]::Authority) + '/api/internal/analytics/facts/process?limit=1'
$total = 0

for ($requestNumber = 1; $requestNumber -le $MaxRequests; $requestNumber++) {
    $result = $null
    try {
        $result = Invoke-RestMethod -Method Post -Uri $uri -Headers @{
            'x-analytics-fact-worker-key' = $WorkerKey
        } -TimeoutSec $TimeoutSec -ErrorAction Stop

        if ($null -eq $result -or $null -eq $result.PSObject.Properties['ok'] -or
            $result.ok -ne $true -or $null -eq $result.PSObject.Properties['processed'] -or
            $result.processed -isnot [System.Array]) {
            throw 'The worker returned an invalid or unsuccessful response.'
        }
    } catch {
        Write-Warning "Request $requestNumber failed. Confirmed completed jobs: $total. This is NOT a zero-job success."
        Write-Warning 'The server may still be processing this request. Inspect queue locks/errors before retrying; do not clear active locks.'
        throw
    }

    $count = $result.processed.Count
    $total += $count
    Write-Host "Request ${requestNumber}: completed $count job(s), confirmed total $total."

    if ($count -eq 0) {
        Write-Host 'No currently claimable jobs. Delayed or locked jobs may remain; check analytics_fact_refresh_queue.'
        return
    }

    Start-Sleep -Milliseconds 500
}

throw "Stopped after $MaxRequests requests. The queue may still contain work."
