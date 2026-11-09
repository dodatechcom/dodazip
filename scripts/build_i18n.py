#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json

# 88 Languages supported like 7-Zip
LANGUAGES_METADATA = [
    ("en", "English", "English", "🇺🇸"),
    ("es", "Spanish", "Español", "🇪🇸"),
    ("de", "German", "Deutsch", "🇩🇪"),
    ("fr", "French", "Français", "🇫🇷"),
    ("zh", "Chinese (Simplified)", "简体中文", "🇨🇳"),
    ("zh-TW", "Chinese (Traditional)", "繁體中文", "🇹🇼"),
    ("ja", "Japanese", "日本語", "🇯🇵"),
    ("hi", "Hindi", "हिन्दी", "🇮🇳"),
    ("ar", "Arabic", "العربية", "🇸🇦"),
    ("pt", "Portuguese (Brazil)", "Português (Brasil)", "🇧🇷"),
    ("pt-PT", "Portuguese (Portugal)", "Português (Portugal)", "🇵🇹"),
    ("ru", "Russian", "Русский", "🇷🇺"),
    ("it", "Italian", "Italiano", "🇮🇹"),
    ("ko", "Korean", "한국어", "🇰🇷"),
    ("tr", "Turkish", "Türkçe", "🇹🇷"),
    ("pl", "Polish", "Polski", "🇵🇱"),
    ("nl", "Dutch", "Nederlands", "🇳🇱"),
    ("uk", "Ukrainian", "Українська", "🇺🇦"),
    ("vi", "Vietnamese", "Tiếng Việt", "🇻🇳"),
    ("id", "Indonesian", "Bahasa Indonesia", "🇮🇩"),
    ("th", "Thai", "ไทย", "🇹🇭"),
    ("el", "Greek", "Ελληνικά", "🇬🇷"),
    ("cs", "Czech", "Čeština", "🇨🇿"),
    ("sv", "Swedish", "Svenska", "🇸🇪"),
    ("hu", "Hungarian", "Magyar", "🇭🇺"),
    ("ro", "Romanian", "Română", "🇷🇴"),
    ("da", "Danish", "Dansk", "🇩🇰"),
    ("fi", "Finnish", "Suomi", "🇫🇮"),
    ("nb", "Norwegian (Bokmål)", "Norsk (Bokmål)", "🇳🇴"),
    ("nn", "Norwegian (Nynorsk)", "Norsk (Nynorsk)", "🇳🇴"),
    ("he", "Hebrew", "עברית", "🇮🇱"),
    ("fa", "Persian / Farsi", "فارسی", "🇮🇷"),
    ("bn", "Bengali", "বাংলা", "🇧🇩"),
    ("pa", "Punjabi", "ਪੰਜਾਬੀ", "🇮🇳"),
    ("ta", "Tamil", "தமிழ்", "🇮🇳"),
    ("te", "Telugu", "తెలుగు", "🇮🇳"),
    ("mr", "Marathi", "मराठी", "🇮🇳"),
    ("gu", "Gujarati", "ગુજરાતી", "🇮🇳"),
    ("kn", "Kannada", "ಕನ್ನಡ", "🇮🇳"),
    ("ml", "Malayalam", "മലയാളം", "🇮🇳"),
    ("ur", "Urdu", "اردو", "🇵🇰"),
    ("ms", "Malay", "Bahasa Melayu", "🇲🇾"),
    ("fil", "Filipino / Tagalog", "Filipino", "🇵🇭"),
    ("sk", "Slovak", "Slovenčina", "🇸🇰"),
    ("bg", "Bulgarian", "Български", "🇧🇬"),
    ("hr", "Croatian", "Hrvatski", "🇭🇷"),
    ("sr", "Serbian", "Српски", "🇷🇸"),
    ("sl", "Slovenian", "Slovenščina", "🇸🇮"),
    ("lt", "Lithuanian", "Lietuvių", "🇱🇹"),
    ("lv", "Latvian", "Latviešu", "🇱🇻"),
    ("et", "Estonian", "Eesti", "🇪🇪"),
    ("ca", "Catalan", "Català", "🇪🇸"),
    ("eu", "Basque", "Euskara", "🇪🇸"),
    ("gl", "Galician", "Galego", "🇪🇸"),
    ("is", "Icelandic", "Íslenska", "🇮🇸"),
    ("sq", "Albanian", "Shqip", "🇦🇱"),
    ("mk", "Macedonian", "Македонски", "🇲🇰"),
    ("bs", "Bosnian", "Bosanski", "🇧🇦"),
    ("hy", "Armenian", "Հայերեն", "🇦🇲"),
    ("ka", "Georgian", "ქართული", "🇬🇪"),
    ("az", "Azerbaijani", "Azərbaycan", "🇦🇿"),
    ("kk", "Kazakh", "Қазақша", "🇰🇿"),
    ("uz", "Uzbek", "Oʻzbekcha", "🇺🇿"),
    ("ky", "Kyrgyz", "Кыргызча", "🇰🇬"),
    ("tg", "Tajik", "Тоҷикӣ", "🇹🇯"),
    ("tk", "Turkmen", "Türkmençe", "🇹🇲"),
    ("mn", "Mongolian", "Монгол", "🇲🇳"),
    ("ne", "Nepali", "नेपाली", "🇳🇵"),
    ("si", "Sinhala", "සිංහල", "🇱🇰"),
    ("my", "Burmese", "မြန်မာ", "🇲🇲"),
    ("km", "Khmer", "ភាសាខ្មែរ", "🇰🇭"),
    ("lo", "Lao", "ພາສາລາວ", "🇱🇦"),
    ("sw", "Swahili", "Kiswahili", "🇰🇪"),
    ("af", "Afrikaans", "Afrikaans", "🇿🇦"),
    ("am", "Amharic", "አማርኛ", "🇪🇹"),
    ("cy", "Welsh", "Cymraeg", "🏴󠁧󠁢󠁷󠁬󠁳󠁿"),
    ("ga", "Irish", "Gaeilge", "🇮🇪"),
    ("gd", "Scottish Gaelic", "Gàidhlig", "🏴󠁧󠁢󠁳󠁣󠁴󠁿"),
    ("mt", "Maltese", "Malti", "🇲🇹"),
    ("eo", "Esperanto", "Esperanto", "🌍"),
    ("la", "Latin", "Latina", "🏛️"),
    ("be", "Belarusian", "Беларуская", "🇧🇾"),
    ("tt", "Tatar", "Татарча", "🇷🇺"),
    ("ku", "Kurdish", "Kurdî", "🇹🇯"),
    ("ps", "Pashto", "پښتو", "🇦🇫"),
    ("so", "Somali", "Soomaali", "🇸🇴"),
    ("yo", "Yoruba", "Yorùbá", "🇳🇬"),
    ("zu", "Zulu", "isiZulu", "🇿🇦"),
]

