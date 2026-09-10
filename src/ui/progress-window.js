
export function stripAnsi(str) {
  if (!str) return '';
  return str
    .replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
    .replace(/\[[0-9;]+m/g, '');
}

import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import dotenv from 'dotenv';

export function getAiStepLabel() {
  if (!process.env.AI_PROVIDER && !process.env.GEMINI_API_KEY) {
    try {
      const appDataDir = process.env.APPDATA
        ? path.join(process.env.APPDATA, 'FrontendGatekeeper')
        : path.join(process.env.HOME || process.env.USERPROFILE || '.', '.frontend-gatekeeper');
      const envPath = path.join(appDataDir, '.env');
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath, quiet: true });
      }
      dotenv.config({ quiet: true });
    } catch (_) {}
  }

  const provider = (process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'none')).toLowerCase();
  switch (provider) {
    case 'ollama': return '8. AI Knowledge Base Audit (Ollama)';
    case 'openai': return '8. AI Knowledge Base Audit (OpenAI)';
    case 'anthropic': return '8. AI Knowledge Base Audit (Anthropic Claude)';
    case 'deepseek': return '8. AI Knowledge Base Audit (DeepSeek)';
    case 'groq': return '8. AI Knowledge Base Audit (Groq)';
    case 'openrouter': return '8. AI Knowledge Base Audit (OpenRouter)';
    case 'gemini': return '8. AI Knowledge Base Audit (Google Gemini)';
    case 'none': return '8. AI Knowledge Base Audit (Disabled)';
    default: {
      const capitalized = provider.charAt(0).toUpperCase() + provider.slice(1);
      return `8. AI Knowledge Base Audit (${capitalized})`;
    }
  }
}

export function getSteps() {
  return [
    { id: 1, label: '1. Angular Project Detection' },
    { id: 2, label: '2. Critical Architecture & Entry Points' },
    { id: 3, label: '3. Dependency Vulnerability Audit (npm audit)' },
    { id: 4, label: '4. TypeScript & Linter Verification' },
    { id: 5, label: '5. Automated Unit Tests (test:ci) + Coverage Gate' },
    { id: 6, label: '6. Production Build & CD Deployment Verification' },
    { id: 7, label: '7. Security & Secret Leak Scanning' },
    { id: 8, label: getAiStepLabel() }
  ];
}

export const STEPS = getSteps();

const PROGRESS_FILE = path.join(os.tmpdir(), 'gk-progress.json');
const PS_SCRIPT = path.join(os.tmpdir(), 'gk-progress-window.ps1');
const VBS_SCRIPT = path.join(os.tmpdir(), 'gk-progress-launcher.vbs');

let _windowEnabled = false;
let _stepLogBuffers = {};
let _flushTimer = null;

function queueStepLog(stepId, text) {
  if (!_windowEnabled || !text) return;
  _stepLogBuffers[stepId] = (_stepLogBuffers[stepId] || '') + stripAnsi(text);
  if (!_flushTimer) {
    _flushTimer = setTimeout(() => {
      flushStepLogs();
    }, 40);
  }
}

export function flushStepLogs() {
  if (_flushTimer) {
    clearTimeout(_flushTimer);
    _flushTimer = null;
  }
  const stepIds = Object.keys(_stepLogBuffers);
  if (stepIds.length === 0) return;

  const data = readProgressFile();
  if (!data || !data.steps) return;

  let changed = false;
  for (const id of stepIds) {
    const chunk = _stepLogBuffers[id];
    if (chunk && data.steps[id]) {
      data.steps[id].log = (data.steps[id].log || '') + chunk;
      if (data.steps[id].log.length > 50000) {
        data.steps[id].log = data.steps[id].log.slice(-50000);
      }
      changed = true;
    }
  }
  _stepLogBuffers = {};

  if (changed) {
    writeProgressFile(data);
  }
}

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

$bg                 = if ($isDark) { '#181825' } else { '#F8FAFC' }
$fg                 = if ($isDark) { '#CDD6F4' } else { '#1E293B' }
$hdrBg              = if ($isDark) { '#11111B' } else { '#FFFFFF' }
$cardBg             = if ($isDark) { '#1E1E2E' } else { '#FFFFFF' }
$border             = if ($isDark) { '#313244' } else { '#CBD5E1' }
$aiBoxBg            = if ($isDark) { '#181825' } else { '#F8FAFC' }
$aiBoxBdr           = if ($isDark) { '#313244' } else { '#CBD5E1' }

