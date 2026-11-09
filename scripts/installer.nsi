; ==============================================================================
; DodaZip Modern Windows Installer Script (NSIS 3.x)
; ==============================================================================

!define PRODUCT_NAME "DodaZip"
!define PRODUCT_VERSION "0.2.0"
!define PRODUCT_PUBLISHER "DodaTech"
!define PRODUCT_WEB_SITE "https://dodatech.com/docs/dodazip/"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\dodazip-ui.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define PRODUCT_UNINST_ROOT_KEY "HKCU"

SetCompressor /SOLID lzma

; Modern UI 2
!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "nsDialogs.nsh"
!include "LogicLib.nsh"

; Variables for File Association Page
Var Dialog
Var Hwnd_Dzip
Var Hwnd_Zip
Var Hwnd_7z
Var Hwnd_Rar
Var Hwnd_Tar
Var Hwnd_Iso
Var Hwnd_Cab
Var Hwnd_Unix
Var Hwnd_Pkgs

Var State_Dzip
Var State_Zip
Var State_7z
Var State_Rar
Var State_Tar
Var State_Iso
Var State_Cab
Var State_Unix
Var State_Pkgs

; General
Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "..\dist\DodaZip-Setup-v0.2.0.exe"
InstallDir "$LOCALAPPDATA\Programs\${PRODUCT_NAME}"
InstallDirRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_DIR_REGKEY}" ""
RequestExecutionLevel user

; Icons
!define MUI_ICON "..\src-tauri\icons\icon.ico"
!define MUI_UNICON "..\src-tauri\icons\icon.ico"

; Interface Settings
!define MUI_ABORTWARNING

; Installer Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
Page custom AssociationPage AssociationPageLeave
!insertmacro MUI_PAGE_INSTFILES

; Finish Page: Option to launch DodaZip
!define MUI_FINISHPAGE_RUN "$INSTDIR\dodazip-ui.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch DodaZip now"
!insertmacro MUI_PAGE_FINISH

; Uninstaller Pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Languages
!insertmacro MUI_LANGUAGE "English"

; ==============================================================================
; Initialization & Custom Association Page
; ==============================================================================
Function .onInit
  ; All archive formats selected as default
  StrCpy $State_Dzip 1
  StrCpy $State_Zip 1
  StrCpy $State_7z 1
  StrCpy $State_Rar 1
  StrCpy $State_Tar 1
  StrCpy $State_Iso 1
  StrCpy $State_Cab 1
  StrCpy $State_Unix 1
  StrCpy $State_Pkgs 1
FunctionEnd

Function AssociationPage
  !insertmacro MUI_HEADER_TEXT "File Associations" "Choose which archive formats DodaZip should open by default"

  nsDialogs::Create 1018
  Pop $Dialog
  ${If} $Dialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 24u "Select the archive formats you would like DodaZip to open by default:$\r$\n(You can change these associations at any time later in Settings)"
  Pop $0

  ; Column 1 (Left: 10u to 140u)
  ${NSD_CreateCheckbox} 10u 28u 130u 12u ".dzip (DodaZip Secure Vault)"
  Pop $Hwnd_Dzip
  ${NSD_SetState} $Hwnd_Dzip $State_Dzip

  ${NSD_CreateCheckbox} 10u 44u 130u 12u ".zip (ZIP Archive)"
  Pop $Hwnd_Zip
  ${NSD_SetState} $Hwnd_Zip $State_Zip

  ${NSD_CreateCheckbox} 10u 60u 130u 12u ".7z (7-Zip Archive)"
  Pop $Hwnd_7z
  ${NSD_SetState} $Hwnd_7z $State_7z

  ${NSD_CreateCheckbox} 10u 76u 130u 12u ".rar (RAR Archive)"
  Pop $Hwnd_Rar
  ${NSD_SetState} $Hwnd_Rar $State_Rar

  ${NSD_CreateCheckbox} 10u 92u 130u 12u ".tar (TAR Tarball)"
  Pop $Hwnd_Tar
  ${NSD_SetState} $Hwnd_Tar $State_Tar

  ; Column 2 (Right: 155u to 290u)
  ${NSD_CreateCheckbox} 155u 28u 135u 12u ".iso (Disc Image)"
  Pop $Hwnd_Iso
  ${NSD_SetState} $Hwnd_Iso $State_Iso

  ${NSD_CreateCheckbox} 155u 44u 135u 12u ".cab (Windows Cabinet)"
  Pop $Hwnd_Cab
  ${NSD_SetState} $Hwnd_Cab $State_Cab

  ${NSD_CreateCheckbox} 155u 60u 135u 12u ".gz, .bz2, .xz (Compressed)"
  Pop $Hwnd_Unix
  ${NSD_SetState} $Hwnd_Unix $State_Unix

  ${NSD_CreateCheckbox} 155u 76u 135u 12u ".deb, .dmg (Packages/Images)"
  Pop $Hwnd_Pkgs
  ${NSD_SetState} $Hwnd_Pkgs $State_Pkgs

  ; Select All and Deselect All Buttons
  ${NSD_CreateButton} 10u 114u 65u 14u "Select All"
  Pop $0
  ${NSD_OnClick} $0 OnSelectAll

  ${NSD_CreateButton} 80u 114u 65u 14u "Deselect All"
  Pop $0
  ${NSD_OnClick} $0 OnDeselectAll

  nsDialogs::Show
