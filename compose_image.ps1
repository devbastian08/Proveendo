Add-Type -AssemblyName System.Drawing

$bgPath = "C:\Users\sebastian\.gemini\antigravity\brain\624dc414-f6b2-4457-9699-27d4a4e649f7\proveendo_blank_background_1788195839753.jpg"
$logoPath = "C:\Users\sebastian\.gemini\antigravity\brain\624dc414-f6b2-4457-9699-27d4a4e649f7\.user_uploaded\media_1788197098229.png"
$outPath = "C:\Users\sebastian\.gemini\antigravity\brain\624dc414-f6b2-4457-9699-27d4a4e649f7\proveendo_final_slide.jpg"

try {
    $bg = [System.Drawing.Image]::FromFile($bgPath)
    $logo = [System.Drawing.Image]::FromFile($logoPath)
    
    $bmp = New-Object System.Drawing.Bitmap($bg.Width, $bg.Height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # High quality drawing
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    # Draw background
    $g.DrawImage($bg, 0, 0, $bg.Width, $bg.Height)
    
    # Scale logo
    # The background is probably 16:9 (e.g., 3840x2160 or 1920x1080)
    # The logo is vertical, we need to make it fit nicely in the center.
    $targetLogoHeight = [int]($bg.Height * 0.25)
    $targetLogoWidth = [int]($logo.Width * ($targetLogoHeight / $logo.Height))
    
    # Position (Center X, slightly above center Y)
    $x = [int](($bg.Width - $targetLogoWidth) / 2)
    $y = [int](($bg.Height - $targetLogoHeight) / 2) - [int]($bg.Height * 0.1)
    
    # Draw logo
    $g.DrawImage($logo, $x, $y, $targetLogoWidth, $targetLogoHeight)
    
    # Draw text "ProvEEndo" below the logo
    $font = New-Object System.Drawing.Font("Segoe UI", [float]($bg.Height * 0.08), [System.Drawing.FontStyle]::Bold)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#4a6c6f"))
    
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    
    $textY = $y + $targetLogoHeight + [int]($bg.Height * 0.05)
    
    $rect = New-Object System.Drawing.RectangleF(0, $textY, $bg.Width, [float]($bg.Height * 0.2))
    $g.DrawString("ProvEEndo", $font, $brush, $rect, $format)
    
    # Save
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    
    Write-Host "Success"
} catch {
    Write-Host "Error: $_"
} finally {
    if ($g) { $g.Dispose() }
    if ($bmp) { $bmp.Dispose() }
    if ($bg) { $bg.Dispose() }
    if ($logo) { $logo.Dispose() }
}