$consoleBg          = if ($isDark) { '#11111B' } else { '#0F172A' }
$consoleBdr         = if ($isDark) { '#26283B' } else { '#334155' }
$consoleFg          = if ($isDark) { '#A6ADC8' } else { '#E2E8F0' }
$hoverBg            = if ($isDark) { '#282A3E' } else { '#F1F5F9' }

$passBg             = if ($isDark) { '#132A1C' } else { '#F0FDF4' }
$errBg              = if ($isDark) { '#2D1515' } else { '#FEF2F2' }

$brushConverter     = [System.Windows.Media.BrushConverter]::new()
$passBrush          = $brushConverter.ConvertFrom($passBg)
$errBrush           = $brushConverter.ConvertFrom($errBg)
$cardBrush          = $brushConverter.ConvertFrom($cardBg)
$borderBrush        = $brushConverter.ConvertFrom($border)
$hoverBrush         = $brushConverter.ConvertFrom($hoverBg)
$consoleBgBrush     = $brushConverter.ConvertFrom($consoleBg)
$consoleBdrBrush    = $brushConverter.ConvertFrom($consoleBdr)
$consoleFgBrush     = $brushConverter.ConvertFrom($consoleFg)
$greenBadgeBg       = $brushConverter.ConvertFrom('#15803D')
$redBadgeBg         = $brushConverter.ConvertFrom('#B91C1C')
$grayBadgeBg        = $brushConverter.ConvertFrom('#64748B')
$blueBadgeBg        = $brushConverter.ConvertFrom('#0284C7')
$runningBdrBrush    = $brushConverter.ConvertFrom('#38BDF8')
$greenFg            = $brushConverter.ConvertFrom('#22C55E')
$redFg              = $brushConverter.ConvertFrom('#EF4444')
$blueFg             = $brushConverter.ConvertFrom('#38BDF8')
$grayFg             = $brushConverter.ConvertFrom('#94A3B8')
$mainFg             = $brushConverter.ConvertFrom($fg)
$cyanFg             = $brushConverter.ConvertFrom('#38BDF8')
$amberFg            = $brushConverter.ConvertFrom('#FBBF24')
$boldFg             = if ($isDark) { $brushConverter.ConvertFrom('#FFFFFF') } else { $brushConverter.ConvertFrom('#0F172A') }
$bulletColor        = $brushConverter.ConvertFrom('#60A5FA')

$PROGRESS_FILE = "$env:TEMP\\gk-progress.json"

[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Angular Gatekeeper — Live CI/CD Commit Validation"
        Width="620" Height="740"
        MinWidth="560" MinHeight="620"
        WindowStartupLocation="CenterScreen"
        Topmost="True"
        ResizeMode="CanResize"
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
        <TextBlock Text="Angular Gatekeeper — CI/CD Pre-Commit Quality Gate" FontSize="16" FontWeight="Bold" Foreground="$fg"/>
        <TextBlock Text="Enforcing strict CI standards, CD deployment readiness &amp; AI regressions in real-time..." FontSize="11" Foreground="#94A3B8" Margin="0,3,0,0"/>
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
  '3. Dependency Security & Vulnerability Audit (npm audit)',
  '4. Strict TypeScript Compilation & Linter Verification',
  '5. Automated Unit Tests & CI Regression Suite (test:ci)',
  '6. Production Build & CD Deployment Readiness Verification',
  '7. Security & Secret Leak Scanning',
  '${getAiStepLabel().replace(/'/g, "''")}'
);

$stepCards     = @{}
$stepHeaders   = @{}
$stepChevrons  = @{}
$stepIcons     = @{}
$stepTexts     = @{}
$stepSubs      = @{}
$stepBadges    = @{}
$stepBodies    = @{}
$stepTextBoxes = @{}
$stepLastLogs  = @{}