FunctionEnd

Function OnSelectAll
  Pop $0
  ${NSD_SetState} $Hwnd_Dzip 1
  ${NSD_SetState} $Hwnd_Zip 1
  ${NSD_SetState} $Hwnd_7z 1
  ${NSD_SetState} $Hwnd_Rar 1
  ${NSD_SetState} $Hwnd_Tar 1
  ${NSD_SetState} $Hwnd_Iso 1
  ${NSD_SetState} $Hwnd_Cab 1
  ${NSD_SetState} $Hwnd_Unix 1
  ${NSD_SetState} $Hwnd_Pkgs 1
FunctionEnd

Function OnDeselectAll
  Pop $0
  ${NSD_SetState} $Hwnd_Dzip 0
  ${NSD_SetState} $Hwnd_Zip 0
  ${NSD_SetState} $Hwnd_7z 0
  ${NSD_SetState} $Hwnd_Rar 0
  ${NSD_SetState} $Hwnd_Tar 0
  ${NSD_SetState} $Hwnd_Iso 0
  ${NSD_SetState} $Hwnd_Cab 0
  ${NSD_SetState} $Hwnd_Unix 0
  ${NSD_SetState} $Hwnd_Pkgs 0
FunctionEnd

Function AssociationPageLeave
  ${NSD_GetState} $Hwnd_Dzip $State_Dzip
  ${NSD_GetState} $Hwnd_Zip $State_Zip
  ${NSD_GetState} $Hwnd_7z $State_7z
  ${NSD_GetState} $Hwnd_Rar $State_Rar
  ${NSD_GetState} $Hwnd_Tar $State_Tar
  ${NSD_GetState} $Hwnd_Iso $State_Iso
  ${NSD_GetState} $Hwnd_Cab $State_Cab
  ${NSD_GetState} $Hwnd_Unix $State_Unix
  ${NSD_GetState} $Hwnd_Pkgs $State_Pkgs
FunctionEnd

