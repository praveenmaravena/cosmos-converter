export interface LanguageConfig {
  code: string;
  name: string;
  flag: string;
  rtl?: boolean;
}

export const LANGUAGES: LanguageConfig[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
  { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
  { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml', name: 'മലയാളം', flag: '🇮🇳' },
  { code: 'bn', name: 'বাংলা', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
  { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' }
];

export type TranslationKey = 
  | 'heroTitle' 
  | 'heroSubtitle' 
  | 'getStarted' 
  | 'features' 
  | 'dashboard' 
  | 'editor' 
  | 'imageEditor' 
  | 'ocrTitle' 
  | 'admin' 
  | 'login' 
  | 'signup' 
  | 'logout' 
  | 'recentFiles' 
  | 'uploadDragDrop' 
  | 'convert' 
  | 'mergePdf' 
  | 'watermark' 
  | 'billing' 
  | 'chat'
  | 'theme'
  | 'settings'
  | 'backToLanding';

export const TRANSLATIONS: Record<string, Record<TranslationKey, string>> = {
  en: {
    heroTitle: 'Cosmic Document & File Conversion Platform',
    heroSubtitle: 'Next-generation file management, advanced PDF processing, TipTap editing, OCR, and AI summarization in one premium galaxy interface.',
    getStarted: 'Launch Platform',
    features: 'Premium Features',
    dashboard: 'User Dashboard',
    editor: 'Doc Editor',
    imageEditor: 'Image Editor',
    ocrTitle: 'AI OCR & Parser',
    admin: 'Admin Console',
    login: 'Login',
    signup: 'Create Account',
    logout: 'Sign Out',
    recentFiles: 'Recent Documents',
    uploadDragDrop: 'Drag and drop files here, or click to upload',
    convert: 'Convert Files',
    mergePdf: 'Merge PDFs',
    watermark: 'Add Watermark',
    billing: 'Plans & Billing',
    chat: 'Cosmos AI Chat',
    theme: 'Galaxy Theme',
    settings: 'Security Settings',
    backToLanding: 'Home Page'
  },
  hi: {
    heroTitle: 'ब्रह्मांडीय दस्तावेज़ और फ़ाइल रूपांतरण मंच',
    heroSubtitle: 'एक प्रीमियम गैलेक्सी इंटरफ़ेस में अगली पीढ़ी का फ़ाइल प्रबंधन, उन्नत पीडीएफ प्रसंस्करण, टिपटैप संपादन, ओसीआर और एआई सारांश।',
    getStarted: 'मंच शुरू करें',
    features: 'प्रीमियम विशेषताएं',
    dashboard: 'उपयोगकर्ता डैशबोर्ड',
    editor: 'डॉक्टर संपादक',
    imageEditor: 'छवि संपादक',
    ocrTitle: 'एआई ओसीआर',
    admin: 'व्यवस्थापक कंसोल',
    login: 'लॉग इन करें',
    signup: 'खाता बनाएं',
    logout: 'साइन आउट',
    recentFiles: 'हाल के दस्तावेज़',
    uploadDragDrop: 'फ़ाइलों को यहाँ खींचें और छोड़ें, या अपलोड करने के लिए क्लिक करें',
    convert: 'फ़ाइलें बदलें',
    mergePdf: 'पीडीएफ मर्ज करें',
    watermark: 'वॉटरमार्क जोड़ें',
    billing: 'योजनाएं और बिलिंग',
    chat: 'कॉस्मॉस एआई चैट',
    theme: 'गैलेक्सी थीम',
    settings: 'सुरक्षा सेटिंग्स',
    backToLanding: 'होम पेज'
  },
  ar: {
    heroTitle: 'منصة تحويل الملفات والمستندات الكونية',
    heroSubtitle: 'إدارة ملفات من الجيل القادم، ومعالجة متقدمة لملفات PDF، وتحرير TipTap، وOCR، وتلخيص ذكاء اصطناعي في واجهة مجرة ممتازة واحدة.',
    getStarted: 'إطلاق المنصة',
    features: 'الميزات الممتازة',
    dashboard: 'لوحة التحكم',
    editor: 'محرر المستندات',
    imageEditor: 'محرر الصور',
    ocrTitle: 'التعرف الضوئي على الحروف',
    admin: 'لوحة التحكم للمشرف',
    login: 'تسجيل الدخول',
    signup: 'إنشاء حساب',
    logout: 'تسجيل الخروج',
    recentFiles: 'المستندات الأخيرة',
    uploadDragDrop: 'اسحب الملفات وأفلتها هنا، أو انقر للتحميل',
    convert: 'تحويل الملفات',
    mergePdf: 'دمج ملفات PDF',
    watermark: 'إضافة علامة مائية',
    billing: 'الخطط والفواتير',
    chat: 'محادثة كوزموس AI',
    theme: 'مظهر المجرة',
    settings: 'إعدادات الأمان',
    backToLanding: 'الصفحة الرئيسية'
  },
  es: {
    heroTitle: 'Plataforma Cósmica de Conversión de Archivos',
    heroSubtitle: 'Gestión de archivos de próxima generación, procesamiento avanzado de PDF, edición TipTap, OCR y resúmenes con IA en una interfaz estelar.',
    getStarted: 'Iniciar Plataforma',
    features: 'Funciones Premium',
    dashboard: 'Panel de Usuario',
    editor: 'Editor de Docs',
    imageEditor: 'Editor de Imágenes',
    ocrTitle: 'OCR Inteligente',
    admin: 'Consola de Admin',
    login: 'Iniciar Sesión',
    signup: 'Registrarse',
    logout: 'Cerrar Sesión',
    recentFiles: 'Archivos Recientes',
    uploadDragDrop: 'Arrastre y suelte archivos aquí, o haga clic para subir',
    convert: 'Convertir Archivos',
    mergePdf: 'Combinar PDFs',
    watermark: 'Añadir Marca de Agua',
    billing: 'Planes y Facturas',
    chat: 'Chat Cosmos AI',
    theme: 'Tema Galaxia',
    settings: 'Seguridad',
    backToLanding: 'Inicio'
  }
};

// Fallback to English for any language not fully detailed in the dictionary
LANGUAGES.forEach(lang => {
  if (!TRANSLATIONS[lang.code]) {
    TRANSLATIONS[lang.code] = { ...TRANSLATIONS.en };
  }
});

export function getTranslation(langCode: string, key: TranslationKey): string {
  const langTranslations = TRANSLATIONS[langCode] || TRANSLATIONS.en;
  return langTranslations[key] || TRANSLATIONS.en[key];
}
