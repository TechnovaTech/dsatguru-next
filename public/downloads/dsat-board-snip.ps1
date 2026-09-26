# DsatGuru / IGCSC - Board Snip helper
#
# Windows already has a perfectly good snipping tool (Win+Shift+S) and it puts
# what you grab on the clipboard. A web page cannot read that clipboard unless
# its tab is in front, and it can never see another window at all - so this
# little watcher does the last hop: any new image on your clipboard is sent
# straight to the whiteboard you linked it to.
#
# Nothing is installed. Close the window and it stops.
#
# Placeholders below are filled in by the site when you copy the command.

$Code = '__CODE__'
$Api  = '__API__'
$Boot = '__BOOT__'
$Room = '__ROOM__'

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Reading the clipboard needs a single-threaded apartment. PowerShell 7 starts
# in MTA, so hand the job to a window that can actually do it.
if ([Threading.Thread]::CurrentThread.GetApartmentState() -ne 'STA') {
    Write-Host 'Opening a clipboard-capable PowerShell window...' -ForegroundColor Yellow
    Start-Process powershell.exe -ArgumentList @(
        '-STA', '-NoExit', '-ExecutionPolicy', 'Bypass',
        '-Command', "irm '$Boot' | iex"
    )
    return
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Get-ImageBytes($img) {
    # The board never needs more than about 1600px, and a 4K grab is megabytes.
    $max = 1600
    $scale = [Math]::Min(1.0, $max / [Math]::Max($img.Width, $img.Height))
    $src = $img
    $tmp = $null
    if ($scale -lt 1.0) {
        $nw = [int]($img.Width * $scale)
        $nh = [int]($img.Height * $scale)
        $tmp = New-Object System.Drawing.Bitmap $nw, $nh
        $g = [System.Drawing.Graphics]::FromImage($tmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.DrawImage($img, 0, 0, $nw, $nh)
        $g.Dispose()
        $src = $tmp
    }
    $ms = New-Object System.IO.MemoryStream
    $src.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $ms.ToArray()
    $ms.Dispose()
    if ($tmp) { $tmp.Dispose() }
    return $bytes
}

function Get-Fingerprint($bytes) {
    $md5 = [System.Security.Cryptography.MD5]::Create()
    return [BitConverter]::ToString($md5.ComputeHash($bytes))
}

function Read-Clip {
    try {
        if (-not [System.Windows.Forms.Clipboard]::ContainsImage()) { return $null }
        return [System.Windows.Forms.Clipboard]::GetImage()
    } catch {
        # Another app can hold the clipboard open for a moment; just try again.
        return $null
    }
}

Clear-Host
Write-Host ''
Write-Host '  Board Snip - DsatGuru' -ForegroundColor Cyan
Write-Host '  ---------------------'
Write-Host "  Linked to room : $Room"
Write-Host "  Code           : $Code"
Write-Host ''
Write-Host '  Press Win+Shift+S anywhere - any screen, any app, any game.' -ForegroundColor Green
Write-Host '  Drag over what you want. It appears on the whiteboard.' -ForegroundColor Green
Write-Host ''
Write-Host '  While this is running, ANY image you copy goes to the board.' -ForegroundColor Yellow
Write-Host '  [P] pause / resume      [Q] quit' -ForegroundColor DarkGray
Write-Host ''

# Whatever is already on the clipboard is not a new snip - remember it so the
# first thing sent is something you actually grabbed after starting up.
$last = ''
$startImg = Read-Clip
if ($startImg) {
    try { $last = Get-Fingerprint (Get-ImageBytes $startImg) } catch { }
    $startImg.Dispose()
}

$paused = $false
$sent = 0

while ($true) {
    if ([Console]::KeyAvailable) {
        $key = [Console]::ReadKey($true).Key
        if ($key -eq 'Q') { Write-Host ''; Write-Host '  Stopped.' -ForegroundColor DarkGray; break }
        if ($key -eq 'P') {
            $paused = -not $paused
            if ($paused) { Write-Host '  Paused - nothing is being sent.' -ForegroundColor Yellow }
            else         { Write-Host '  Watching again.' -ForegroundColor Green }
        }
    }

    if (-not $paused) {
        $img = Read-Clip
        if ($img) {
            try {
                $bytes = Get-ImageBytes $img
                $fp = Get-Fingerprint $bytes
                if ($fp -ne $last) {
                    $last = $fp
                    $b64 = [Convert]::ToBase64String($bytes)
                    $body = @{ code = $Code; image = "data:image/png;base64,$b64" } | ConvertTo-Json -Compress
                    try {
                        Invoke-RestMethod -Uri $Api -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 60 | Out-Null
                        $sent++
                        Write-Host ("  [{0}] Sent to the board  ({1} KB)" -f $sent, [int]($bytes.Length / 1024)) -ForegroundColor Cyan
                    } catch {
                        $msg = $_.Exception.Message
                        try {
                            $r = $_.Exception.Response.GetResponseStream()
                            $msg = (New-Object System.IO.StreamReader($r)).ReadToEnd()
                        } catch { }
                        Write-Host "  Could not send: $msg" -ForegroundColor Red
                    }
                }
            } catch {
                Write-Host "  Skipped that one: $($_.Exception.Message)" -ForegroundColor DarkYellow
            } finally {
                $img.Dispose()
            }
        }
    }

    Start-Sleep -Milliseconds 700
}
