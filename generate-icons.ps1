# Generate all app icons from app-logo.png
Add-Type -AssemblyName System.Drawing

$sourcePath = "public\icons\app-logo.png"
$sourceImage = [System.Drawing.Image]::FromFile((Resolve-Path $sourcePath))

# Icon sizes needed
$sizes = @(
    @{Size=16; Name="public\favicon-16.png"},
    @{Size=32; Name="public\favicon-32.png"},
    @{Size=192; Name="public\icons\icon-192.png"},
    @{Size=512; Name="public\icons\icon-512.png"},
    @{Size=512; Name="public\icons\icon-512-maskable.png"},
    @{Size=180; Name="public\icons\apple-touch-icon.png"},
    @{Size=192; Name="android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png"},
    @{Size=192; Name="android\app\src\main\res\mipmap-xxxhdpi\ic_launcher_round.png"},
    @{Size=144; Name="android\app\src\main\res\mipmap-xxhdpi\ic_launcher.png"},
    @{Size=144; Name="android\app\src\main\res\mipmap-xxhdpi\ic_launcher_round.png"},
    @{Size=96; Name="android\app\src\main\res\mipmap-xhdpi\ic_launcher.png"},
    @{Size=96; Name="android\app\src\main\res\mipmap-xhdpi\ic_launcher_round.png"},
    @{Size=72; Name="android\app\src\main\res\mipmap-hdpi\ic_launcher.png"},
    @{Size=72; Name="android\app\src\main\res\mipmap-hdpi\ic_launcher_round.png"},
    @{Size=48; Name="android\app\src\main\res\mipmap-mdpi\ic_launcher.png"},
    @{Size=48; Name="android\app\src\main\res\mipmap-mdpi\ic_launcher_round.png"}
)

foreach ($item in $sizes) {
    $size = $item.Size
    $output = $item.Name
    
    # Create directory if it doesn't exist
    $dir = Split-Path $output
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    
    # Resize image
    $newImage = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($newImage)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($sourceImage, 0, 0, $size, $size)
    $graphics.Dispose()
    
    # Save
    $newImage.Save((Join-Path (Get-Location) $output), [System.Drawing.Imaging.ImageFormat]::Png)
    $newImage.Dispose()
    
    Write-Host "Generated $output ($size px)"
}

$sourceImage.Dispose()
Write-Host "All icons generated successfully!"
