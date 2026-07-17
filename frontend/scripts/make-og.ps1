Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..")
Set-Location $root

function New-Og([string]$outName, [scriptblock]$drawText) {
  $out = Join-Path $root "public\image\$outName"
  $w = 1200; $h = 630
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = "HighQuality"
  $g.InterpolationMode = "HighQualityBicubic"
  $g.TextRenderingHint = "ClearTypeGridFit"
  $g.Clear([System.Drawing.Color]::FromArgb(7, 10, 18))

  $redSoft = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(55, 225, 29, 46))
  $blueSoft = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(40, 26, 108, 255))
  $goldSoft = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(35, 245, 197, 66))
  $g.FillEllipse($redSoft, -120, -180, 620, 520)
  $g.FillEllipse($blueSoft, 780, 280, 520, 420)
  $g.FillEllipse($goldSoft, 520, -80, 380, 280)

  $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(225, 29, 46))), 0, 0, 8, $h)
  $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245, 197, 66))), 8, 0, 5, $h)
  $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(26, 108, 255))), 13, 0, 5, $h)
  $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(180, 245, 197, 66))), 40, $h - 3, $w - 80, 2)

  $logo = [System.Drawing.Image]::FromFile((Join-Path $root "public\image\logo.png"))
  $halo = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(70, 245, 197, 66))
  $g.FillEllipse($halo, 52, 137, 356, 356)
  $g.DrawImage($logo, 70, 155, 320, 320)
  $logo.Dispose()

  $spider = [System.Drawing.Image]::FromFile((Join-Path $root "public\image\aranha.png"))
  $ia = [System.Drawing.Imaging.ImageAttributes]::new()
  $cm = New-Object System.Drawing.Imaging.ColorMatrix
  $cm.Matrix33 = 0.12
  $ia.SetColorMatrix($cm)
  $g.DrawImage($spider, (New-Object System.Drawing.Rectangle 940, 410, 190, 190), 0, 0, $spider.Width, $spider.Height, "Pixel", $ia)
  $spider.Dispose(); $ia.Dispose()

  & $drawText $g

  $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
  $params = New-Object System.Drawing.Imaging.EncoderParameters 1
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 90L
  $bmp.Save($out, $jpegCodec, $params)
  $g.Dispose(); $bmp.Dispose()
  Write-Host "wrote $out"
}

New-Og "og-spiderman.jpg" {
  param($g)
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245, 245, 250))
  $gold = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245, 197, 66))
  $red = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(225, 29, 46))
  $muted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(170, 178, 198))
  $fKicker = [System.Drawing.Font]::new("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
  $fBrand = [System.Drawing.Font]::new("Segoe UI", 46, [System.Drawing.FontStyle]::Bold)
  $fFilm = [System.Drawing.Font]::new("Segoe UI", 26, [System.Drawing.FontStyle]::Bold)
  $fMeta = [System.Drawing.Font]::new("Segoe UI", 20, [System.Drawing.FontStyle]::Regular)
  $tx = 440
  $g.DrawString("GERAÇÃO EUCARÍSTICA", $fKicker, $gold, $tx, 145)
  $g.DrawString("CineGeração", $fBrand, $red, $tx, 185)
  $g.DrawString("Homem-Aranha: Um novo dia", $fFilm, $white, $tx, 270)
  $pill = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(50, 245, 197, 66))
  $g.FillRectangle($pill, $tx, 330, 360, 48)
  $g.DrawString("2 de agosto  ·  18h10", $fMeta, $gold, ($tx + 18), 338)
  $g.DrawString("Cinema MaxiMovie  ·  Saquarema/RJ", $fMeta, $muted, $tx, 400)
  $g.DrawString("Pipoca + Guaravita inclusos", $fMeta, $muted, $tx, 440)
}

New-Og "og-admin.jpg" {
  param($g)
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245, 245, 250))
  $gold = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245, 197, 66))
  $red = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(225, 29, 46))
  $muted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(170, 178, 198))
  $fKicker = [System.Drawing.Font]::new("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
  $fBrand = [System.Drawing.Font]::new("Segoe UI", 46, [System.Drawing.FontStyle]::Bold)
  $fSub = [System.Drawing.Font]::new("Segoe UI", 22, [System.Drawing.FontStyle]::Regular)
  $tx = 440
  $g.FillRectangle($red, $tx, 160, 150, 42)
  $g.DrawString("ADMIN", $fKicker, $white, ($tx + 36), 168)
  $g.DrawString("CineGeração", $fBrand, $white, $tx, 220)
  $g.DrawString("Painel da equipe", $fSub, $gold, $tx, 300)
  $g.DrawString("Login · chamada · comprovantes · PIX", $fSub, $muted, $tx, 355)
  $g.DrawString("Geração Eucarística", $fKicker, $gold, $tx, 430)
}