for ($i = 0; $i -lt $stepLabels.Count; $i++) {
    $stepNum = $i + 1

    # Outer Card Container (Accordion Item)
    $card = New-Object System.Windows.Controls.Border
    $card.CornerRadius    = New-Object System.Windows.CornerRadius(6)
    $card.Margin          = New-Object System.Windows.Thickness(0, 2, 0, 3)
    $card.Background      = $cardBrush
    $card.BorderBrush     = $borderBrush
    $card.BorderThickness = New-Object System.Windows.Thickness(1)

    $stack = New-Object System.Windows.Controls.StackPanel
    $card.Child = $stack

    # Clickable Header Row
    $header = New-Object System.Windows.Controls.Border
    $header.Background   = [System.Windows.Media.Brushes]::Transparent
    $header.Padding      = New-Object System.Windows.Thickness(10, 8, 10, 8)
    $header.Cursor       = [System.Windows.Input.Cursors]::Hand
    $header.CornerRadius = New-Object System.Windows.CornerRadius(5)
    $header.Tag          = $stepNum

    $grid = New-Object System.Windows.Controls.Grid
    $col0 = New-Object System.Windows.Controls.ColumnDefinition; $col0.Width = New-Object System.Windows.GridLength(18) # Chevron
    $col1 = New-Object System.Windows.Controls.ColumnDefinition; $col1.Width = New-Object System.Windows.GridLength(28) # Icon
    $col2 = New-Object System.Windows.Controls.ColumnDefinition; $col2.Width = New-Object System.Windows.GridLength(1, [System.Windows.GridUnitType]::Star) # Text
    $col3 = New-Object System.Windows.Controls.ColumnDefinition; $col3.Width = New-Object System.Windows.GridLength(0, [System.Windows.GridUnitType]::Auto) # Badge
    $grid.ColumnDefinitions.Add($col0)
    $grid.ColumnDefinitions.Add($col1)
    $grid.ColumnDefinitions.Add($col2)
    $grid.ColumnDefinitions.Add($col3)

    # Column 0: Chevron arrow (▶ / ▼)
    $chev = New-Object System.Windows.Controls.TextBlock
    $chev.Text              = [char]0x25B6 # ▶ (collapsed)
    $chev.FontSize          = 9.5
    $chev.Foreground        = $grayFg
    $chev.VerticalAlignment = [System.Windows.VerticalAlignment]::Center
    [System.Windows.Controls.Grid]::SetColumn($chev, 0)

    # Column 1: Status Icon
    $icon = New-Object System.Windows.Controls.TextBlock
    $icon.Text              = '[ ]'
    $icon.FontSize          = 11
    $icon.FontWeight        = [System.Windows.FontWeights]::Bold
    $icon.Foreground        = $grayFg
    $icon.VerticalAlignment = [System.Windows.VerticalAlignment]::Center
    [System.Windows.Controls.Grid]::SetColumn($icon, 1)

    # Column 2: Labels
    $lbl = New-Object System.Windows.Controls.TextBlock
    $lbl.Text              = $stepLabels[$i]
    $lbl.FontSize          = 12
    $lbl.FontWeight        = [System.Windows.FontWeights]::SemiBold
    $lbl.Foreground        = $grayFg
    $lbl.VerticalAlignment = [System.Windows.VerticalAlignment]::Center

    $subLbl = New-Object System.Windows.Controls.TextBlock
    $subLbl.FontSize       = 10
    $subLbl.Foreground     = $blueFg
    $subLbl.Visibility     = [System.Windows.Visibility]::Collapsed
    $subLbl.Margin         = New-Object System.Windows.Thickness(0, 2, 0, 0)
    $subLbl.TextTrimming   = [System.Windows.TextTrimming]::CharacterEllipsis

    $textStack = New-Object System.Windows.Controls.StackPanel
    $textStack.VerticalAlignment = [System.Windows.VerticalAlignment]::Center
    $textStack.Children.Add($lbl)    | Out-Null
    $textStack.Children.Add($subLbl) | Out-Null
    [System.Windows.Controls.Grid]::SetColumn($textStack, 2)

    # Column 3: Badge
    $badge = New-Object System.Windows.Controls.Border
    $badge.CornerRadius        = New-Object System.Windows.CornerRadius(4)
    $badge.Padding             = New-Object System.Windows.Thickness(8, 2, 8, 2)
    $badge.MinWidth            = 62
    $badge.VerticalAlignment   = [System.Windows.VerticalAlignment]::Center
    $badge.HorizontalAlignment = [System.Windows.HorizontalAlignment]::Right
    $badge.Visibility          = [System.Windows.Visibility]::Collapsed

    $badgeTb = New-Object System.Windows.Controls.TextBlock
    $badgeTb.FontSize            = 9.5
    $badgeTb.FontWeight          = [System.Windows.FontWeights]::Bold
    $badgeTb.Foreground          = [System.Windows.Media.Brushes]::White
    $badgeTb.TextAlignment       = [System.Windows.TextAlignment]::Center
    $badgeTb.VerticalAlignment   = [System.Windows.VerticalAlignment]::Center
    $badgeTb.HorizontalAlignment = [System.Windows.HorizontalAlignment]::Center
    $badge.Child = $badgeTb
    [System.Windows.Controls.Grid]::SetColumn($badge, 3)

    $grid.Children.Add($chev)      | Out-Null
    $grid.Children.Add($icon)      | Out-Null
    $grid.Children.Add($textStack) | Out-Null
    $grid.Children.Add($badge)     | Out-Null
    $header.Child = $grid

    # Accordion Body (Collapsible Log Box)
    $body = New-Object System.Windows.Controls.Border
    $body.Visibility      = [System.Windows.Visibility]::Collapsed
    $body.Margin          = New-Object System.Windows.Thickness(8, 0, 8, 8)
    $body.Padding         = New-Object System.Windows.Thickness(8)
    $body.CornerRadius    = New-Object System.Windows.CornerRadius(4)
    $body.Background      = $consoleBgBrush
    $body.BorderBrush     = $consoleBdrBrush
    $body.BorderThickness = New-Object System.Windows.Thickness(1)

    $bGrid = New-Object System.Windows.Controls.Grid
    $bRow0 = New-Object System.Windows.Controls.RowDefinition; $bRow0.Height = New-Object System.Windows.GridLength(0, [System.Windows.GridUnitType]::Auto)
    $bRow1 = New-Object System.Windows.Controls.RowDefinition; $bRow1.Height = New-Object System.Windows.GridLength(1, [System.Windows.GridUnitType]::Star)
    $bGrid.RowDefinitions.Add($bRow0)
    $bGrid.RowDefinitions.Add($bRow1)

    # Accordion Toolbar
    $tbGrid = New-Object System.Windows.Controls.Grid
    $tbGrid.Margin = New-Object System.Windows.Thickness(0, 0, 0, 6)

    $tbTitle = New-Object System.Windows.Controls.TextBlock
    $tbTitle.Text              = "LIVE PROCESS OUTPUT"
    $tbTitle.FontSize          = 9.5
    $tbTitle.FontWeight        = [System.Windows.FontWeights]::Bold
    $tbTitle.Foreground        = $cyanFg
    $tbTitle.VerticalAlignment = [System.Windows.VerticalAlignment]::Center

    $copyStepBtn = New-Object System.Windows.Controls.Button
    $copyStepBtn.Content             = "Copy"
    $copyStepBtn.HorizontalAlignment = [System.Windows.HorizontalAlignment]::Right
    $copyStepBtn.Width               = 46
    $copyStepBtn.Height              = 20
    $copyStepBtn.FontSize            = 9.5
    $copyStepBtn.Cursor              = [System.Windows.Input.Cursors]::Hand
    $copyStepBtn.Background          = [System.Windows.Media.BrushConverter]::new().ConvertFrom('#334155')
    $copyStepBtn.Foreground          = [System.Windows.Media.Brushes]::White
    $copyStepBtn.BorderThickness     = New-Object System.Windows.Thickness(0)
    $copyStepBtn.Tag                 = $stepNum

    $copyStepBtn.Resources.Add([System.Windows.Controls.Border], $(
        $bdrStyle = New-Object System.Windows.Style([System.Windows.Controls.Border])
        $bdrStyle.Setters.Add((New-Object System.Windows.Setter([System.Windows.Controls.Border]::CornerRadiusProperty, (New-Object System.Windows.CornerRadius(3)))))
        $bdrStyle
    ))

    $tbGrid.Children.Add($tbTitle)     | Out-Null
    $tbGrid.Children.Add($copyStepBtn) | Out-Null
    [System.Windows.Controls.Grid]::SetRow($tbGrid, 0)
    $bGrid.Children.Add($tbGrid) | Out-Null

    # Log TextBox directly with scrolling & auto-scroll support
    $logTb = New-Object System.Windows.Controls.TextBox
    $logTb.IsReadOnly                        = $true
    $logTb.AcceptsReturn                     = $true
    $logTb.TextWrapping                      = [System.Windows.TextWrapping]::NoWrap
    $logTb.Background                        = [System.Windows.Media.Brushes]::Transparent
    $logTb.BorderThickness                   = New-Object System.Windows.Thickness(0)
    $logTb.Foreground                        = $consoleFgBrush
    $logTb.FontFamily                        = New-Object System.Windows.Media.FontFamily('Consolas, Courier New, monospace')
    $logTb.FontSize                          = 10
    $logTb.MaxHeight                         = 190
    $logTb.VerticalScrollBarVisibility       = [System.Windows.Controls.ScrollBarVisibility]::Auto
    $logTb.HorizontalScrollBarVisibility     = [System.Windows.Controls.ScrollBarVisibility]::Auto
    $logTb.Text                              = "Waiting for step execution to start..."

    [System.Windows.Controls.Grid]::SetRow($logTb, 1)
    $bGrid.Children.Add($logTb) | Out-Null

    $body.Child = $bGrid

    $stack.Children.Add($header) | Out-Null
    $stack.Children.Add($body)   | Out-Null
    $panel.Children.Add($card)   | Out-Null

    $stepCards[$stepNum]     = $card
    $stepHeaders[$stepNum]   = $header
    $stepChevrons[$stepNum]  = $chev
    $stepIcons[$stepNum]     = $icon
    $stepTexts[$stepNum]     = $lbl
    $stepSubs[$stepNum]      = $subLbl
    $stepBadges[$stepNum]    = @{ border = $badge; text = $badgeTb }
    $stepBodies[$stepNum]    = $body
    $stepTextBoxes[$stepNum] = $logTb
    $stepLastLogs[$stepNum]  = ''

    # Interactive Accordion Click Handler
    $header.Add_MouseLeftButtonDown({
        param($sender, $e)
        $sIdx = [int]$sender.Tag
        $b = $stepBodies[$sIdx]
        $c = $stepChevrons[$sIdx]
        if ($b.Visibility -eq [System.Windows.Visibility]::Visible) {
            $b.Visibility = [System.Windows.Visibility]::Collapsed
            $c.Text = [char]0x25B6 # ▶
        } else {
            $b.Visibility = [System.Windows.Visibility]::Visible
            $c.Text = [char]0x25BC # ▼
            $stepTextBoxes[$sIdx].ScrollToEnd()
        }
    })

    # Header Hover Effect
    $header.Add_MouseEnter({
        param($sender, $e)
        $sender.Background = $hoverBrush
    })
    $header.Add_MouseLeave({
        param($sender, $e)
        $sender.Background = [System.Windows.Media.Brushes]::Transparent
    })

    # Copy Step Log Handler
    $copyStepBtn.Add_Click({
        param($sender, $e)
        try {
            $sIdx = [int]$sender.Tag
            $t = $stepTextBoxes[$sIdx].Text
            if ($t -and $t.Trim() -ne '') {
                [System.Windows.Forms.Clipboard]::SetText($t)
                $sender.Content = "Copied!"
                $rst = New-Object System.Windows.Threading.DispatcherTimer
                $rst.Interval = [TimeSpan]::FromMilliseconds(1500)
                $rst.Add_Tick({
                    $sender.Content = "Copy"
                    $rst.Stop()
                })
                $rst.Start()
            }
        } catch {}
    })
}