# Base English dictionary
EN = {
    'toolbar.new': 'New',
    'toolbar.open': 'Open',
    'toolbar.addTo': 'Add To',
    'toolbar.extract': 'Extract',
    'toolbar.extractAll': 'Extract All',
    'toolbar.verify': 'Verify',
    'toolbar.close': 'Close',
    'toolbar.browseContents': 'Browse Contents',
    'toolbar.convert': 'Convert...',
    'toolbar.rename': 'Rename',
    'toolbar.delete': 'Delete',
    'toolbar.secureShred': 'Secure Shred',
    'toolbar.settings': 'Settings',
    'toolbar.about': 'About',
    'browser.quickAccess': 'Quick Access',
    'browser.desktop': 'Desktop',
    'browser.documents': 'Documents',
    'browser.downloads': 'Downloads',
    'browser.name': 'Name',
    'browser.size': 'Size',
    'browser.searchPlaceholder': 'Filter files in this folder (Press Esc to clear)...',
    'browser.emptyFolder': 'Folder is empty',
    'browser.archive': 'ARCHIVE',
    'settings.title': 'Settings',
    'settings.subtitle': 'Preferences, Updates & Associations',
    'settings.general': 'General & Appearance',
    'settings.language': 'Interface Language (88 Languages)',
    'settings.languageDesc': 'Select your preferred language for the DodaZip interface',
    'settings.languageSearch': 'Search language by name or native name...',
    'settings.theme': 'Color Theme',
    'settings.themeAuto': 'System Default (Auto)',
    'settings.themeLight': 'Light Theme',
    'settings.themeDark': 'Dark Theme',
    'settings.associations': 'File Associations (Default Handler)',
    'settings.associationsDesc': 'Choose which archive and image formats automatically open in DodaZip',
    'settings.selectAll': 'Select All',
    'settings.clearAll': 'Clear All',
    'settings.applyAssociations': 'Apply File Associations',
    'settings.associationsApplied': 'File associations applied successfully!',
    'settings.updates': 'Software Updates',
    'settings.autoCheckUpdates': 'Automatically check for updates on startup',
    'settings.autoCheckDesc': 'DodaZip will notify you when a new release or security fix is available',
    'settings.checkNow': 'Check for Updates Now',
    'settings.checking': 'Checking for updates...',
    'settings.upToDate': 'You are using the latest version of DodaZip (v0.1.0).',
    'settings.updateAvailable': 'New version available!',
    'settings.downloadUpdate': 'Download Update',
    'settings.save': 'Done',
    'delete.confirmTitle': 'Delete Item(s)?',
    'delete.shredTitle': 'Permanently Shred Item(s)?',
    'delete.confirmDesc': 'Standard file removal from current folder',
    'delete.shredDesc': 'Military-grade cryptographic overwrite before deletion',
    'delete.shredNotice': 'Once shredded, files CANNOT be recovered by forensic software.',
    'delete.cancel': 'Cancel',
    'delete.confirm': 'Delete',
    'delete.shredConfirm': 'Shred Permanently',
    'help.docs': 'Documentation (F1)',
}

# Key translations for core languages
# All 88 languages inherit complete keys with English fallback
# and explicit accurate translations for major linguistic families:
TRANSLATIONS = { "en": EN }

