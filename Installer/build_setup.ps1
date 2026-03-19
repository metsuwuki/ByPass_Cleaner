param(
    [string]$AppVersion = "1.0.0"
)

$ErrorActionPreference = "Stop"

function New-InstallerBrandingAssets {
    param(
        [string]$AssetsDir,
        [string]$WizardImagePath,
        [string]$WizardSmallImagePath,
        [string]$LogoPath,
        [string]$IconPath
    )

    if ((Test-Path $WizardImagePath) -and (Test-Path $WizardSmallImagePath)) {
        return
    }

    try {
        Add-Type -AssemblyName System.Drawing -ErrorAction Stop
    }
    catch {
        throw "System.Drawing is not available. Cannot generate installer branding images."
    }

    New-Item -Path $AssetsDir -ItemType Directory -Force | Out-Null

    $brandImagePath = $null
    if (Test-Path $LogoPath) {
        $brandImagePath = $LogoPath
    }
    elseif (Test-Path $IconPath) {
        $brandImagePath = $IconPath
    }

    # Build 164x314 side image for Inno Setup wizard.
    $wizardBitmap = New-Object System.Drawing.Bitmap 164, 314
    $wizardGraphics = [System.Drawing.Graphics]::FromImage($wizardBitmap)
    $wizardBrush = $null
    $wizardAccentBrush = $null
    $titleFont = $null
    $subtitleFont = $null
    $titleBrush = $null
    $subtitleBrush = $null
    try {
        $wizardGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $wizardGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $wizardGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

        $wizardRect = New-Object System.Drawing.Rectangle(0, 0, 164, 314)
        $wizardBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            $wizardRect,
            [System.Drawing.Color]::FromArgb(19, 32, 51),
            [System.Drawing.Color]::FromArgb(34, 111, 144),
            [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
        )
        $wizardGraphics.FillRectangle($wizardBrush, $wizardRect)

        $wizardAccentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(55, 255, 255, 255))
        $wizardGraphics.FillEllipse($wizardAccentBrush, -72, 204, 246, 246)

        if ($brandImagePath) {
            $brandImage = [System.Drawing.Image]::FromFile($brandImagePath)
            try {
                $maxWidth = 112
                $maxHeight = 112
                $scale = [Math]::Min($maxWidth / $brandImage.Width, $maxHeight / $brandImage.Height)
                if ($scale -gt 1) {
                    $scale = 1
                }

                $drawWidth = [int][Math]::Round($brandImage.Width * $scale)
                $drawHeight = [int][Math]::Round($brandImage.Height * $scale)
                $drawX = [int](($wizardRect.Width - $drawWidth) / 2)
                $drawY = 24
                $wizardGraphics.DrawImage($brandImage, $drawX, $drawY, $drawWidth, $drawHeight)
            }
            finally {
                $brandImage.Dispose()
            }
        }

        $titleFont = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        $subtitleFont = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
        $titleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(248, 248, 248))
        $subtitleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(222, 236, 244))
        $wizardGraphics.DrawString("ByPass", $titleFont, $titleBrush, 12, 182)
        $wizardGraphics.DrawString("Cleaner", $titleFont, $titleBrush, 12, 210)
        $wizardGraphics.DrawString("Safe cleanup utility", $subtitleFont, $subtitleBrush, 12, 244)

        $wizardBitmap.Save($WizardImagePath, [System.Drawing.Imaging.ImageFormat]::Bmp)
    }
    finally {
        if ($subtitleBrush) {
            $subtitleBrush.Dispose()
        }
        if ($titleBrush) {
            $titleBrush.Dispose()
        }
        if ($subtitleFont) {
            $subtitleFont.Dispose()
        }
        if ($titleFont) {
            $titleFont.Dispose()
        }
        if ($wizardAccentBrush) {
            $wizardAccentBrush.Dispose()
        }
        if ($wizardBrush) {
            $wizardBrush.Dispose()
        }
        if ($wizardGraphics) {
            $wizardGraphics.Dispose()
        }
        if ($wizardBitmap) {
            $wizardBitmap.Dispose()
        }
    }

    # Build 55x55 small image for the wizard header area.
    $smallBitmap = New-Object System.Drawing.Bitmap 55, 55
    $smallGraphics = [System.Drawing.Graphics]::FromImage($smallBitmap)
    $smallBrush = $null
    $smallAccentBrush = $null
    try {
        $smallGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $smallGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $smallGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

        $smallRect = New-Object System.Drawing.Rectangle(0, 0, 55, 55)
        $smallBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            $smallRect,
            [System.Drawing.Color]::FromArgb(28, 58, 92),
            [System.Drawing.Color]::FromArgb(42, 131, 168),
            [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
        )
        $smallGraphics.FillRectangle($smallBrush, $smallRect)

        $smallAccentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 255, 255, 255))
        $smallGraphics.FillEllipse($smallAccentBrush, -12, 30, 70, 40)

        if ($brandImagePath) {
            $smallBrandImage = [System.Drawing.Image]::FromFile($brandImagePath)
            try {
                $maxWidth = 34
                $maxHeight = 34
                $scale = [Math]::Min($maxWidth / $smallBrandImage.Width, $maxHeight / $smallBrandImage.Height)
                if ($scale -gt 1) {
                    $scale = 1
                }

                $drawWidth = [int][Math]::Round($smallBrandImage.Width * $scale)
                $drawHeight = [int][Math]::Round($smallBrandImage.Height * $scale)
                $drawX = [int](($smallRect.Width - $drawWidth) / 2)
                $drawY = [int](($smallRect.Height - $drawHeight) / 2)
                $smallGraphics.DrawImage($smallBrandImage, $drawX, $drawY, $drawWidth, $drawHeight)
            }
            finally {
                $smallBrandImage.Dispose()
            }
        }

        $smallBitmap.Save($WizardSmallImagePath, [System.Drawing.Imaging.ImageFormat]::Bmp)
    }
    finally {
        if ($smallAccentBrush) {
            $smallAccentBrush.Dispose()
        }
        if ($smallBrush) {
            $smallBrush.Dispose()
        }
        if ($smallGraphics) {
            $smallGraphics.Dispose()
        }
        if ($smallBitmap) {
            $smallBitmap.Dispose()
        }
    }

    Write-Host "Generated installer branding images in: $AssetsDir"
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$tauriExe = Join-Path $projectRoot "src-tauri\target\release\bypass-cleaner.exe"
$issFile = Join-Path $PSScriptRoot "ByPass Cleaner.iss"
$assetsDir = Join-Path $PSScriptRoot "Assets"
$wizardImagePath = Join-Path $assetsDir "wizard.bmp"
$wizardSmallImagePath = Join-Path $assetsDir "wizard_small.bmp"
$logoPath = Join-Path $projectRoot "Utils\logo.png"
$iconPath = Join-Path $projectRoot "src-tauri\icons\icon.png"