$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromMilliseconds(100)
$script:lastRunningStep = 0
$script:lastRenderedLog = ''

$timer.Add_Tick({
    if (-not (Test-Path $PROGRESS_FILE)) { return }
    try {
        $fileStream = [System.IO.File]::Open($PROGRESS_FILE, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
        $sr = New-Object System.IO.StreamReader($fileStream, [System.Text.Encoding]::UTF8)
        $raw = $sr.ReadToEnd()
        $sr.Close()
        $fileStream.Close()
        if ([string]::IsNullOrWhiteSpace($raw)) { return }
        $json = $raw | ConvertFrom-Json
    } catch { return }

    $steps = $json.steps
    $done  = $json.done
    $hasError = $false

    # Find the current active/running step
    $activeRunningStep = 0
    if ($json.activeStep) {
        $activeRunningStep = [int]$json.activeStep
    } else {
        foreach ($s in $steps.PSObject.Properties) {
            if ($s.Value.status -eq 'running') {
                $activeRunningStep = [int]$s.Name
                break
            }
        }
    }

    # Auto-transition accordions as steps progress
    if ($activeRunningStep -gt 0 -and $activeRunningStep -ne $script:lastRunningStep) {
        # Auto-collapse previous step if it did not fail
        if ($script:lastRunningStep -gt 0 -and $stepBodies.ContainsKey($script:lastRunningStep)) {
            $prevProp = $steps.PSObject.Properties[$script:lastRunningStep.ToString()]
            $prevStatus = if ($prevProp) { $prevProp.Value.status } else { '' }
            if ($prevStatus -ne 'error') {
                $stepBodies[$script:lastRunningStep].Visibility = [System.Windows.Visibility]::Collapsed
                $stepChevrons[$script:lastRunningStep].Text = [char]0x25B6 # ▶
            }
        }
        # Auto-expand the newly active step
        if ($stepBodies.ContainsKey($activeRunningStep)) {
            $stepBodies[$activeRunningStep].Visibility = [System.Windows.Visibility]::Visible
            $stepChevrons[$activeRunningStep].Text = [char]0x25BC # ▼
            $stepCards[$activeRunningStep].BringIntoView()
        }
        $script:lastRunningStep = $activeRunningStep
    }

    foreach ($s in $steps.PSObject.Properties) {
        $num   = [int]$s.Name
        $state = $s.Value
        if (-not $stepIcons.ContainsKey($num)) { continue }

        $icon  = $stepIcons[$num]
        $lbl   = $stepTexts[$num]
        $sub   = $stepSubs[$num]
        $card  = $stepCards[$num]
        $badge = $stepBadges[$num]
        $tb    = $stepTextBoxes[$num]
        $body  = $stepBodies[$num]
        $chev  = $stepChevrons[$num]

        if ($state.label -and $state.label.Trim() -ne '') {
            $lbl.Text = $state.label
        }

        if ($state.detail -and $state.detail.Trim() -ne '') {
            $sub.Text = $state.detail
            $sub.Visibility = [System.Windows.Visibility]::Visible
        } else {
            $sub.Visibility = [System.Windows.Visibility]::Collapsed
        }

        # Update step's live log output
        $logContent = if ($state.log) { $state.log } else { '' }
        if ($logContent -and $logContent -ne $stepLastLogs[$num]) {
            $stepLastLogs[$num] = $logContent
            $tb.Text = $logContent
            if ($body.Visibility -eq [System.Windows.Visibility]::Visible) {
                $tb.CaretIndex = $tb.Text.Length
                $tb.ScrollToEnd()
            }
        }

        switch ($state.status) {
            'pending' {
                $icon.Text       = '[ ]'
                $icon.Foreground = $grayFg
                $lbl.Foreground  = $grayFg
                $badge.border.Visibility = [System.Windows.Visibility]::Collapsed
                $card.Background = $cardBrush
                $card.BorderBrush = $borderBrush
            }
            'running' {
                $icon.Text       = '>>'
                $icon.Foreground = $blueFg
                $lbl.Foreground  = $mainFg
                $badge.border.Background = $blueBadgeBg
                $badge.text.Text = 'RUNNING'
                $badge.border.Visibility = [System.Windows.Visibility]::Visible
                $card.Background = $cardBrush
                $card.BorderBrush = $runningBdrBrush
            }
            'pass' {
                $icon.Text       = 'OK'
                $icon.Foreground = $greenFg
                $lbl.Foreground  = $mainFg
                $badge.border.Background = $greenBadgeBg
                $badge.text.Text = 'PASS'
                $badge.border.Visibility = [System.Windows.Visibility]::Visible
                $card.Background = $passBrush
                $card.BorderBrush = $borderBrush
            }
            'error' {
                $icon.Text       = 'ERR'
                $icon.Foreground = $redFg
                $lbl.Foreground  = $redFg
                $badge.border.Background = $redBadgeBg
                $badge.text.Text = 'FAILED'
                $badge.border.Visibility = [System.Windows.Visibility]::Visible
                $card.Background = $errBrush
                $card.BorderBrush = $redFg
                $hasError = $true

                # Always keep failed step accordion open so developer sees why it failed
                if ($body.Visibility -ne [System.Windows.Visibility]::Visible) {
                    $body.Visibility = [System.Windows.Visibility]::Visible
                    $chev.Text = [char]0x25BC # ▼
                    $card.BringIntoView()
                }
            }
            'skip' {
                $icon.Text       = '--'
                $icon.Foreground = $grayFg
                $lbl.Foreground  = $grayFg
                $badge.border.Background = $grayBadgeBg
                $badge.text.Text = 'SKIP'
                $badge.border.Visibility = [System.Windows.Visibility]::Visible
                $card.Background = $cardBrush
                $card.BorderBrush = $borderBrush
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
        for ($k = 1; $k -le 9; $k++) {
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
    activeStep: null,
    steps: {}
  };

  for (const s of getSteps()) {
    data.steps[s.id] = { status: 'pending', label: s.label, detail: '', log: '' };
  }

  writeProgressFile(data);
  launchWindowProcess();
}

/**
 * Marks a step as running with optional sub-details.
 */
export function startStep(stepId, detail = '') {
  if (!_windowEnabled) return;
  flushStepLogs();
  const data = readProgressFile();
  if (!data || !data.steps) return;
  if (data.steps[stepId]) {
    data.steps[stepId].status = 'running';
    data.steps[stepId].detail = detail;
    data.activeStep = stepId;
    if (detail && !data.steps[stepId].log) {
      data.steps[stepId].log = `▶ ${detail}\n`;
    }
  }
  writeProgressFile(data);
}

/**
 * Appends live output or process logs to a specific step.
 */
export function appendStepLog(stepId, text) {
  if (!_windowEnabled || !text) return;
  queueStepLog(stepId, text);
}

/**
 * Updates status of a step and optionally attaches detail note or AI report.
 */
export function updateStep(stepId, status, reportOrDetail = '') {
  if (!_windowEnabled) return;
  flushStepLogs();
  const data = readProgressFile();
  if (!data || !data.steps) return;
  if (data.steps[stepId]) {
    data.steps[stepId].status = status;
    const cleanReportOrDetail = stripAnsi(reportOrDetail);
    if (stepId !== 8) {
      data.steps[stepId].detail = cleanReportOrDetail;
    }
    if (cleanReportOrDetail && (!data.steps[stepId].log || !data.steps[stepId].log.includes(cleanReportOrDetail))) {
      const prefix = status === 'pass' ? '✔ ' : (status === 'error' ? '✖ ' : 'ℹ ');
      data.steps[stepId].log = (data.steps[stepId].log || '') + `${prefix}${cleanReportOrDetail}\n`;
    }
  }
  if (status === 'error') {
    data.hasError = true;
  }
  if (stepId === 8 && reportOrDetail) {
    data.aiReport = stripAnsi(reportOrDetail);
    if (data.steps[8] && !data.steps[8].log.includes(data.aiReport)) {
      data.steps[8].log = (data.steps[8].log || '') + `\n${data.aiReport}\n`;
    }
  }
  writeProgressFile(data);
}

/**
 * Finalizes validation pipeline.
 */
export function finalizeProgress(passed, finalReport = '', errorLog = '') {
  if (!_windowEnabled) return;
  flushStepLogs();
  const data = readProgressFile();
  if (!data) return;
  data.done = true;
  data.hasError = !passed;
  data.activeStep = null;
  if (finalReport) {
    data.aiReport = stripAnsi(finalReport);
    if (data.steps && data.steps[8] && !data.steps[8].log.includes(data.aiReport)) {
      data.steps[8].log = (data.steps[8].log || '') + `\n${data.aiReport}\n`;
    }
  }
  if (errorLog) {
    data.errorLog = stripAnsi(errorLog);
  }
  writeProgressFile(data);
}

