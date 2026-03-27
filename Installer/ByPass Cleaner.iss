#define MyAppName "ByPass Cleaner"
#ifndef MyAppVersion
  #define MyAppVersion "1.0.0"
#endif
#define MyAppPublisher "ByPass Cleaner"
#define MyAppExeName "ByPass Cleaner.exe"

#ifnexist "..\src-tauri\target\release\bypass-cleaner.exe"
  #error "Build src-tauri\\target\\release\\bypass-cleaner.exe first (tauri build)."
#endif

[Setup]
AppId={{5E1D18DE-1C77-4D4F-9A34-0FF40C133C79}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\Programs\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=Output
OutputBaseFilename=ByPass Cleaner Setup
SetupIconFile=..\src-tauri\icons\icon.ico
WizardImageFile=Assets\wizard.bmp
WizardSmallImageFile=Assets\wizard_small.bmp
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
UninstallDisplayIcon={app}\{#MyAppExeName}
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "russian"; MessagesFile: "compiler:Languages\Russian.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "..\src-tauri\target\release\bypass-cleaner.exe"; DestDir: "{app}"; DestName: "{#MyAppExeName}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[UninstallDelete]
Type: files; Name: "{app}\qt_settings.json"
Type: files; Name: "{app}\cleanup_report_*.json"
Type: filesandordirs; Name: "{app}\logs"
Type: filesandordirs; Name: "{localappdata}\{#MyAppName}"
Type: filesandordirs; Name: "{localappdata}\com.bypass.cleaner"
Type: filesandordirs; Name: "{userappdata}\com.bypass.cleaner"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
