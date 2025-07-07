# CV Landing Page Generator - Simple Code Collector
# Usage: .\collect-code.ps1

$OutputFile = "unified-codebase.txt"
$ProjectRoot = Get-Location
$StartTime = Get-Date
$TotalFiles = 0

# Initialize output with array to avoid file lock issues
$Output = @()
$Output += "CV LANDING PAGE GENERATOR - UNIFIED CODEBASE"
$Output += "Generated: $(Get-Date)"
$Output += "Project Root: $ProjectRoot"
$Output += "========================================"
$Output += ""

Write-Host "CV Landing Page Generator Code Collector"
Write-Host "Project Root: $ProjectRoot"
Write-Host "Output File: $OutputFile"
Write-Host ""

# File extensions to include
$Extensions = @("*.ts", "*.js", "*.html", "*.css", "*.scss", "*.json", "*.sql", "*.md", "*.example", "*.gitignore", "*.template")

# Directories to exclude
$ExcludeDirs = @("node_modules", "dist", "build", ".git", ".angular", "coverage", "uploads")

# Files to exclude  
$ExcludeFiles = @("package-lock.json", "yarn.lock", "*.log", "*.tmp", "*.map", ".DS_Store", "*.env", ".env.local", ".env.production")

# Directories to scan
$ScanDirs = @(".", "frontend", "api", "templates", "lib", "database")

foreach ($Dir in $ScanDirs) {
    $DirPath = Join-Path $ProjectRoot $Dir
    
    if (Test-Path $DirPath) {
        Write-Host "Scanning: $Dir"
        
        $Output += "====================================="
        $Output += "DIRECTORY: $Dir"
        $Output += "PATH: $DirPath"
        $Output += "====================================="
        $Output += ""
        
        # Get files
        $Files = @()
        if ($Dir -eq ".") {
            # For root directory, get files directly (not recursive)
            foreach ($Ext in $Extensions) {
                $Files += Get-ChildItem -Path $DirPath -File -Filter $Ext -ErrorAction SilentlyContinue
            }
        }
        else {
            # For subdirectories, scan recursively
            foreach ($Ext in $Extensions) {
                $Files += Get-ChildItem -Path $DirPath -Recurse -File -Filter $Ext -ErrorAction SilentlyContinue
            }
        }
        
        # Filter out excluded files and directories
        $FilteredFiles = @()
        foreach ($File in $Files) {
            $ShouldExclude = $false
            
            # Check excluded directories
            foreach ($ExcludeDir in $ExcludeDirs) {
                if ($File.FullName -like "*\$ExcludeDir\*") {
                    $ShouldExclude = $true
                    break
                }
            }
            
            # Check excluded files
            if (-not $ShouldExclude) {
                foreach ($ExcludeFile in $ExcludeFiles) {
                    if ($File.Name -like $ExcludeFile) {
                        $ShouldExclude = $true
                        break
                    }
                }
            }
            
            # Check file size
            if (-not $ShouldExclude -and $File.Length -lt 1MB) {
                $FilteredFiles += $File
            }
        }
        
        # Process each file
        foreach ($File in $FilteredFiles) {
            try {
                $RelativePath = $File.FullName.Replace("$ProjectRoot\", "")
                $FileSize = [math]::Round($File.Length / 1KB, 1)
                
                Write-Host "  Processing: $RelativePath ($FileSize KB)"
                
                $Output += "--------------------------------------------------------------------------------"
                $Output += "FILE: $RelativePath"
                $Output += "SIZE: $($File.Length) bytes ($FileSize KB)"
                $Output += "--------------------------------------------------------------------------------"
                
                # Read file content
                $FileContent = Get-Content -Path $File.FullName -Encoding UTF8 -ErrorAction Stop
                $Output += $FileContent
                
                $Output += ""
                $Output += "[END OF FILE: $RelativePath]"
                $Output += ""
                
                $TotalFiles++
            }
            catch {
                Write-Host "  Error reading: $($File.Name)"
                $Output += "ERROR reading file: $($File.FullName)"
                $Output += ""
            }
        }
        
        Write-Host "  Found $($FilteredFiles.Count) files"
    }
    else {
        Write-Host "Directory not found: $Dir"
    }
}

# Add summary
$Output += "========================================"
$Output += "COLLECTION SUMMARY"
$Output += "========================================"
$Output += "Total Files Processed: $TotalFiles"
$Output += "Generated: $(Get-Date)"
$Output += "Processing Time: $((Get-Date) - $StartTime)"

# Write all output to file at once
$Output | Out-File -FilePath $OutputFile -Encoding UTF8

# Get file stats
$OutputInfo = Get-Item $OutputFile
$OutputSizeMB = [math]::Round($OutputInfo.Length / 1MB, 2)

Write-Host ""
Write-Host "Collection completed successfully!"
Write-Host "Total files processed: $TotalFiles"
Write-Host "Output file: $OutputFile ($OutputSizeMB MB)"
Write-Host "Processing time: $((Get-Date) - $StartTime)"
Write-Host ""
Write-Host "Ready to paste to Claude!"