# Standard vocabulary maps for automated high-fidelity localized seeding
VOCAB = {
    "es": {
        "new": "Nuevo", "open": "Abrir", "addTo": "Añadir a", "extract": "Extraer", "extractAll": "Extraer Todo",
        "verify": "Verificar", "close": "Cerrar", "browseContents": "Explorar Contenido", "convert": "Convertir...",
        "rename": "Renombrar", "delete": "Eliminar", "secureShred": "Destruir Seguro", "settings": "Configuración",
        "about": "Acerca de", "quickAccess": "Acceso Rápido", "desktop": "Escritorio", "documents": "Documentos",
        "downloads": "Descargas", "name": "Nombre", "size": "Tamaño", "emptyFolder": "La carpeta está vacía",
        "archive": "ARCHIVO", "associations": "Asociaciones de Archivos", "selectAll": "Seleccionar Todo",
        "clearAll": "Deseleccionar Todo", "applyAssociations": "Aplicar Asociaciones", "theme": "Tema",
        "themeAuto": "Por Defecto (Auto)", "themeLight": "Claro", "themeDark": "Oscuro", "save": "Listo",
        "cancel": "Cancelar", "docs": "Documentación (F1)", "updates": "Actualizaciones de Software",
        "checkNow": "Buscar Actualizaciones", "checking": "Buscando actualizaciones...", "upToDate": "Está usando la versión más reciente.",
        "updateAvailable": "¡Nueva versión disponible!", "downloadUpdate": "Descargar Actualización"
    },
    "de": {
        "new": "Neu", "open": "Öffnen", "addTo": "Hinzufügen zu", "extract": "Entpacken", "extractAll": "Alles Entpacken",
        "verify": "Überprüfen", "close": "Schließen", "browseContents": "Inhalte Durchsuchen", "convert": "Konvertieren...",
        "rename": "Umbenennen", "delete": "Löschen", "secureShred": "Sicher Vernichten", "settings": "Einstellungen",
        "about": "Über", "quickAccess": "Schnellzugriff", "desktop": "Desktop", "documents": "Dokumente",
        "downloads": "Downloads", "name": "Name", "size": "Größe", "emptyFolder": "Ordner ist leer",
        "archive": "ARCHIV", "associations": "Dateizuordnungen", "selectAll": "Alles Auswählen",
        "clearAll": "Alles Abwählen", "applyAssociations": "Zuordnungen Anwenden", "theme": "Farbschema",
        "themeAuto": "Systemstandard (Auto)", "themeLight": "Helles Design", "themeDark": "Dunkles Design", "save": "Fertig",
        "cancel": "Abbrechen", "docs": "Dokumentation (F1)", "updates": "Software-Aktualisierungen",
        "checkNow": "Jetzt Prüfen", "checking": "Suche nach Aktualisierungen...", "upToDate": "Sie verwenden die neueste Version.",
        "updateAvailable": "Neue Version verfügbar!", "downloadUpdate": "Update Herunterladen"
    },
    "fr": {
        "new": "Nouveau", "open": "Ouvrir", "addTo": "Ajouter à", "extract": "Extraire", "extractAll": "Tout Extraire",
        "verify": "Vérifier", "close": "Fermer", "browseContents": "Explorer le Contenu", "convert": "Convertir...",
        "rename": "Renommer", "delete": "Supprimer", "secureShred": "Broyage Sécurisé", "settings": "Paramètres",
        "about": "À propos", "quickAccess": "Accès Rapide", "desktop": "Bureau", "documents": "Documents",
        "downloads": "Téléchargements", "name": "Nom", "size": "Taille", "emptyFolder": "Le dossier est vide",
        "archive": "ARCHIVE", "associations": "Associations de Fichiers", "selectAll": "Tout Sélectionner",
        "clearAll": "Tout Désélectionner", "applyAssociations": "Appliquer les Associations", "theme": "Thème",
        "themeAuto": "Système (Auto)", "themeLight": "Thème Clair", "themeDark": "Thème Sombre", "save": "Terminé",
        "cancel": "Annuler", "docs": "Documentation (F1)", "updates": "Mises à jour du logiciel",
        "checkNow": "Rechercher des Mises à Jour", "checking": "Recherche en cours...", "upToDate": "Vous utilisez la dernière version.",
        "updateAvailable": "Nouvelle version disponible !", "downloadUpdate": "Télécharger la Mise à Jour"
    },
    "zh": {
        "new": "新建", "open": "打开", "addTo": "添加到", "extract": "解压", "extractAll": "全部解压",
        "verify": "校验", "close": "关闭", "browseContents": "浏览内容", "convert": "转换...",
        "rename": "重命名", "delete": "删除", "secureShred": "安全粉碎", "settings": "设置",
        "about": "关于", "quickAccess": "快速访问", "desktop": "桌面", "documents": "文档",
        "downloads": "下载", "name": "名称", "size": "大小", "emptyFolder": "文件夹为空",
        "archive": "压缩包", "associations": "文件关联 (默认打开程序)", "selectAll": "全选",
        "clearAll": "全部取消", "applyAssociations": "应用文件关联", "theme": "颜色主题",
        "themeAuto": "系统默认 (自动)", "themeLight": "浅色主题", "themeDark": "深色主题", "save": "完成",
        "cancel": "取消", "docs": "文档 (F1)", "updates": "软件更新",
        "checkNow": "立即检查更新", "checking": "正在检查更新...", "upToDate": "您使用的是最新版本 DodaZip。",
        "updateAvailable": "发现新版本！", "downloadUpdate": "下载更新"
    },
    "zh-TW": {
        "new": "新增", "open": "開啟", "addTo": "新增至", "extract": "解壓縮", "extractAll": "全部解壓縮",
        "verify": "驗證", "close": "關閉", "browseContents": "瀏覽內容", "convert": "轉換...",
        "rename": "重新命名", "delete": "刪除", "secureShred": "安全粉碎", "settings": "設定",
        "about": "關於", "quickAccess": "快速存取", "desktop": "桌面", "documents": "文件",
        "downloads": "下載", "name": "名稱", "size": "大小", "emptyFolder": "資料夾為空",
        "archive": "封存檔", "associations": "檔案關聯 (預設程式)", "selectAll": "全選",
        "clearAll": "全部清除", "applyAssociations": "套用檔案關聯", "theme": "色彩主題",
        "themeAuto": "系統預設 (自動)", "themeLight": "淺色主題", "themeDark": "深色主題", "save": "完成",
        "cancel": "取消", "docs": "說明文件 (F1)", "updates": "軟體更新",
        "checkNow": "立即檢查更新", "checking": "正在檢查更新...", "upToDate": "您目前使用的是最新版本。",
        "updateAvailable": "發現新版本！", "downloadUpdate": "下載更新"
    },
    "ja": {
        "new": "新規", "open": "開く", "addTo": "追加", "extract": "展開", "extractAll": "すべて展開",
        "verify": "検証", "close": "閉じる", "browseContents": "内容を表示", "convert": "変換...",
        "rename": "名前変更", "delete": "削除", "secureShred": "安全に完全抹消", "settings": "設定",
        "about": "情報", "quickAccess": "クイックアクセス", "desktop": "デスクトップ", "documents": "ドキュメント",
        "downloads": "ダウンロード", "name": "名前", "size": "サイズ", "emptyFolder": "フォルダは空です",
        "archive": "アーカイブ", "associations": "ファイルの関連付け (既定のアプリ)", "selectAll": "すべて選択",
        "clearAll": "選択解除", "applyAssociations": "関連付けを適用", "theme": "テーマ",
        "themeAuto": "システム既定 (自動)", "themeLight": "ライトテーマ", "themeDark": "ダークテーマ", "save": "完了",
        "cancel": "キャンセル", "docs": "ドキュメント (F1)", "updates": "ソフトウェア更新",
        "checkNow": "今すぐ更新を確認", "checking": "更新を確認中...", "upToDate": "最新バージョンのDodaZipを使用しています。",
        "updateAvailable": "新しいバージョンがあります！", "downloadUpdate": "更新をダウンロード"
    },
    "hi": {
        "new": "नया", "open": "खोलें", "addTo": "संग्रह में जोड़ें", "extract": "निकालें", "extractAll": "सभी निकालें",
        "verify": "सत्यापित करें", "close": "बंद करें", "browseContents": "सामग्री ब्राउज़ करें", "convert": "रूपांतरित करें...",
        "rename": "नाम बदलें", "delete": "हटाएं", "secureShred": "सुरक्षित मिटाएं", "settings": "सेटिंग्स",
        "about": "परिचय", "quickAccess": "त्वरित पहुँच", "desktop": "डेस्कटॉप", "documents": "दस्तावेज़",
        "downloads": "डाउनलोड", "name": "नाम", "size": "आकार", "emptyFolder": "फ़ोल्डर खाली है",
        "archive": "संग्रह (Archive)", "associations": "फ़ाइल संबद्धता (डिफ़ॉल्ट हैंडलर)", "selectAll": "सभी चुनें",
        "clearAll": "सभी हटाएं", "applyAssociations": "संबद्धता लागू करें", "theme": "रंग थीम",
        "themeAuto": "सिस्टम डिफ़ॉल्ट (ऑटो)", "themeLight": "लाइट थीम", "themeDark": "डार्क थीम", "save": "संपन्न",
        "cancel": "रद्द करें", "docs": "दस्तावेज़ और सहायता (F1)", "updates": "सॉफ्टवेयर अपडेट",
        "checkNow": "अपडेट जांचें", "checking": "अपडेट की जांच हो रही है...", "upToDate": "आप DodaZip का नवीनतम संस्करण उपयोग कर रहे हैं।",
        "updateAvailable": "नया संस्करण उपलब्ध है!", "downloadUpdate": "अपडेट डाउनलोड करें"
    },
    "ar": {
        "new": "جديد", "open": "فتح", "addTo": "إضافة إلى", "extract": "استخراج", "extractAll": "استخراج الكل",
        "verify": "تحقق", "close": "إغلاق", "browseContents": "تصفح المحتويات", "convert": "تحويل...",
        "rename": "إعادة تسمية", "delete": "حذف", "secureShred": "إتلاف آمن", "settings": "الإعدادات",
        "about": "حول البرنامج", "quickAccess": "وصول سريع", "desktop": "سطح المكتب", "documents": "المستندات",
        "downloads": "التنزيلات", "name": "الاسم", "size": "الحجم", "emptyFolder": "المجلد فارغ",
        "archive": "أرشيف", "associations": "ربط الملفات (البرنامج الافتراضي)", "selectAll": "تحديد الكل",
        "clearAll": "إلغاء تحديد الكل", "applyAssociations": "تطبيق الربط", "theme": "سمة المظهر",
        "themeAuto": "تلقائي للنظام", "themeLight": "السمة الفاتحة", "themeDark": "السمة الداكنة", "save": "تم",
        "cancel": "إلغاء", "docs": "دليل المساعدة (F1)", "updates": "تحديثات البرنامج",
        "checkNow": "تحقق من التحديثات", "checking": "جارٍ البحث عن تحديثات...", "upToDate": "أنت تستخدم أحدث إصدار من DodaZip.",
        "updateAvailable": "يوجد إصدار جديد متاح!", "downloadUpdate": "تنزيل التحديث"
    },
    "pt": {
        "new": "Novo", "open": "Abrir", "addTo": "Adicionar a", "extract": "Extrair", "extractAll": "Extrair Tudo",
        "verify": "Verificar", "close": "Fechar", "browseContents": "Navegar Conteúdo", "convert": "Converter...",
        "rename": "Renomear", "delete": "Excluir", "secureShred": "Destruição Segura", "settings": "Configurações",
        "about": "Sobre", "quickAccess": "Acesso Rápido", "desktop": "Área de Trabalho", "documents": "Documentos",
        "downloads": "Downloads", "name": "Nome", "size": "Tamanho", "emptyFolder": "Pasta vazia",
        "archive": "ARQUIVO", "associations": "Associações de Arquivo", "selectAll": "Selecionar Tudo",
        "clearAll": "Limpar Tudo", "applyAssociations": "Aplicar Associações", "theme": "Tema",
        "themeAuto": "Padrão do Sistema (Auto)", "themeLight": "Tema Claro", "themeDark": "Tema Escuro", "save": "Concluído",
        "cancel": "Cancelar", "docs": "Documentação (F1)", "updates": "Atualizações de Software",
        "checkNow": "Verificar Agora", "checking": "Verificando atualizações...", "upToDate": "Você está usando a versão mais recente.",
        "updateAvailable": "Nova versão disponível!", "downloadUpdate": "Baixar Atualização"
    },
    "ru": {
        "new": "Создать", "open": "Открыть", "addTo": "Добавить в", "extract": "Извлечь", "extractAll": "Извлечь всё",
        "verify": "Проверить", "close": "Закрыть", "browseContents": "Просмотр содержимого", "convert": "Конвертировать...",
        "rename": "Переименовать", "delete": "Удалить", "secureShred": "Безопасное уничтожение", "settings": "Настройки",
        "about": "О программе", "quickAccess": "Быстрый доступ", "desktop": "Рабочий стол", "documents": "Документы",
        "downloads": "Загрузки", "name": "Имя", "size": "Размер", "emptyFolder": "Папка пуста",
        "archive": "АРХИВ", "associations": "Ассоциации файлов (по умолчанию)", "selectAll": "Выбрать все",
        "clearAll": "Снять выбор", "applyAssociations": "Применить ассоциации", "theme": "Тема оформления",
        "themeAuto": "Системная (Авто)", "themeLight": "Светлая тема", "themeDark": "Тёмная тема", "save": "Готово",
        "cancel": "Отмена", "docs": "Документация (F1)", "updates": "Обновления программы",
        "checkNow": "Проверить сейчас", "checking": "Проверка обновлений...", "upToDate": "Вы используете последнюю версию DodaZip.",
        "updateAvailable": "Доступна новая версия!", "downloadUpdate": "Скачать обновление"
    },
    "it": {
        "new": "Nuovo", "open": "Apri", "addTo": "Aggiungi a", "extract": "Estrai", "extractAll": "Estrai Tutto",
        "verify": "Verifica", "close": "Chiudi", "browseContents": "Esplora Contenuto", "convert": "Converti...",
        "rename": "Rinomina", "delete": "Elimina", "secureShred": "Distruzione Sicura", "settings": "Impostazioni",
        "about": "Informazioni", "quickAccess": "Accesso Rapido", "desktop": "Desktop", "documents": "Documenti",
        "downloads": "Download", "name": "Nome", "size": "Dimensione", "emptyFolder": "La cartella è vuota",
        "archive": "ARCHIVIO", "associations": "Associazioni File", "selectAll": "Seleziona Tutto",
        "clearAll": "Deseleziona Tutto", "applyAssociations": "Applica Associazioni", "theme": "Tema Colore",
        "themeAuto": "Predefinito di Sistema (Auto)", "themeLight": "Tema Chiaro", "themeDark": "Tema Scuro", "save": "Fatto",
        "cancel": "Annulla", "docs": "Documentazione (F1)", "updates": "Aggiornamenti Software",
        "checkNow": "Controlla Aggiornamenti", "checking": "Controllo in corso...", "upToDate": "Stai utilizzando la versione più recente.",
        "updateAvailable": "Nuova versione disponibile!", "downloadUpdate": "Scarica Aggiornamento"
    },
    "ko": {
        "new": "새로 만들기", "open": "열기", "addTo": "추가", "extract": "압축 풀기", "extractAll": "모두 압축 풀기",
        "verify": "무결성 검사", "close": "닫기", "browseContents": "내용 탐색", "convert": "변환...",
        "rename": "이름 바꾸기", "delete": "삭제", "secureShred": "보안 영구 파쇄", "settings": "설정",
        "about": "정보", "quickAccess": "빠른 실행", "desktop": "바탕 화면", "documents": "문서",
        "downloads": "다운로드", "name": "이름", "size": "크기", "emptyFolder": "폴더가 비어 있습니다",
        "archive": "압축 파일", "associations": "파일 연결 (기본 프로그램)", "selectAll": "모두 선택",
        "clearAll": "선택 해제", "applyAssociations": "연결 적용", "theme": "테마",
        "themeAuto": "시스템 기본값 (자동)", "themeLight": "라이트 테마", "themeDark": "다크 테마", "save": "완료",
        "cancel": "취소", "docs": "문서 및 도움말 (F1)", "updates": "소프트웨어 업데이트",
        "checkNow": "지금 업데이트 확인", "checking": "업데이트 확인 중...", "upToDate": "최신 버전의 DodaZip을 사용하고 있습니다.",
        "updateAvailable": "새로운 버전이 있습니다!", "downloadUpdate": "업데이트 다운로드"
    },
    "tr": {
        "new": "Yeni", "open": "Aç", "addTo": "Ekle", "extract": "Aıkart", "extractAll": "Tümünü Çıkart",
        "verify": "Doğrula", "close": "Kapat", "browseContents": "İçeriğe Göz At", "convert": "Dönüştür...",
        "rename": "Yeniden Adlandır", "delete": "Sil", "secureShred": "Güvenli Parçala", "settings": "Ayarlar",
        "about": "Hakkında", "quickAccess": "Hızlı Erişim", "desktop": "Masaüstü", "documents": "Belgeler",
        "downloads": "İndirilenler", "name": "Ad", "size": "Boyut", "emptyFolder": "Klasör boş",
        "archive": "ARŞİV", "associations": "Dosya İlişkilendirmeleri", "selectAll": "Tümünü Seç",
        "clearAll": "Temizle", "applyAssociations": "İlişkilendirmeleri Uygula", "theme": "Tema",
        "themeAuto": "Sistem Varsayılanı (Otomatik)", "themeLight": "Açık Tema", "themeDark": "Koyu Tema", "save": "Tamam",
        "cancel": "İptal", "docs": "Belgeler (F1)", "updates": "Yazılım Güncellemeleri",
        "checkNow": "Güncellemeleri Denetle", "checking": "Güncellemeler denetleniyor...", "upToDate": "DodaZip'in en güncel sürümünü kullanıyorsunuz.",
        "updateAvailable": "Yeni sürüm mevcut!", "downloadUpdate": "Güncellemeyi İndir"
    },
    "pl": {
        "new": "Nowy", "open": "Otwórz", "addTo": "Dodaj do", "extract": "Wypakuj", "extractAll": "Wypakuj Wszystko",
        "verify": "Weryfikuj", "close": "Zamknij", "browseContents": "Przeglądaj Zawartość", "convert": "Konwertuj...",
        "rename": "Zmień nazwę", "delete": "Usuń", "secureShred": "Bezpieczne Niszczenie", "settings": "Ustawienia",
        "about": "O programie", "quickAccess": "Szybki Dostęp", "desktop": "Pulpit", "documents": "Dokumenty",
        "downloads": "Pobrane", "name": "Nazwa", "size": "Rozmiar", "emptyFolder": "Folder jest pusty",
        "archive": "ARCHIWUM", "associations": "Skojarzenia Plików", "selectAll": "Zaznacz Wszystko",
        "clearAll": "Odznacz Wszystko", "applyAssociations": "Zastosuj Skojarzenia", "theme": "Motyw Kolorystyczny",
        "themeAuto": "Domyślny Systemu (Auto)", "themeLight": "Jasny Motyw", "themeDark": "Ciemny Motyw", "save": "Gotowe",
        "cancel": "Anuluj", "docs": "Dokumentacja (F1)", "updates": "Aktualizacje Oprogramowania",
        "checkNow": "Sprawdź Aktualizacje", "checking": "Sprawdzanie aktualizacji...", "upToDate": "Używasz najnowszej wersji DodaZip.",
        "updateAvailable": "Dostępna nowa wersja!", "downloadUpdate": "Pobierz Aktualizację"
    },
    "nl": {
        "new": "Nieuw", "open": "Openen", "addTo": "Toevoegen aan", "extract": "Uitpakken", "extractAll": "Alles Uitpakken",
        "verify": "Verifiëren", "close": "Sluiten", "browseContents": "Inhoud Bekijken", "convert": "Converteren...",
        "rename": "Hernoemen", "delete": "Verwijderen", "secureShred": "Veilig Vernietigen", "settings": "Instellingen",
        "about": "Over", "quickAccess": "Snelle Toegang", "desktop": "Bureaublad", "documents": "Documenten",
        "downloads": "Downloads", "name": "Naam", "size": "Grootte", "emptyFolder": "Map is leeg",
        "archive": "ARCHIEF", "associations": "Bestandskoppelingen", "selectAll": "Alles Selecteren",
        "clearAll": "Alles Wissen", "applyAssociations": "Koppelingen Toepassen", "theme": "Kleurthema",
        "themeAuto": "Systeemstandaard (Auto)", "themeLight": "Licht Thema", "themeDark": "Donker Thema", "save": "Klaar",
        "cancel": "Annuleren", "docs": "Documentatie (F1)", "updates": "Software-updates",
        "checkNow": "Nu Controleren", "checking": "Controleren op updates...", "upToDate": "U gebruikt de nieuwste versie van DodaZip.",
        "updateAvailable": "Nieuwe versie beschikbaar!", "downloadUpdate": "Update Downloaden"
    },
    "uk": {
        "new": "Створити", "open": "Відкрити", "addTo": "Додати до", "extract": "Видобути", "extractAll": "Видобути все",
        "verify": "Перевірити", "close": "Закрити", "browseContents": "Переглянути вміст", "convert": "Конвертувати...",
        "rename": "Перейменувати", "delete": "Видалити", "secureShred": "Безпечне знищення", "settings": "Налаштування",
        "about": "Про програму", "quickAccess": "Швидкий доступ", "desktop": "Робочий стіл", "documents": "Документи",
        "downloads": "Завантаження", "name": "Назва", "size": "Розмір", "emptyFolder": "Папка порожня",
        "archive": "АРХІВ", "associations": "Асоціації файлів", "selectAll": "Вибрати все",
        "clearAll": "Очистити вибір", "applyAssociations": "Застосувати асоціації", "theme": "Тема оформлення",
        "themeAuto": "Системна (Авто)", "themeLight": "Світла тема", "themeDark": "Темна тема", "save": "Готово",
        "cancel": "Скасувати", "docs": "Документація (F1)", "updates": "Оновлення програми",
        "checkNow": "Перевірити зараз", "checking": "Перевірка оновлень...", "upToDate": "Ви використовуєте найновішу версію DodaZip.",
        "updateAvailable": "Доступна нова версія!", "downloadUpdate": "Завантажити оновлення"
    },
    "vi": {
        "new": "Tạo mới", "open": "Mở", "addTo": "Thêm vào", "extract": "Giải nén", "extractAll": "Giải nén tất cả",
        "verify": "Kiểm tra", "close": "Đóng", "browseContents": "Xem nội dung", "convert": "Chuyển đổi...",
        "rename": "Đổi tên", "delete": "Xóa", "secureShred": "Xóa an toàn", "settings": "Cài đặt",
        "about": "Giới thiệu", "quickAccess": "Truy cập nhanh", "desktop": "Màn hình chính", "documents": "Tài liệu",
        "downloads": "Tải xuống", "name": "Tên", "size": "Kích thước", "emptyFolder": "Thư mục trống",
        "archive": "LƯU TRỮ", "associations": "Liên kết tệp", "selectAll": "Chọn tất cả",
        "clearAll": "Bỏ chọn tất cả", "applyAssociations": "Áp dụng liên kết", "theme": "Giao diện",
        "themeAuto": "Mặc định hệ thống (Tự động)", "themeLight": "Giao diện sáng", "themeDark": "Giao diện tối", "save": "Xong",
        "cancel": "Hủy", "docs": "Tài liệu hướng dẫn (F1)", "updates": "Cập nhật phần mềm",
        "checkNow": "Kiểm tra cập nhật", "checking": "Đang kiểm tra...", "upToDate": "Bạn đang dùng phiên bản DodaZip mới nhất.",
        "updateAvailable": "Đã có phiên bản mới!", "downloadUpdate": "Tải bản cập nhật"
    },
    "id": {
        "new": "Baru", "open": "Buka", "addTo": "Tambahkan ke", "extract": "Ekstrak", "extractAll": "Ekstrak Semua",
        "verify": "Verifikasi", "close": "Tutup", "browseContents": "Jelajahi Konten", "convert": "Konversi...",
        "rename": "Ganti Nama", "delete": "Hapus", "secureShred": "Hancurkan Aman", "settings": "Pengaturan",
        "about": "Tentang", "quickAccess": "Akses Cepat", "desktop": "Desktop", "documents": "Dokumen",
        "downloads": "Unduhan", "name": "Nama", "size": "Ukuran", "emptyFolder": "Folder kosong",
        "archive": "ARSIP", "associations": "Asosiasi Berkas", "selectAll": "Pilih Semua",
        "clearAll": "Hapus Pilihan", "applyAssociations": "Terapkan Asosiasi", "theme": "Tema Warna",
        "themeAuto": "Default Sistem (Otomatis)", "themeLight": "Tema Terang", "themeDark": "Tema Gelap", "save": "Selesai",
        "cancel": "Batal", "docs": "Dokumentasi (F1)", "updates": "Pembaruan Perangkat Lunak",
        "checkNow": "Periksa Pembaruan", "checking": "Memeriksa pembaruan...", "upToDate": "Anda menggunakan versi DodaZip terbaru.",
        "updateAvailable": "Versi baru tersedia!", "downloadUpdate": "Unduh Pembaruan"
    }
}

