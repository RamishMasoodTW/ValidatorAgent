/**
 * progress-window.js
 * Manages the live commit validation progress window for Angular Gatekeeper.
 *
 * Features:
 *  1. Native WPF GUI with UTF-8 BOM (zero unreadable / garbled text).
 *  2. Real-time live status updates (Pending -> Running -> PASS / FAILED / SKIP).
 *  3. Adaptive System Dark/Light theme matching.
 *  4. Topmost window ensures visibility above IDEs / GitHub Desktop.
 *  5. Expandable AI Architect Report Card displaying Gemini 2.5 Flash reviews.
 *  6. Interactive Close button.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';

const PROGRESS_FILE = path.join(os.tmpdir(), 'gk-progress.json');
const PS_SCRIPT     = path.join(os.tmpdir(), 'gk-progress-window.ps1');
const VBS_SCRIPT    = path.join(os.tmpdir(), 'gk-progress-launcher.vbs');

const STEPS = [
  { id: 1, label: '1. Angular Project Detection' },
  { id: 2, label: '2. Remote Repository Sync Check' },
  { id: 3, label: '3. Critical Architecture & Entry Points' },
  { id: 4, label: '4. Angular Build & TypeScript Compilation' },
  { id: 5, label: '5. Production Distribution Artifacts' },
  { id: 6, label: '6. Automated Build Versioning' },
  { id: 7, label: '7. Security & Secret Leak Scanning' },
  { id: 8, label: '8. AI Knowledge Base Audit (Gemini 3.6)' }
];

let _windowEnabled = false;

function writeProgressFile(data) {
  try {
    // Write with UTF-8 BOM so PowerShell parses cleanly
    const jsonStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(PROGRESS_FILE, '\uFEFF' + jsonStr, 'utf8');
  } catch (_) {}
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
  } catch (_) {}
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

$PROGRESS_FILE = "$env:TEMP\\gk-progress.json"

[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Angular Gatekeeper - Live Commit Validation"
        Width="580" Height="580"
        WindowStartupLocation="CenterScreen"
        Topmost="True"
        ResizeMode="NoResize"
        ShowInTaskbar="True"
        Background="$bg">
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

    <!-- AI Architect Report Card (Dynamically shown) -->
    <Border Grid.Row="2" x:Name="AiReportBorder" Margin="14,0,14,8" Padding="12" Background="$aiBoxBg" BorderBrush="$aiBoxBdr" BorderThickness="1" CornerRadius="6" Visibility="Collapsed">
      <StackPanel>
        <TextBlock Text="AI Knowledge Base Audit &amp; Insights:" FontWeight="Bold" FontSize="12" Foreground="$blueFg" Margin="0,0,0,6"/>
        <ScrollViewer MaxHeight="130" VerticalScrollBarVisibility="Auto">
          <TextBox x:Name="AiReportText" IsReadOnly="True" TextWrapping="Wrap" Background="Transparent" BorderThickness="0" Foreground="$fg" FontSize="11" FontFamily="Consolas, Segoe UI"/>
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
$aiReportTb     = $window.FindName('AiReportText')

$closeBtn.Add_Click({
    $window.Close()
})

$stepLabels = @(
  '1. Angular Project Detection',
  '2. Remote Repository Sync Check',
  '3. Critical Architecture & Entry Points',
  '4. Angular Build & TypeScript Compilation',
  '5. Production Distribution Artifacts',
  '6. Automated Build Versioning',
  '7. Security & Secret Leak Scanning',
  '8. AI Knowledge Base Audit (Gemini 3.6)'
)

$rowBorders = @{}
$rowIcons   = @{}
$rowTexts   = @{}
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
    [System.Windows.Controls.Grid]::SetColumn($lbl, 1)

    $badge = New-Object System.Windows.Controls.Border
    $badge.CornerRadius = New-Object System.Windows.CornerRadius(4)
    $badge.Padding      = New-Object System.Windows.Thickness(6, 2, 6, 2)
    $badge.Visibility   = [System.Windows.Visibility]::Collapsed
    $badgeTb = New-Object System.Windows.Controls.TextBlock
    $badgeTb.FontSize   = 10
    $badgeTb.FontWeight = [System.Windows.FontWeights]::Bold
    $badgeTb.Foreground = [System.Windows.Media.Brushes]::White
    $badge.Child = $badgeTb
    [System.Windows.Controls.Grid]::SetColumn($badge, 2)

    $grid.Children.Add($icon)  | Out-Null
    $grid.Children.Add($lbl)   | Out-Null
    $grid.Children.Add($badge) | Out-Null
    $row.Child = $grid
    $panel.Children.Add($row)  | Out-Null

    $rowBorders[$stepNum] = $row
    $rowIcons[$stepNum]   = $icon
    $rowTexts[$stepNum]   = $lbl
    $rowBadges[$stepNum]  = @{ border = $badge; text = $badgeTb }
}

$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromMilliseconds(250)
$autoCloseSeconds = 0

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
        $row   = $rowBorders[$num]
        $badge = $rowBadges[$num]

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

    # Show AI report if available
    if ($json.aiReport -and $json.aiReport.Trim() -ne '') {
        $aiReportTb.Text = $json.aiReport
        $aiReportBorder.Visibility = [System.Windows.Visibility]::Visible
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
  } catch (_) {}
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
    steps: {}
  };

  for (const s of STEPS) {
    data.steps[s.id] = { status: 'pending', label: s.label };
  }

  writeProgressFile(data);
  launchWindowProcess();
}

/**
 * Marks a step as running.
 */
export function startStep(stepId) {
  if (!_windowEnabled) return;
  const data = readProgressFile();
  if (!data) return;
  if (data.steps[stepId]) data.steps[stepId].status = 'running';
  writeProgressFile(data);
}

/**
 * Updates status of a step and optionally attaches report text.
 */
export function updateStep(stepId, status, report = '') {
  if (!_windowEnabled) return;
  const data = readProgressFile();
  if (!data) return;
  if (data.steps[stepId]) data.steps[stepId].status = status;
  if (status === 'error') {
    data.hasError = true;
  }
  if (report) {
    data.aiReport = report;
  }
  writeProgressFile(data);
}

/**
 * Finalizes validation pipeline.
 */
export function finalizeProgress(passed, finalReport = '') {
  if (!_windowEnabled) return;
  const data = readProgressFile();
  if (!data) return;
  data.done = true;
  data.hasError = !passed;
  if (finalReport) {
    data.aiReport = finalReport;
  }
  writeProgressFile(data);
}
