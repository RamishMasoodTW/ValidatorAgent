
export function stripAnsi(str) {
  if (!str) return '';
  return str
    .replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
    .replace(/\[[0-9;]+m/g, '');
}

function getAiStepLabel() {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  switch (provider) {
    case 'openai': return '8. AI Knowledge Base Audit (OpenAI)';
    case 'anthropic': return '8. AI Knowledge Base Audit (Anthropic Claude)';
    case 'deepseek': return '8. AI Knowledge Base Audit (DeepSeek)';
    case 'groq': return '8. AI Knowledge Base Audit (Groq)';
    case 'openrouter': return '8. AI Knowledge Base Audit (OpenRouter)';
    case 'ollama': return '8. AI Knowledge Base Audit (Local Ollama)';
    case 'none': return '8. AI Knowledge Base Audit (Disabled)';
    default: return '8. AI Knowledge Base Audit (Google Gemini)';
  }
}

/**
 * progress-window.js
 * Manages the live commit validation progress window for Angular Gatekeeper.
 *
 * Features:
 *  1. Native WPF GUI with UTF-8 BOM (zero unreadable / garbled text).
 *  2. Real-time live status updates (Pending -> Running -> PASS / FAILED / SKIP).
 *  3. Adaptive System Dark/Light theme matching.
 *  4. Topmost window ensures visibility above IDEs / GitHub Desktop.
 *  5. Rich Markdown Rendering (Styled Headings, Bold text, indented Bullet points, Inlines).
 *  6. Interactive "Copy Error Log" button with clipboard integration.
 *  7. Interactive Close button.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';

const PROGRESS_FILE = path.join(os.tmpdir(), 'gk-progress.json');
const PS_SCRIPT = path.join(os.tmpdir(), 'gk-progress-window.ps1');
const VBS_SCRIPT = path.join(os.tmpdir(), 'gk-progress-launcher.vbs');

const STEPS = [
  { id: 1, label: '1. Angular Project Detection' },
  { id: 2, label: '2. Critical Architecture & Entry Points' },
  { id: 3, label: '3. Dependency Vulnerability Audit (npm audit)' },
  { id: 4, label: '4. TypeScript & Linter Verification' },
  { id: 5, label: '5. Automated Unit Tests (test:ci)' },
  { id: 6, label: '6. Production Build & Distribution Artifacts' },
  { id: 7, label: '7. Security & Secret Leak Scanning' },
  { id: 8, label: getAiStepLabel() }
];

let _windowEnabled = false;

function writeProgressFile(data) {
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(PROGRESS_FILE, '\uFEFF' + jsonStr, 'utf8');
  } catch (_) { }
}

function readProgressFile() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      let raw = fs.readFileSync(PROGRESS_FILE, 'utf8');
      if (raw.charCodeAt(0) === 0xFEFF) {
        raw = raw.slice(1);
      }
      return JSON.parse(raw);
    }
  } catch (_) { }
  return null;
}

function generatePsScript() {
  return `
Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Windows.Forms

# ── Detect Dark/Light Theme ──────────────────────────────────────────────────
$isDark = $false
try {
    $regVal = Get-ItemPropertyValue -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' -Name 'AppsUseLightTheme' -ErrorAction SilentlyContinue
    $isDark = ($regVal -eq 0)
} catch {}

$bg       = if ($isDark) { '#181825' } else { '#FFFFFF' }
$fg       = if ($isDark) { '#CDD6F4' } else { '#1E293B' }
$hdrBg    = if ($isDark) { '#11111B' } else { '#F8FAFC' }
$cardBg   = if ($isDark) { '#24273A' } else { '#F1F5F9' }
$border   = if ($isDark) { '#45475A' } else { '#E2E8F0' }
$aiBoxBg  = if ($isDark) { '#1E1E2E' } else { '#F8FAFC' }
$aiBoxBdr = if ($isDark) { '#313244' } else { '#CBD5E1' }

$passBg = if ($isDark) { '#132A1C' } else { '#F0FDF4' }
$errBg  = if ($isDark) { '#2D1515' } else { '#FEF2F2' }

$brushConverter = [System.Windows.Media.BrushConverter]::new()
$passBrush      = $brushConverter.ConvertFrom($passBg)
$errBrush       = $brushConverter.ConvertFrom($errBg)
$cardBrush      = $brushConverter.ConvertFrom($cardBg)
$greenBadgeBg   = $brushConverter.ConvertFrom('#15803D')
$redBadgeBg     = $brushConverter.ConvertFrom('#B91C1C')
$grayBadgeBg    = $brushConverter.ConvertFrom('#64748B')
$blueBadgeBg    = $brushConverter.ConvertFrom('#0284C7')
$greenFg        = $brushConverter.ConvertFrom('#22C55E')
$redFg          = $brushConverter.ConvertFrom('#EF4444')
$blueFg         = $brushConverter.ConvertFrom('#38BDF8')
$grayFg         = $brushConverter.ConvertFrom('#94A3B8')
$mainFg         = $brushConverter.ConvertFrom($fg)
$cyanFg         = $brushConverter.ConvertFrom('#38BDF8')
$amberFg        = $brushConverter.ConvertFrom('#FBBF24')
$boldFg         = if ($isDark) { $brushConverter.ConvertFrom('#FFFFFF') } else { $brushConverter.ConvertFrom('#0F172A') }
$bulletColor    = $brushConverter.ConvertFrom('#60A5FA')

$PROGRESS_FILE = "$env:TEMP\\gk-progress.json"

[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Angular Gatekeeper - Live Commit Validation"
        Width="580" Height="700"
        WindowStartupLocation="CenterScreen"
        Topmost="True"
        ResizeMode="NoResize"
        ShowInTaskbar="True"
        Background="$bg">
  <Window.Resources>
    <!-- Modern Sleek Themed ScrollBar Style -->
    <Style TargetType="{x:Type ScrollBar}">
      <Setter Property="Stylus.IsPressAndHoldEnabled" Value="false"/>
      <Setter Property="Stylus.IsFlicksEnabled" Value="false"/>
      <Setter Property="Width" Value="6"/>
      <Setter Property="MinWidth" Value="6"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="{x:Type ScrollBar}">
            <Grid x:Name="Bg" SnapsToDevicePixels="true" Background="Transparent">
              <Track x:Name="PART_Track" IsDirectionReversed="true" IsEnabled="{TemplateBinding IsMouseOver}">
                <Track.Thumb>
                  <Thumb>
                    <Thumb.Template>
                      <ControlTemplate TargetType="{x:Type Thumb}">
                        <Border Background="$border" CornerRadius="3" Opacity="0.75"/>
                      </ControlTemplate>
                    </Thumb.Template>
                  </Thumb>
                </Track.Thumb>
              </Track>
            </Grid>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
  </Window.Resources>
  <Grid>
    <Grid.RowDefinitions>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="*"/>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="Auto"/>
    </Grid.RowDefinitions>

    <!-- Header -->
    <Border Grid.Row="0" Background="$hdrBg" Padding="18,14" BorderBrush="$border" BorderThickness="0,0,0,1">
      <StackPanel>
        <TextBlock Text="Angular Gatekeeper - Commit Verification" FontSize="16" FontWeight="Bold" Foreground="$fg"/>
        <TextBlock Text="Validating code quality, build integrity &amp; architecture in real-time..." FontSize="11" Foreground="#94A3B8" Margin="0,3,0,0"/>
      </StackPanel>
    </Border>

    <!-- Steps List -->
    <ScrollViewer Grid.Row="1" Margin="14,8" VerticalScrollBarVisibility="Auto">
      <StackPanel x:Name="StepsPanel"/>
    </ScrollViewer>

    <!-- AI Architect / Error Report Card (Dynamically shown) -->
    <Border Grid.Row="2" x:Name="AiReportBorder" Margin="14,0,14,8" Padding="12" Background="$aiBoxBg" BorderBrush="$aiBoxBdr" BorderThickness="1" CornerRadius="6" Visibility="Collapsed">
      <StackPanel>
        <Grid Margin="0,0,0,8">
          <TextBlock x:Name="ReportTitleText" Text="AI Knowledge Base Audit &amp; Insights:" FontWeight="Bold" FontSize="12" Foreground="$blueFg" VerticalAlignment="Center"/>
          <Button x:Name="CopyBtn" Content="Copy Error Log" HorizontalAlignment="Right" Width="110" Height="24" Cursor="Hand" Background="#334155" Foreground="White" BorderThickness="0" FontSize="11">
            <Button.Resources>
              <Style TargetType="Border">
                <Setter Property="CornerRadius" Value="4"/>
              </Style>
            </Button.Resources>
          </Button>
        </Grid>
        <ScrollViewer MaxHeight="180" VerticalScrollBarVisibility="Auto">
          <RichTextBox x:Name="AiReportRtb" IsReadOnly="True" IsDocumentEnabled="True" Background="Transparent" BorderThickness="0" Foreground="$fg" FontSize="11" FontFamily="Segoe UI, Consolas"/>
        </ScrollViewer>
      </StackPanel>
    </Border>

    <!-- Footer -->
    <Border Grid.Row="3" Background="$hdrBg" Padding="16,12" BorderBrush="$border" BorderThickness="0,1,0,0">
      <Grid>
        <TextBlock x:Name="StatusText" Text="Running pre-commit validations..." FontSize="12" FontWeight="SemiBold" Foreground="$fg" VerticalAlignment="Center"/>
        <Button x:Name="CloseBtn" Content="Close" HorizontalAlignment="Right" Width="80" Height="28" Cursor="Hand" Background="#3B82F6" Foreground="White" BorderThickness="0">
          <Button.Resources>
            <Style TargetType="Border">
              <Setter Property="CornerRadius" Value="4"/>
            </Style>
          </Button.Resources>
        </Button>
      </Grid>
    </Border>
  </Grid>
</Window>
"@

$reader = [System.Xml.XmlNodeReader]::new($xaml)
$window = [System.Windows.Markup.XamlReader]::Load($reader)

$panel          = $window.FindName('StepsPanel')
$statusTb       = $window.FindName('StatusText')
$closeBtn       = $window.FindName('CloseBtn')
$aiReportBorder = $window.FindName('AiReportBorder')
$reportTitleTb  = $window.FindName('ReportTitleText')
$copyBtn        = $window.FindName('CopyBtn')
$aiReportRtb    = $window.FindName('AiReportRtb')

$closeBtn.Add_Click({
    $window.Close()
})

$script:rawErrorText = ''
if ($copyBtn) {
    $copyBtn.Add_Click({
        try {
            if ($script:rawErrorText -and $script:rawErrorText.Trim() -ne '') {
                $cleanClipboard = $script:rawErrorText -replace '\x1b\[[0-9;]*[a-zA-Z]', '' -replace '\[[0-9;]+m', ''
                [System.Windows.Forms.Clipboard]::SetText($cleanClipboard)
                $copyBtn.Content = "Copied!"
                $resetTimer = New-Object System.Windows.Threading.DispatcherTimer
                $resetTimer.Interval = [TimeSpan]::FromMilliseconds(1500)
                $resetTimer.Add_Tick({
                    $copyBtn.Content = "Copy Error Log"
                    $resetTimer.Stop()
                })
                $resetTimer.Start()
            }
        } catch {}
    })
}

function Convert-MarkdownToFlowDocument {
    param(
        [string]$text,
        [System.Windows.Media.Brush]$normalBrush,
        [System.Windows.Media.Brush]$boldBrush,
        [System.Windows.Media.Brush]$h1Brush,
        [System.Windows.Media.Brush]$h2Brush,
        [System.Windows.Media.Brush]$bulletBrush
    )

    $doc = New-Object System.Windows.Documents.FlowDocument
    $doc.PagePadding = New-Object System.Windows.Thickness(2, 2, 2, 2)

    if ([string]::IsNullOrWhiteSpace($text)) {
        return $doc
    }

    # Strip ANSI escape codes
    $cleanText = $text -replace '\x1b\[[0-9;]*[a-zA-Z]', ''

    # If this is a compiler / test runner error log (starts with [Step ...)
    if ($cleanText.StartsWith('[Step ') -or $cleanText -match '^\[Step \d+:') {
        $lines = $cleanText.Split([char]10)
        foreach ($rawLine in $lines) {
            $line = $rawLine.TrimEnd([char]13)
            if ($line.Trim() -eq '') {
                $p = New-Object System.Windows.Documents.Paragraph
                $p.Margin = New-Object System.Windows.Thickness(0, 1, 0, 1)
                $doc.Blocks.Add($p)
                continue
            }

            if ($line.StartsWith('[Step ')) {
                $p = New-Object System.Windows.Documents.Paragraph
                $p.Margin = New-Object System.Windows.Thickness(0, 4, 0, 4)
                $run = New-Object System.Windows.Documents.Run($line)
                $run.FontWeight = [System.Windows.FontWeights]::Bold
                $run.FontSize = 12.5
                $run.Foreground = $h1Brush
                $p.Inlines.Add($run)
                $doc.Blocks.Add($p)
                continue
            }

            $p = New-Object System.Windows.Documents.Paragraph
            $p.Margin = New-Object System.Windows.Thickness(0, 1, 0, 1)
            $p.FontFamily = New-Object System.Windows.Media.FontFamily('Consolas')
            $p.FontSize = 10.5
            
            # Preserve indentation so caret pointers (^ ) align accurately
            $presLine = $line.Replace(' ', [char]0x00A0)
            $run = New-Object System.Windows.Documents.Run($presLine)
            $run.Foreground = $normalBrush
            $p.Inlines.Add($run)
            $doc.Blocks.Add($p)
        }
        return $doc
    }

    # Clean arrow notations
    $arrow = " " + [char]0x2192 + " "
    $text = $text.Replace('\\rightarrow', $arrow).Replace('$\\rightarrow$', $arrow).Replace('->', $arrow).Replace('\\to', $arrow)

    function Add-InlinesToParagraph($p, [string]$lineContent, $baseFontSize) {
        $escStar = [System.Text.RegularExpressions.Regex]::Escape('**')
        $tick = [char]0x60
        $pattern = '(' + $escStar + '[^*]+?' + $escStar + '|' + $tick + '[^' + $tick + ']+?' + $tick + ')'
        $parts = [System.Text.RegularExpressions.Regex]::Split($lineContent, $pattern)

        foreach ($part in $parts) {
            if ([string]::IsNullOrEmpty($part)) { continue }

            if ($part.StartsWith('**') -and $part.EndsWith('**') -and $part.Length -ge 4) {
                $boldText = $part.Substring(2, $part.Length - 4)
                $run = New-Object System.Windows.Documents.Run($boldText)
                $run.FontWeight = [System.Windows.FontWeights]::Bold
                $run.Foreground = $boldBrush
                $run.FontSize = $baseFontSize
                $p.Inlines.Add($run)
            } elseif ($part.StartsWith($tick) -and $part.EndsWith($tick) -and $part.Length -ge 2) {
                $codeText = $part.Substring(1, $part.Length - 2)
                $run = New-Object System.Windows.Documents.Run($codeText)
                $run.FontFamily = New-Object System.Windows.Media.FontFamily('Consolas')
                $run.Foreground = $h1Brush
                $run.FontSize = $baseFontSize
                $p.Inlines.Add($run)
            } else {
                $run = New-Object System.Windows.Documents.Run($part)
                $run.Foreground = $normalBrush
                $run.FontSize = $baseFontSize
                $p.Inlines.Add($run)
            }
        }
    }

    $lines = $text.Split([char]10)

    foreach ($rawLine in $lines) {
        $trimmed = $rawLine.Trim()
        if ($trimmed -eq '' -or $trimmed -eq '---' -or $trimmed -eq '***') {
            continue
        }

        # Level 4 Heading (####)
        if ($trimmed.StartsWith('#### ')) {
            $hText = $trimmed.Substring(5).Trim().TrimStart('*').TrimEnd('*').Trim()
            $p = New-Object System.Windows.Documents.Paragraph
            $p.Margin = New-Object System.Windows.Thickness(0, 6, 0, 2)
            $run = New-Object System.Windows.Documents.Run($hText)
            $run.FontSize = 12
            $run.FontWeight = [System.Windows.FontWeights]::SemiBold
            $run.Foreground = $h2Brush
            $p.Inlines.Add($run)
            $doc.Blocks.Add($p)
            continue
        }

        # Level 3 Heading (###)
        if ($trimmed.StartsWith('### ')) {
            $hText = $trimmed.Substring(4).Trim().TrimStart('*').TrimEnd('*').Trim()
            $p = New-Object System.Windows.Documents.Paragraph
            $p.Margin = New-Object System.Windows.Thickness(0, 8, 0, 3)
            $run = New-Object System.Windows.Documents.Run($hText)
            $run.FontSize = 13.5
            $run.FontWeight = [System.Windows.FontWeights]::Bold
            $run.Foreground = $h1Brush
            $p.Inlines.Add($run)
            $doc.Blocks.Add($p)
            continue
        }

        # Level 1 or 2 Heading (# or ##)
        if ($trimmed.StartsWith('# ') -or $trimmed.StartsWith('## ')) {
            $hText = $trimmed.TrimStart('#').Trim().TrimStart('*').TrimEnd('*').Trim()
            $p = New-Object System.Windows.Documents.Paragraph
            $p.Margin = New-Object System.Windows.Thickness(0, 10, 0, 4)
            $run = New-Object System.Windows.Documents.Run($hText)
            $run.FontSize = 14.5
            $run.FontWeight = [System.Windows.FontWeights]::Bold
            $run.Foreground = $h1Brush
            $p.Inlines.Add($run)
            $doc.Blocks.Add($p)
            continue
        }

        # Standalone bold header line (e.g. **Remediation Steps:**)
        if ($trimmed.StartsWith('**') -and ($trimmed.EndsWith('**') -or $trimmed.EndsWith('**:'))) {
            $hText = $trimmed.Trim(':').Trim('*').Trim()
            $p = New-Object System.Windows.Documents.Paragraph
            $p.Margin = New-Object System.Windows.Thickness(0, 8, 0, 3)
            $run = New-Object System.Windows.Documents.Run($hText)
            $run.FontSize = 13
            $run.FontWeight = [System.Windows.FontWeights]::Bold
            $run.Foreground = $h1Brush
            $p.Inlines.Add($run)
            $doc.Blocks.Add($p)
            continue
        }

        # Numbered list item (e.g. "1. Directory Convention Mismatches:")
        if ($rawLine -match '^([ \\t]*)(\\d+\\.)\\s+(.*)$') {
            $indentSpaces = $matches[1].Length
            $numLabel = $matches[2]
            $content = $matches[3]
            $itemLeft = if ($indentSpaces -ge 2) { 20 } else { 4 }

            $p = New-Object System.Windows.Documents.Paragraph
            $p.Margin = New-Object System.Windows.Thickness($itemLeft, 3, 0, 2)

            $nRun = New-Object System.Windows.Documents.Run("$numLabel ")
            $nRun.FontWeight = [System.Windows.FontWeights]::Bold
            $nRun.Foreground = $bulletBrush
            $nRun.FontSize = 11.5
            $p.Inlines.Add($nRun)

            Add-InlinesToParagraph $p $content 11
            $doc.Blocks.Add($p)
            continue
        }

        # Bullet point (* or -)
        if ($rawLine -match '^([ \\t]*)([*+-])\\s+(.*)$') {
            $indentSpaces = $matches[1].Length
            $bulletChar = if ($indentSpaces -ge 2) { [char]0x25E6 } else { [char]0x2022 }
            $bulletLeft = if ($indentSpaces -ge 2) { 22 } else { 8 }
            $content = $matches[3]

            $p = New-Object System.Windows.Documents.Paragraph
            $p.Margin = New-Object System.Windows.Thickness($bulletLeft, 2, 0, 2)

            $bRun = New-Object System.Windows.Documents.Run("$bulletChar  ")
            $bRun.FontWeight = [System.Windows.FontWeights]::Bold
            $bRun.Foreground = $bulletBrush
            $bRun.FontSize = 11
            $p.Inlines.Add($bRun)

            Add-InlinesToParagraph $p $content 11
            $doc.Blocks.Add($p)
            continue
        }

        # Standard paragraph line
        $p = New-Object System.Windows.Documents.Paragraph
        $p.Margin = New-Object System.Windows.Thickness(0, 2, 0, 2)
        Add-InlinesToParagraph $p $trimmed 11
        $doc.Blocks.Add($p)
    }

    return $doc
}

$stepLabels = @(
  '1. Angular Project Detection',
  '2. Critical Architecture & Entry Points',
  '3. Dependency Vulnerability Audit (npm audit)',
  '4. TypeScript & Linter Verification',
  '5. Automated Unit Tests (test:ci)',
  '6. Production Build & Distribution Artifacts',
  '7. Security & Secret Leak Scanning',
  '8. AI Knowledge Base Audit'
)

$rowBorders = @{}
$rowIcons   = @{}
$rowTexts   = @{}
$rowSubs    = @{}
$rowBadges  = @{}

for ($i = 0; $i -lt $stepLabels.Count; $i++) {
    $stepNum = $i + 1

    $row = New-Object System.Windows.Controls.Border
    $row.CornerRadius      = New-Object System.Windows.CornerRadius(6)
    $row.Padding           = New-Object System.Windows.Thickness(12, 6, 12, 6)
    $row.Margin            = New-Object System.Windows.Thickness(0, 2, 0, 2)
    $row.Background        = $cardBrush

    $grid = New-Object System.Windows.Controls.Grid
    $col1 = New-Object System.Windows.Controls.ColumnDefinition; $col1.Width = New-Object System.Windows.GridLength(28)
    $col2 = New-Object System.Windows.Controls.ColumnDefinition; $col2.Width = New-Object System.Windows.GridLength(1, [System.Windows.GridUnitType]::Star)
    $col3 = New-Object System.Windows.Controls.ColumnDefinition; $col3.Width = New-Object System.Windows.GridLength(0, [System.Windows.GridUnitType]::Auto)
    $grid.ColumnDefinitions.Add($col1)
    $grid.ColumnDefinitions.Add($col2)
    $grid.ColumnDefinitions.Add($col3)

    $icon = New-Object System.Windows.Controls.TextBlock
    $icon.Text       = '[ ]'
    $icon.FontSize   = 11
    $icon.FontWeight = [System.Windows.FontWeights]::Bold
    $icon.Foreground = $grayFg
    $icon.VerticalAlignment = [System.Windows.VerticalAlignment]::Center
    [System.Windows.Controls.Grid]::SetColumn($icon, 0)

    $lbl = New-Object System.Windows.Controls.TextBlock
    $lbl.Text       = $stepLabels[$i]
    $lbl.FontSize   = 12
    $lbl.Foreground = $grayFg
    $lbl.VerticalAlignment = [System.Windows.VerticalAlignment]::Center

    $subLbl = New-Object System.Windows.Controls.TextBlock
    $subLbl.FontSize   = 10
    $subLbl.Foreground = $blueFg
    $subLbl.Visibility = [System.Windows.Visibility]::Collapsed
    $subLbl.Margin     = New-Object System.Windows.Thickness(0, 2, 0, 0)

    $textStack = New-Object System.Windows.Controls.StackPanel
    $textStack.VerticalAlignment = [System.Windows.VerticalAlignment]::Center
    $textStack.Children.Add($lbl)    | Out-Null
    $textStack.Children.Add($subLbl) | Out-Null
    [System.Windows.Controls.Grid]::SetColumn($textStack, 1)

    $badge = New-Object System.Windows.Controls.Border
    $badge.CornerRadius      = New-Object System.Windows.CornerRadius(4)
    $badge.Padding           = New-Object System.Windows.Thickness(10, 3, 10, 3)
    $badge.MinWidth          = 62
    $badge.VerticalAlignment = [System.Windows.VerticalAlignment]::Center
    $badge.HorizontalAlignment = [System.Windows.HorizontalAlignment]::Right
    $badge.Visibility        = [System.Windows.Visibility]::Collapsed

    $badgeTb = New-Object System.Windows.Controls.TextBlock
    $badgeTb.FontSize            = 10
    $badgeTb.FontWeight          = [System.Windows.FontWeights]::Bold
    $badgeTb.Foreground          = [System.Windows.Media.Brushes]::White
    $badgeTb.TextAlignment       = [System.Windows.TextAlignment]::Center
    $badgeTb.VerticalAlignment   = [System.Windows.VerticalAlignment]::Center
    $badgeTb.HorizontalAlignment = [System.Windows.HorizontalAlignment]::Center
    $badge.Child = $badgeTb
    [System.Windows.Controls.Grid]::SetColumn($badge, 2)

    $grid.Children.Add($icon)      | Out-Null
    $grid.Children.Add($textStack) | Out-Null
    $grid.Children.Add($badge)     | Out-Null
    $row.Child = $grid
    $panel.Children.Add($row)      | Out-Null

    $rowBorders[$stepNum] = $row
    $rowIcons[$stepNum]   = $icon
    $rowTexts[$stepNum]   = $lbl
    $rowSubs[$stepNum]    = $subLbl
    $rowBadges[$stepNum]  = @{ border = $badge; text = $badgeTb }
}

$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromMilliseconds(250)
$autoCloseSeconds = 0
$script:lastRenderedLog = ''

$timer.Add_Tick({
    if (-not (Test-Path $PROGRESS_FILE)) { return }
    try {
        $raw = Get-Content $PROGRESS_FILE -Raw
        $json = $raw | ConvertFrom-Json
    } catch { return }

    $steps = $json.steps
    $done  = $json.done
    $hasError = $false

    foreach ($s in $steps.PSObject.Properties) {
        $num   = [int]$s.Name
        $state = $s.Value
        if (-not $rowIcons.ContainsKey($num)) { continue }

        $icon  = $rowIcons[$num]
        $lbl   = $rowTexts[$num]
        $sub   = $rowSubs[$num]
        $row   = $rowBorders[$num]
        $badge = $rowBadges[$num]

        if ($state.detail -and $state.detail.Trim() -ne '') {
            $sub.Text = $state.detail
            $sub.Visibility = [System.Windows.Visibility]::Visible
        } else {
            $sub.Visibility = [System.Windows.Visibility]::Collapsed
        }

        switch ($state.status) {
            'pending' {
                $icon.Text       = '[ ]'
                $icon.Foreground = $grayFg
                $lbl.Foreground  = $grayFg
                $badge.border.Visibility = [System.Windows.Visibility]::Collapsed
                $row.Background  = $cardBrush
            }
            'running' {
                $icon.Text       = '>>'
                $icon.Foreground = $blueFg
                $lbl.Foreground  = $mainFg
                $badge.border.Visibility = [System.Windows.Visibility]::Collapsed
                $row.Background  = $cardBrush
            }
            'pass' {
                $icon.Text       = 'OK'
                $icon.Foreground = $greenFg
                $lbl.Foreground  = $mainFg
                $badge.border.Background = $greenBadgeBg
                $badge.text.Text = 'PASS'
                $badge.border.Visibility = [System.Windows.Visibility]::Visible
                $row.Background  = $passBrush
            }
            'error' {
                $icon.Text       = 'ERR'
                $icon.Foreground = $redFg
                $lbl.Foreground  = $redFg
                $badge.border.Background = $redBadgeBg
                $badge.text.Text = 'FAILED'
                $badge.border.Visibility = [System.Windows.Visibility]::Visible
                $row.Background  = $errBrush
                $hasError = $true
            }
            'skip' {
                $icon.Text       = '--'
                $icon.Foreground = $grayFg
                $lbl.Foreground  = $grayFg
                $badge.border.Background = $grayBadgeBg
                $badge.text.Text = 'SKIP'
                $badge.border.Visibility = [System.Windows.Visibility]::Visible
                $row.Background  = $cardBrush
            }
        }
    }

    # Dynamically show Error Log or AI Report in the rich box
    $displayLog = ''
    $isFail = $false

    if ($json.errorLog -and $json.errorLog.Trim() -ne '') {
        $displayLog = $json.errorLog
        $isFail = $true
    } elseif ($json.aiReport -and $json.aiReport.Trim() -ne '') {
        $displayLog = $json.aiReport
        $isFail = ($hasError -or $json.hasError)
    } elseif ($hasError) {
        $msgList = @()
        for ($k = 1; $k -le 8; $k++) {
            $st = $json.steps["$k"]
            if ($st -and $st.status -eq 'error' -and $st.detail) {
                $msgList += "[$($st.label)] Error: $($st.detail)"
            }
        }
        if ($msgList.Count -gt 0) {
            $displayLog = $msgList -join [Environment]::NewLine
            $isFail = $true
        }
    }

    if ($displayLog -and $displayLog.Trim() -ne '') {
        $displayLog = $displayLog -replace '\x1b\[[0-9;]*[a-zA-Z]', '' -replace '\[[0-9;]+m', ''
        $script:rawErrorText = $displayLog

        if ($script:lastRenderedLog -ne $displayLog) {
            $script:lastRenderedLog = $displayLog
            $doc = Convert-MarkdownToFlowDocument -text $displayLog -normalBrush $mainFg -boldBrush $boldFg -h1Brush $cyanFg -h2Brush $amberFg -bulletBrush $bulletColor
            $aiReportRtb.Document = $doc
            $aiReportBorder.Visibility = [System.Windows.Visibility]::Visible
        }

        if ($isFail) {
            if ($reportTitleTb) {
                $reportTitleTb.Text = 'Validation Failure Details (Select & Copy):'
                $reportTitleTb.Foreground = $redFg
            }
            $aiReportBorder.BorderBrush = $errBrush
        } else {
            if ($reportTitleTb) {
                $reportTitleTb.Text = 'AI Knowledge Base Audit & Insights:'
                $reportTitleTb.Foreground = $blueFg
            }
            $aiReportBorder.BorderBrush = $cardBrush
        }
    }

    if ($done -eq $true) {
        $timer.Stop()
        if ($hasError) {
            $statusTb.Text = 'Validation failed! Commit rejected. Click Close to dismiss.'
            $statusTb.Foreground = $redFg
            $closeBtn.Background = $redFg
        } else {
            $statusTb.Text = 'All validations passed! Click Close to dismiss.'
            $statusTb.Foreground = $greenFg
            $closeBtn.Background = $greenFg
        }
    }
})

$timer.Start()
$window.ShowDialog() | Out-Null
`;
}

function launchWindowProcess() {
  try {
    const psContent = '\uFEFF' + generatePsScript();
    fs.writeFileSync(PS_SCRIPT, psContent, 'utf8');

    const vbsContent = `
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & "${PS_SCRIPT.replace(/\\/g, '\\\\')}" & """", 0, False
`;
    fs.writeFileSync(VBS_SCRIPT, vbsContent, 'utf8');

    spawn('wscript.exe', [VBS_SCRIPT], { detached: true, stdio: 'ignore' }).unref();
  } catch (_) { }
}

/**
 * Initializes the progress window at start of commit.
 */
export function initProgressWindow() {
  _windowEnabled = process.env.SHOW_PROGRESS === 'true';
  if (!_windowEnabled) return;

  const data = {
    done: false,
    hasError: false,
    aiReport: '',
    errorLog: '',
    steps: {}
  };

  for (const s of STEPS) {
    data.steps[s.id] = { status: 'pending', label: s.label };
  }

  writeProgressFile(data);
  launchWindowProcess();
}

/**
 * Marks a step as running with optional sub-details.
 */
export function startStep(stepId, detail = '') {
  if (!_windowEnabled) return;
  const data = readProgressFile();
  if (!data) return;
  if (data.steps[stepId]) {
    data.steps[stepId].status = 'running';
    data.steps[stepId].detail = detail;
  }
  writeProgressFile(data);
}

/**
 * Updates status of a step and optionally attaches detail note or AI report.
 */
export function updateStep(stepId, status, reportOrDetail = '') {
  if (!_windowEnabled) return;
  const data = readProgressFile();
  if (!data) return;
  if (data.steps[stepId]) {
    data.steps[stepId].status = status;
    if (stepId !== 8) {
      data.steps[stepId].detail = stripAnsi(reportOrDetail);
    }
  }
  if (status === 'error') {
    data.hasError = true;
  }
  if (stepId === 8 && reportOrDetail) {
    data.aiReport = stripAnsi(reportOrDetail);
  }
  writeProgressFile(data);
}

/**
 * Finalizes validation pipeline.
 */
export function finalizeProgress(passed, finalReport = '', errorLog = '') {
  if (!_windowEnabled) return;
  const data = readProgressFile();
  if (!data) return;
  data.done = true;
  data.hasError = !passed;
  if (finalReport) {
    data.aiReport = stripAnsi(finalReport);
  }
  if (errorLog) {
    data.errorLog = stripAnsi(errorLog);
  }
  writeProgressFile(data);
}