; ==============================================================================
; Installation Section
; ==============================================================================
Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite on

  ; Install Binaries and Assets
  File "..\target\release\dodazip-ui.exe"
  File "..\target\release\dodazip.exe"
  File "..\target\release\WebView2Loader.dll"
  File "..\src-tauri\icons\icon.ico"
  File "..\src-tauri\icons\dzip_file.ico"
  File "..\README.md"
  File "..\LICENSE-MIT"
  File "..\LICENSE-APACHE"

  ; Create Start Menu Shortcuts
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\dodazip-ui.exe" "" "$INSTDIR\icon.ico" 0
  CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\Uninstall ${PRODUCT_NAME}.lnk" "$INSTDIR\uninstall.exe" "" "$INSTDIR\icon.ico" 0

  ; Create Desktop Shortcut
  CreateShortcut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\dodazip-ui.exe" "" "$INSTDIR\icon.ico" 0

  ; Create SendTo Shortcut: Right-click -> Send to -> DodaZip
  CreateShortcut "$SENDTO\DodaZip.lnk" "$INSTDIR\dodazip-ui.exe" "" "$INSTDIR\icon.ico" 0

  ; Register Explorer SystemFileAssociations for Archives
  !macro RegisterSFA EXT
    WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.${EXT}\shell\DodaZipOpen" "" "Open in DodaZip"
    WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.${EXT}\shell\DodaZipOpen" "Icon" '"$INSTDIR\icon.ico"'
    WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.${EXT}\shell\DodaZipOpen\command" "" '"$INSTDIR\dodazip-ui.exe" "%1"'
    WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.${EXT}\shell\DodaZipExtractHere" "" "Extract Here"
    WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.${EXT}\shell\DodaZipExtractHere" "Icon" '"$INSTDIR\icon.ico"'
    WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.${EXT}\shell\DodaZipExtractHere\command" "" '"$INSTDIR\dodazip-ui.exe" --extract-here "%1"'
    WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.${EXT}\shell\DodaZipExtractTo" "" "Extract to subfolder"
    WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.${EXT}\shell\DodaZipExtractTo" "Icon" '"$INSTDIR\icon.ico"'
    WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.${EXT}\shell\DodaZipExtractTo\command" "" '"$INSTDIR\dodazip-ui.exe" --extract-to "%1"'
  !macroend

  !macro RegisterAssociation EXT FRIENDLY_NAME
    WriteRegStr HKCU "Software\Classes\.${EXT}" "" "DodaZip.${EXT}"
    WriteRegStr HKCU "Software\Classes\.${EXT}" "PerceivedType" "compressed"
    WriteRegStr HKCU "Software\Classes\DodaZip.${EXT}" "" "DodaZip ${FRIENDLY_NAME} (.${EXT})"
    WriteRegStr HKCU "Software\Classes\DodaZip.${EXT}\DefaultIcon" "" "$INSTDIR\icon.ico,0"
    WriteRegStr HKCU "Software\Classes\DodaZip.${EXT}\shell\open" "" "Open in DodaZip"
    WriteRegStr HKCU "Software\Classes\DodaZip.${EXT}\shell\open\command" "" '"$INSTDIR\dodazip-ui.exe" "%1"'
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.${EXT}\OpenWithProgids" "DodaZip.${EXT}" ""
  !macroend

  ; Register Context Menu for Files and Folders: "Add to Archive with DodaZip"
  WriteRegStr HKCU "Software\Classes\*\shell\DodaZipCompress" "" "Add to Archive with DodaZip"
  WriteRegStr HKCU "Software\Classes\*\shell\DodaZipCompress" "Icon" '"$INSTDIR\icon.ico"'
  WriteRegStr HKCU "Software\Classes\*\shell\DodaZipCompress\command" "" '"$INSTDIR\dodazip-ui.exe" "%1"'

  WriteRegStr HKCU "Software\Classes\Directory\shell\DodaZipCompress" "" "Add to Archive with DodaZip"
  WriteRegStr HKCU "Software\Classes\Directory\shell\DodaZipCompress" "Icon" '"$INSTDIR\icon.ico"'
  WriteRegStr HKCU "Software\Classes\Directory\shell\DodaZipCompress\command" "" '"$INSTDIR\dodazip-ui.exe" "%1"'

  ; Register Selected File Associations
  ${If} $State_Dzip == 1
    WriteRegStr HKCU "Software\Classes\.dzip" "" "DodaZip.Vault"
    WriteRegStr HKCU "Software\Classes\.dzip" "Content Type" "application/x-dzip"
    WriteRegStr HKCU "Software\Classes\.dzip" "PerceivedType" "compressed"
    WriteRegStr HKCU "Software\Classes\DodaZip.Vault" "" "DodaZip Encrypted Vault"
    WriteRegStr HKCU "Software\Classes\DodaZip.Vault\DefaultIcon" "" "$INSTDIR\dzip_file.ico,0"
    WriteRegStr HKCU "Software\Classes\DodaZip.Vault\shell\open" "" "Browse in DodaZip"
    WriteRegStr HKCU "Software\Classes\DodaZip.Vault\shell\open\command" "" '"$INSTDIR\dodazip-ui.exe" "%1"'
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.dzip\OpenWithProgids" "DodaZip.Vault" ""
    !insertmacro RegisterSFA "dzip"
  ${EndIf}

  ${If} $State_Zip == 1
    !insertmacro RegisterAssociation "zip" "ZIP Archive"
    !insertmacro RegisterSFA "zip"
  ${EndIf}

  ${If} $State_7z == 1
    !insertmacro RegisterAssociation "7z" "7-Zip Archive"
    !insertmacro RegisterSFA "7z"
  ${EndIf}

  ${If} $State_Rar == 1
    !insertmacro RegisterAssociation "rar" "RAR Archive"
    !insertmacro RegisterSFA "rar"
  ${EndIf}

  ${If} $State_Tar == 1
    !insertmacro RegisterAssociation "tar" "TAR Archive"
    !insertmacro RegisterSFA "tar"
  ${EndIf}

  ${If} $State_Iso == 1
    !insertmacro RegisterAssociation "iso" "Disc Image"
    !insertmacro RegisterSFA "iso"
  ${EndIf}

  ${If} $State_Cab == 1
    !insertmacro RegisterAssociation "cab" "Windows Cabinet"
    !insertmacro RegisterSFA "cab"
  ${EndIf}

  ${If} $State_Unix == 1
    !insertmacro RegisterAssociation "gz" "GZIP Compressed File"
    !insertmacro RegisterAssociation "bz2" "BZIP2 Compressed File"
    !insertmacro RegisterAssociation "xz" "XZ Compressed File"
    !insertmacro RegisterSFA "gz"
    !insertmacro RegisterSFA "bz2"
    !insertmacro RegisterSFA "xz"
  ${EndIf}

  ${If} $State_Pkgs == 1
    !insertmacro RegisterAssociation "deb" "Debian Package"
    !insertmacro RegisterAssociation "dmg" "Apple Disk Image"
    !insertmacro RegisterSFA "deb"
    !insertmacro RegisterSFA "dmg"
  ${EndIf}

  ; Refresh Windows Explorer Shell Icon Cache
  System::Call 'shell32.dll::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'

  ; Register with Windows Add/Remove Programs
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\dodazip-ui.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\icon.ico"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"

  ; Estimate installed size (in KB)
  WriteRegDWORD ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "EstimatedSize" 15000

  ; Create Uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

