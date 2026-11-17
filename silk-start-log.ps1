# CUSTOM (Forge Neo): one line in ..\forge-starts.log every time webui.bat runs, saying what
# started it and which Forges were already running (webui.bat closes those next). Shared with
# Forge Remote and the forge-neo Claude plugin, so a duplicate Forge can be traced to its launcher.
# Logging only: any failure here is ignored and Forge starts as usual.
try {
    $here = Split-Path -Parent $MyInvocation.MyCommand.Path
    $log = Join-Path (Split-Path -Parent $here) 'forge-starts.log'

    # Who started this: walk up from this PowerShell past the cmd windows running the .bat files.
    $chain = @()
    $id = (Get-CimInstance Win32_Process -Filter "ProcessId = $PID").ParentProcessId
    for ($i = 0; $i -lt 5 -and $id; $i++) {
        $p = Get-CimInstance Win32_Process -Filter "ProcessId = $id"
        if (-not $p) { break }
        $cmd = if ($p.CommandLine) { $p.CommandLine.Trim() } else { $p.Name }
        if ($cmd.Length -gt 140) { $cmd = $cmd.Substring(0, 140) + '...' }
        $chain += "$($p.Name)[$($p.ProcessId)]: $cmd"
        if ($p.Name -notmatch '^(cmd|conhost)\.exe$') { break }   # first non-cmd ancestor is the launcher
        $id = $p.ParentProcessId
    }

    $running = @(Get-CimInstance Win32_Process -Filter "Name='python.exe'" |
        Where-Object { $_.CommandLine -like '*launch.py*' -and $_.CommandLine -like "*$here*" })
    $ports = @(Get-NetTCPConnection -State Listen -LocalPort 7860, 7861 -ErrorAction SilentlyContinue |
        ForEach-Object { "$($_.LocalPort)=pid $($_.OwningProcess)" }) -join ', '
    $already = if ($running.Count) {
        "already running: $($running.Count) Forge process(es) [$(($running.ProcessId) -join ', ')]$(if ($ports) { "; listening $ports" }) - closing them"
    } else { 'none was running' }

    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') | webui.bat | started Forge; $already | started by: $($chain -join ' <- ')"
    Add-Content -Path $log -Value $line -Encoding utf8
} catch { }
