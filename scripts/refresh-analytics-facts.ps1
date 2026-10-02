[CmdletBinding()]
param(
    [string]$BaseUrl = 'https://gongbueong.career.co.kr:9988',
    [string]$WorkerKey = $env:ANALYTICS_FACT_WORKER_KEY,
    [ValidateRange(1, 3600)]
    [int]$TimeoutSec = 330,
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
$expectedRelease = '20261002-career-excluded-v2'
try {
    $release = Invoke-RestMethod -Method Get -Uri $uri -TimeoutSec 15 -ErrorAction Stop
    if ($null -eq $release -or $null -eq $release.PSObject.Properties['release'] -or
        $release.release -ne $expectedRelease) {
        throw 'The running admin build does not match this script.'
    }
} catch {
    throw "Release check failed; no refresh was started. Build and restart the admin instance serving port 9988, then retry. $($_.Exception.Message)"
}
Write-Host "Confirmed admin release: $expectedRelease"
$total = 0

for ($requestNumber = 1; $requestNumber -le $MaxRequests; $requestNumber++) {
    $result = $null
    try {
        $result = Invoke-RestMethod -Method Post -Uri $uri -Headers @{
            'x-analytics-fact-worker-key' = $WorkerKey
        } -TimeoutSec $TimeoutSec -ErrorAction Stop

        if ($null -ne $result -and $null -ne $result.PSObject.Properties['ok'] -and $result.ok -eq $false) {
            throw ($result | ConvertTo-Json -Compress -Depth 4)
        }
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
    foreach ($job in $result.processed) {
        Write-Host "  $($job.scope) / $($job.day)"
    }

    if ($count -eq 0) {
        Write-Host 'No currently claimable jobs. Delayed or locked jobs may remain; check analytics_fact_refresh_queue.'
        return
    }

    Start-Sleep -Milliseconds 500
}

throw "Stopped after $MaxRequests requests. The queue may still contain work."