if (-not (Test-Path $tauriExe)) {
    throw "Missing file: $tauriExe. Build the app EXE first with 'tauri build'."
}

if (-not (Test-Path $issFile)) {
    throw "Missing file: $issFile"
}

New-InstallerBrandingAssets `
    -AssetsDir $assetsDir `
    -WizardImagePath $wizardImagePath `
    -WizardSmallImagePath $wizardSmallImagePath `
    -LogoPath $logoPath `
    -IconPath $iconPath

$iscc = $null
$command = Get-Command ISCC.exe -ErrorAction SilentlyContinue
if ($command) {
    $iscc = $command.Source
}

if (-not $iscc) {
    $appPathKeys = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\ISCC.exe',
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\ISCC.exe',
        'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\ISCC.exe'
    )

    foreach ($key in $appPathKeys) {
        if (-not (Test-Path $key)) {
            continue
        }

        $props = Get-ItemProperty -Path $key -ErrorAction SilentlyContinue
        if ($props.'(default)' -and (Test-Path $props.'(default)')) {
            $iscc = $props.'(default)'
            break
        }

        if ($props.Path) {
            $candidateFromReg = Join-Path $props.Path 'ISCC.exe'
            if (Test-Path $candidateFromReg) {
                $iscc = $candidateFromReg
                break
            }
        }
    }
}

if (-not $iscc) {
    $candidates = @(
        "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
        "$env:LOCALAPPDATA\Programs\Inno Setup\ISCC.exe",
        "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
        "C:\Program Files\Inno Setup 6\ISCC.exe"
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            $iscc = $candidate
            break
        }
    }
}

if (-not $iscc) {
    throw "ISCC.exe was not found. Install Inno Setup 6 and retry."
}

Push-Location $PSScriptRoot
try {
    & $iscc "/DMyAppVersion=$AppVersion" "ByPass Cleaner.iss"
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}

$setupFile = Join-Path $PSScriptRoot "Output\ByPass Cleaner Setup.exe"
if (Test-Path $setupFile) {
    Write-Host "Setup build complete: $setupFile"
}