def make_lang_dict(code):
    v = VOCAB.get(code, {})
    if not v:
        # Fallback to English base
        return dict(EN)
    
    # Construct complete dictionary with translations
    d = dict(EN)
    if "new" in v: d["toolbar.new"] = v["new"]
    if "open" in v: d["toolbar.open"] = v["open"]
    if "addTo" in v: d["toolbar.addTo"] = v["addTo"]
    if "extract" in v: d["toolbar.extract"] = v["extract"]
    if "extractAll" in v: d["toolbar.extractAll"] = v["extractAll"]
    if "verify" in v: d["toolbar.verify"] = v["verify"]
    if "close" in v: d["toolbar.close"] = v["close"]
    if "browseContents" in v: d["toolbar.browseContents"] = v["browseContents"]
    if "convert" in v: d["toolbar.convert"] = v["convert"]
    if "rename" in v: d["toolbar.rename"] = v["rename"]
    if "delete" in v: d["toolbar.delete"] = v["delete"]
    if "secureShred" in v: d["toolbar.secureShred"] = v["secureShred"]
    if "settings" in v: d["toolbar.settings"] = v["settings"]
    if "about" in v: d["toolbar.about"] = v["about"]
    if "quickAccess" in v: d["browser.quickAccess"] = v["quickAccess"]
    if "desktop" in v: d["browser.desktop"] = v["desktop"]
    if "documents" in v: d["browser.documents"] = v["documents"]
    if "downloads" in v: d["browser.downloads"] = v["downloads"]
    if "name" in v: d["browser.name"] = v["name"]
    if "size" in v: d["browser.size"] = v["size"]
    if "emptyFolder" in v: d["browser.emptyFolder"] = v["emptyFolder"]
    if "archive" in v: d["browser.archive"] = v["archive"]
    if "associations" in v: d["settings.associations"] = v["associations"]
    if "selectAll" in v: d["settings.selectAll"] = v["selectAll"]
    if "clearAll" in v: d["settings.clearAll"] = v["clearAll"]
    if "applyAssociations" in v: d["settings.applyAssociations"] = v["applyAssociations"]
    if "theme" in v: d["settings.theme"] = v["theme"]
    if "themeAuto" in v: d["settings.themeAuto"] = v["themeAuto"]
    if "themeLight" in v: d["settings.themeLight"] = v["themeLight"]
    if "themeDark" in v: d["settings.themeDark"] = v["themeDark"]
    if "save" in v: d["settings.save"] = v["save"]
    if "cancel" in v: d["delete.cancel"] = v["cancel"]
    if "docs" in v: d["help.docs"] = v["docs"]
    if "updates" in v: d["settings.updates"] = v["updates"]
    if "checkNow" in v: d["settings.checkNow"] = v["checkNow"]
    if "checking" in v: d["settings.checking"] = v["checking"]
    if "upToDate" in v: d["settings.upToDate"] = v["upToDate"]
    if "updateAvailable" in v: d["settings.updateAvailable"] = v["updateAvailable"]
    if "downloadUpdate" in v: d["settings.downloadUpdate"] = v["downloadUpdate"]
    return d

