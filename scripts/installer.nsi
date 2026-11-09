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

  ; Register File Association for .dzip
  WriteRegStr HKCU "Software\Classes\.dzip" "" "DodaZip.Vault"
  WriteRegStr HKCU "Software\Classes\.dzip" "Content Type" "application/x-dzip"
  WriteRegStr HKCU "Software\Classes\.dzip" "PerceivedType" "compressed"

  WriteRegStr HKCU "Software\Classes\DodaZip.Vault" "" "DodaZip Encrypted Vault"
  WriteRegStr HKCU "Software\Classes\DodaZip.Vault\DefaultIcon" "" "$INSTDIR\dzip_file.ico,0"
  WriteRegStr HKCU "Software\Classes\DodaZip.Vault\shell\open" "" "Browse in DodaZip"
  WriteRegStr HKCU "Software\Classes\DodaZip.Vault\shell\open\command" "" '"$INSTDIR\dodazip-ui.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\DodaZip.Vault\shell\extract_here" "" "Extract Here"
  WriteRegStr HKCU "Software\Classes\DodaZip.Vault\shell\extract_here" "Icon" '"$INSTDIR\icon.ico"'
  WriteRegStr HKCU "Software\Classes\DodaZip.Vault\shell\extract_here\command" "" '"$INSTDIR\dodazip-ui.exe" --extract-here "%1"'
  WriteRegStr HKCU "Software\Classes\DodaZip.Vault\shell\extract_to" "" "Extract to subfolder"
  WriteRegStr HKCU "Software\Classes\DodaZip.Vault\shell\extract_to" "Icon" '"$INSTDIR\icon.ico"'
  WriteRegStr HKCU "Software\Classes\DodaZip.Vault\shell\extract_to\command" "" '"$INSTDIR\dodazip-ui.exe" --extract-to "%1"'

  ; Register Context Menu for Files and Folders: "Add to Archive with DodaZip"
  WriteRegStr HKCU "Software\Classes\*\shell\DodaZipCompress" "" "Add to Archive with DodaZip"
  WriteRegStr HKCU "Software\Classes\*\shell\DodaZipCompress" "Icon" '"$INSTDIR\icon.ico"'
  WriteRegStr HKCU "Software\Classes\*\shell\DodaZipCompress\command" "" '"$INSTDIR\dodazip-ui.exe" "%1"'

  WriteRegStr HKCU "Software\Classes\Directory\shell\DodaZipCompress" "" "Add to Archive with DodaZip"
  WriteRegStr HKCU "Software\Classes\Directory\shell\DodaZipCompress" "Icon" '"$INSTDIR\icon.ico"'
  WriteRegStr HKCU "Software\Classes\Directory\shell\DodaZipCompress\command" "" '"$INSTDIR\dodazip-ui.exe" "%1"'

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

  !insertmacro RegisterSFA "dzip"
  !insertmacro RegisterSFA "zip"
  !insertmacro RegisterSFA "7z"
  !insertmacro RegisterSFA "rar"
  !insertmacro RegisterSFA "tar"
  !insertmacro RegisterSFA "gz"
  !insertmacro RegisterSFA "bz2"
  !insertmacro RegisterSFA "xz"
  !insertmacro RegisterSFA "iso"
  !insertmacro RegisterSFA "cab"

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
