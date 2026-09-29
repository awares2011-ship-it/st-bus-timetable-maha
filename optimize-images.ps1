# Optimize PNG images to reduce file size
Add-Type -AssemblyName System.Drawing

$files = Get-ChildItem "public\icons\*.png" -File

foreach ($file in $files) {
    $img = [System.Drawing.Image]::FromFile($file.FullName)
    
    # Skip if already small enough
    if ($file.Length -lt 500KB) {
        Write-Host "Skipping $($file.Name) - already optimized"
        $img.Dispose()
        continue
    }
    
    # Calculate new size (reduce to 800px max dimension while maintaining aspect ratio)
    $maxSize = 800
    $width = $img.Width
    $height = $img.Height
    
    if ($width -gt $maxSize -or $height -gt $maxSize) {
        if ($width -gt $height) {
            $newWidth = $maxSize
            $newHeight = [int]($height * ($maxSize / $width))
        } else {
            $newHeight = $maxSize
            $newWidth = [int]($width * ($maxSize / $height))
        }
    } else {
        $newWidth = $width
        $newHeight = $height
    }
    
    # Create optimized image
    $newImg = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
    $graphics = [System.Drawing.Graphics]::FromImage($newImg)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.DrawImage($img, 0, 0, $newWidth, $newHeight)
    $graphics.Dispose()
    
    # Save with compression
    $encoder = [System.Drawing.Imaging.Encoder]::Quality
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($encoder, 85L)
    $codecInfo = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/png' }
    
    $tempPath = "$($file.FullName).tmp"
    $newImg.Save($tempPath, $codecInfo, $encoderParams)
    $newImg.Dispose()
    $img.Dispose()
    
    # Replace original
    Move-Item -Path $tempPath -Destination $file.FullName -Force
    
    $newSize = (Get-Item $file.FullName).Length
    Write-Host "Optimized $($file.Name): $([math]::Round($file.Length/1MB,2)) MB -> $([math]::Round($newSize/1KB,0)) KB"
}

Write-Host "Image optimization complete!"