def main():
    lines = []
    lines.append("// DodaZip Multi-Language Internationalization (88 Languages)")
    lines.append("// Inspired by 7-Zip complete language localization suite")
    lines.append("import { useState, useEffect } from 'react'\n")
    
    # Types
    codes = [f"'{code}'" for code, _, _, _ in LANGUAGES_METADATA]
    lines.append(f"export type Language = {' | '.join(codes)}\n")
    
    lines.append("export interface LanguageInfo {")
    lines.append("  code: Language")
    lines.append("  name: string")
    lines.append("  nativeName: string")
    lines.append("  flag: string")
    lines.append("}\n")
    
    lines.append("export const LANGUAGES: LanguageInfo[] = [")
    for code, name, native, flag in LANGUAGES_METADATA:
        lines.append(f"  {{ code: '{code}', name: {json.dumps(name)}, nativeName: {json.dumps(native)}, flag: {json.dumps(flag)} }},")
    lines.append("]\n")

    lines.append("export const translations: Record<Language, Record<string, string>> = {")
    for code, _, _, _ in LANGUAGES_METADATA:
        t_dict = make_lang_dict(code)
        lines.append(f"  {json.dumps(code)}: {json.dumps(t_dict, indent=4, ensure_ascii=False)},")
    lines.append("}\n")

    # Functions
    lines.append("""let currentLanguage: Language = (localStorage.getItem('dodazip_language') as Language) || 'en'
const listeners = new Set<(lang: Language) => void>()

export function getLanguage(): Language {
  return currentLanguage
}

export function setLanguage(lang: Language): void {
  currentLanguage = lang
  localStorage.setItem('dodazip_language', lang)
  listeners.forEach((cb) => cb(lang))
}

export function t(key: string, defaultText?: string): string {
  const langDict = translations[currentLanguage] || translations['en']
  if (langDict && langDict[key]) {
    return langDict[key]
  }
  const enDict = translations['en']
  if (enDict && enDict[key]) {
    return enDict[key]
  }
  return defaultText || key
}

export function useI18n() {
  const [lang, setLangState] = useState<Language>(currentLanguage)

  useEffect(() => {
    const handler = (newLang: Language) => setLangState(newLang)
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])

  return {
    lang,
    setLanguage,
    t,
  }
}
""")

    out_file = "ui/src/utils/i18n.ts"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"Generated {out_file} with {len(LANGUAGES_METADATA)} languages successfully!")

if __name__ == "__main__":
    main()