; ==============================================================================
; Uninstallation Section
; ==============================================================================
Section "Uninstall"
  ; Remove Files
  Delete "$INSTDIR\dodazip-ui.exe"
  Delete "$INSTDIR\dodazip.exe"
  Delete "$INSTDIR\WebView2Loader.dll"
  Delete "$INSTDIR\icon.ico"
  Delete "$INSTDIR\dzip_file.ico"
  Delete "$INSTDIR\README.md"
  Delete "$INSTDIR\LICENSE-MIT"
  Delete "$INSTDIR\LICENSE-APACHE"
  Delete "$INSTDIR\uninstall.exe"

  ; Remove Shortcuts
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\Uninstall ${PRODUCT_NAME}.lnk"
  RMDir "$SMPROGRAMS\${PRODUCT_NAME}"
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  Delete "$SENDTO\DodaZip.lnk"

  ; Remove Registry Keys
  DeleteRegKey HKCU "Software\Classes\DodaZip.Vault"
  DeleteRegKey HKCU "Software\Classes\DodaZip.zip"
  DeleteRegKey HKCU "Software\Classes\DodaZip.7z"
  DeleteRegKey HKCU "Software\Classes\DodaZip.rar"
  DeleteRegKey HKCU "Software\Classes\DodaZip.tar"
  DeleteRegKey HKCU "Software\Classes\DodaZip.iso"
  DeleteRegKey HKCU "Software\Classes\DodaZip.cab"
  DeleteRegKey HKCU "Software\Classes\DodaZip.deb"
  DeleteRegKey HKCU "Software\Classes\DodaZip.dmg"
  DeleteRegKey HKCU "Software\Classes\DodaZip.gz"
  DeleteRegKey HKCU "Software\Classes\DodaZip.bz2"
  DeleteRegKey HKCU "Software\Classes\DodaZip.xz"
  DeleteRegKey HKCU "Software\Classes\.dzip"
  DeleteRegKey HKCU "Software\Classes\*\shell\DodaZipCompress"
  DeleteRegKey HKCU "Software\Classes\Directory\shell\DodaZipCompress"

  ; Clean up SystemFileAssociations
  !macro UnregisterSFA EXT
    DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.${EXT}\shell\DodaZipOpen"
    DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.${EXT}\shell\DodaZipExtractHere"
    DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.${EXT}\shell\DodaZipExtractTo"
  !macroend

  !insertmacro UnregisterSFA "dzip"
  !insertmacro UnregisterSFA "zip"
  !insertmacro UnregisterSFA "7z"
  !insertmacro UnregisterSFA "rar"
  !insertmacro UnregisterSFA "tar"
  !insertmacro UnregisterSFA "gz"
  !insertmacro UnregisterSFA "bz2"
  !insertmacro UnregisterSFA "xz"
  !insertmacro UnregisterSFA "iso"
  !insertmacro UnregisterSFA "cab"

  DeleteRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_DIR_REGKEY}"
  DeleteRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}"

  ; Remove Installation Directory
  RMDir "$INSTDIR"

  ; Notify Shell
  System::Call 'shell32.dll::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
SectionEnd
