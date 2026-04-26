// ============================================================================
// CONFIGURATION & STATE MANAGEMENT
// ============================================================================

const CONFIG = {
  storageKeys: {
    language: "ps-lang",
    theme: "ps-theme",
  },
  animation: {
    counterDuration: 2200,
  },
  defaults: {
    language: "ar",
    theme: "light",
  },
};

// ============================================================================
// TRANSLATION OBJECT
// ============================================================================

const TRANSLATIONS = {
  htmlLang: { ar: "ar", en: "en" },
  pageTitles: {
    home: {
      ar: "Pearly Smile Dental Center | مركز بيرلي سمايل لطب الأسنان",
      en: "Pearly Smile Dental Center | Dental Clinic",
    },
    services: {
      ar: "خدمات بيرلي سمايل | Pearly Smile Dental Center",
      en: "Pearly Smile Services | Pearly Smile Dental Center",
    },
    offers: {
      ar: "عروض عيد الأضحى | Pearly Smile Dental Center",
      en: "Eid Al-Adha Offers | Pearly Smile Dental Center",
    },
  },
  title: {
    ar: "Pearly Smile Dental Center | مركز بيرلي سمايل لطب الأسنان",
    en: "Pearly Smile Dental Center | Dental Clinic",
  },
  brand: {
    ar: "Pearly Smile Dental Center",
    en: "Pearly Smile Dental Center",
  },
  navHome: { ar: "الرئيسية", en: "Home" },
  navStats: { ar: "إحصائيات", en: "Statistics" },
  navServices: { ar: "خدماتنا", en: "Services" },
  navBooking: { ar: "حجز", en: "Booking" },
  navOffers: { ar: "عروضنا", en: "Offers" },
  callNow: { ar: "اتصل الآن", en: "Call Now" },
  heroEyebrow: {
    ar: "عيادة أسنان مودرن وراحة لا مثيل لها",
    en: "Modern dental care with comfort",
  },
  heroTitle: {
    ar: "نمنحك ابتسامة ناصعة وصحية بكل ثقة",
    en: "We give you a bright, healthy smile with confidence",
  },
  heroText: {
    ar: "في مركز بيرلي سمايل نقدم رعاية أسنان متكاملة، تقنيات حديثة، وطاقم محترف من أطباء الأسنان والممرضين.",
    en: "At Pearly Smile we offer complete dental care, modern technology, and a skilled team of dentists and nurses.",
  },
  heroBook: { ar: "احجز موعدك", en: "Book Now" },
  patients: { ar: "مريض", en: "Patients" },
  doctors: { ar: "دكتور", en: "Doctors" },
  staff: { ar: "موظف", en: "Staff" },
  servicesLabel: { ar: "خدماتنا", en: "Our Services" },
  servicesTitle: {
    ar: "أحدث خدمات طب الأسنان في مكان واحد",
    en: "The latest dental services in one place",
  },
  service1Title: { ar: "طبيب عام", en: "General Dentistry" },
  service1Text: {
    ar: "فحص أسنان كامل، تنظيف، علاج تسوس، وترتيب خطة العناية اليومية.",
    en: "Comprehensive dental exams, cleanings, cavity care, and daily oral health planning.",
  },
  service2Title: { ar: "صور إكس رِي", en: "X-Ray Imaging" },
  service2Text: {
    ar: "تصوير رقمي سريع ودقيق لتشخيص حالة الأسنان والفم قبل العلاج.",
    en: "Fast and accurate digital imaging to diagnose dental and oral conditions before treatment.",
  },
  seeAllServices: { ar: "شوف الكل", en: "See All" },
  service3Title: { ar: "حشوات وترميمات", en: "Fillings & Restorations" },
  service3Text: {
    ar: "حشوات تجميلية وقوية لاستعادة شكل الأسنان وحمايتها من التسوس.",
    en: "Cosmetic and strong fillings to restore tooth shape and protect against decay.",
  },
  service4Title: { ar: "اختصاص لثة", en: "Periodontal Care" },
  service4Text: {
    ar: "علاج اللثة والتهاباتها، وتنظيف عميق لجذور الأسنان واستعادة الصحة.",
    en: "Gum disease treatment and deep root cleaning to restore oral health.",
  },
  service5Title: { ar: "اختصاص زراعة", en: "Implant Specialist" },
  service5Text: {
    ar: "زراعة أسنان ثابتة مع متابعة دقيقة لضمان نتيجة طبيعية وقوية.",
    en: "Fixed dental implants with precise follow-up for a natural, durable result.",
  },
  service6Title: { ar: "اختصاص جراحة فم", en: "Oral Surgery" },
  service6Text: {
    ar: "جراحة فم متقدمة لحالات معقدة مع عناية آمنة ومهنية عالية.",
    en: "Advanced oral surgery for complex cases with safe and professional care.",
  },
  service7Title: { ar: "اختصاص أطفال", en: "Pediatric Dentistry" },
  service7Text: {
    ar: "رعاية ممتعة للأطفال مع تعامل لطيف يساعد الطفل على الشعور بالأمان.",
    en: "Fun pediatric care with gentle handling to make children feel safe.",
  },
  service8Title: { ar: "اختصاص عصب", en: "Endodontics" },
  service8Text: {
    ar: "علاج جذور الحديث لتخفيف الألم وحفظ السن باستخدام تقنيات حديثة.",
    en: "Modern root canal treatment to relieve pain and preserve the tooth.",
  },
  teamLabel: { ar: "فريقنا", en: "Our Team" },
  teamTitle: {
    ar: "أطباء ذوي خبرة عالية",
    en: "Highly Experienced Dentists",
  },
  doctor1Name: { ar: "د. ريم العبدالله", en: "Dr. Reem Alabdullah" },
  doctor1Role: { ar: "أخصائية تجميل الأسنان", en: "Cosmetic Dentist" },
  doctor2Name: { ar: "د. خالد الشريف", en: "Dr. Khaled Alshareef" },
  doctor2Role: { ar: "جراح أسنان", en: "Oral Surgeon" },
  doctor3Name: { ar: "د. سارة الماجد", en: "Dr. Sara Almajid" },
  doctor3Role: { ar: "أخصائية تقويم", en: "Orthodontic Specialist" },
  bookingLabel: { ar: "احجز موعدك الآن", en: "Reserve Your Appointment" },
  bookingTitle: {
    ar: "استشر طبيبك في خطوات بسيطة",
    en: "Consult Your Dentist in Simple Steps",
  },
  bookingText: {
    ar: "املأ البيانات وسنتواصل معك لتأكيد موعدك بأسرع وقت.",
    en: "Fill in your details and we will contact you to confirm your appointment quickly.",
  },
  bookingBenefit1: { ar: "استجابة سريعة خلال 24 ساعة", en: "Fast response within 24 hours" },
  bookingBenefit2: {
    ar: "تأكيد الحجز الفوري عبر الهاتف أو الواتساب",
    en: "Instant booking confirmation by phone or WhatsApp",
  },
  bookingBenefit3: { ar: "خطوات بسيطة بدون تعقيد", en: "Simple, hassle-free steps" },
  faqLabel: { ar: "الأسئلة الشائعة", en: "Frequently Asked Questions" },
  faqTitle: {
    ar: "كل ما تود معرفته عن خدماتنا",
    en: "Everything You Need to Know About Our Services",
  },
  faqQ1: { ar: "كم تستغرق عملية تبييض الأسنان؟", en: "How long does teeth whitening take?" },
  faqA1: {
    ar: "تستغرق الجلسة حوالي 45 إلى 60 دقيقة باستخدام تقنية الزووم الحديثة.",
    en: "The session takes about 45 to 60 minutes using the advanced Zoom technology.",
  },
  faqQ2: {
    ar: "هل تقبل العيادة التأمين الطبي؟",
    en: "Does the clinic accept medical insurance?",
  },
  faqA2: {
    ar: "نعم، نحن نتعامل مع كبرى شركات التأمين الطبي لتغطية أغلب العلاجات.",
    en: "Yes, we work with major medical insurance providers to cover most treatments.",
  },
  servicesHeroEyebrow: { ar: "كل التخصصات في مكان واحد", en: "All specialties in one place" },
  servicesHeroTitle: {
    ar: "خدمات طب الأسنان المتقدمة من بيرلي سمايل",
    en: "Advanced dental services from Pearly Smile",
  },
  servicesHeroText: {
    ar: "تعرف على جميع تخصصاتنا من الطبيب العام إلى جراحة الفم وزراعة الأسنان وعلاج عصب الأطفال.",
    en: "Discover all our specialties from general dentistry to oral surgery, implants, and pediatric care.",
  },
  servicesSectionLabel: { ar: "خدمات متكاملة", en: "Comprehensive Services" },
  servicesSectionTitle: {
    ar: "نقدم العلاج الكامل لكل احتياجات الأسنان",
    en: "We provide full treatment for all dental needs",
  },
  servicesBookingLabel: { ar: "هل تريد مزيد من المعلومات؟", en: "Want more information?" },
  servicesBookingTitle: {
    ar: "سجل موعدك الآن مع أحد أطبائنا المتخصصين",
    en: "Book your consultation with one of our specialists",
  },
  servicesBookingText: {
    ar: "نحن جاهزون للإجابة على استفساراتك وإعداد خطة علاجية مخصصة لك.",
    en: "We are ready to answer your questions and prepare a custom treatment plan for you.",
  },
  servicesBookingButton: { ar: "احجز الآن", en: "Book Now" },
  offersTitle: { ar: "عروض خاصة بمناسبة عيد الأضحى", en: "Special Eid Al-Adha Offers" },
  offersSubtitle: {
    ar: "استفد من التخفيضات على زراعة الأسنان، قشور الفينير، التبييض، والتنظيف.",
    en: "Enjoy discounts on dental implants, veneers, whitening, and cleaning.",
  },
  offer1Title: { ar: "عرض زراعة الأسنان", en: "Dental Implant Offer" },
  offer1Text: {
    ar: "خصم 25% على علاج الزراعة الكامل مع متابعة بعد العملية.",
    en: "25% off full implant treatment with post-care follow-up.",
  },
  offer2Title: { ar: "عرض قشور الفينير", en: "Veneer Makeover Offer" },
  offer2Text: {
    ar: "خصم 30% على قشور الفينير للحصول على ابتسامة طبيعية ومشرقة.",
    en: "30% off veneers for a natural, bright smile.",
  },
  offer3Title: { ar: "عرض تبييض الأسنان", en: "Teeth Whitening Offer" },
  offer3Text: {
    ar: "جلسة تبييض احترافية مع نتائج سريعة وأقل حساسية.",
    en: "Professional whitening session with fast results and reduced sensitivity.",
  },
  offer4Title: { ar: "عرض فحص وتنظيف", en: "Check-up & Cleaning Offer" },
  offer4Text: {
    ar: "فحص شامل وتنظيف دقيق لضمان صحة فمك ووقايته.",
    en: "Comprehensive check-up and deep cleaning to protect your oral health.",
  },
  bookNowButton: { ar: "احجز الآن", en: "Book Now" },
  labelName: { ar: "الاسم الكامل", en: "Full Name" },
  labelPhone: { ar: "رقم الهاتف", en: "Phone Number" },
  labelDate: { ar: "تاريخ الزيارة", en: "Visit Date" },
  submitButton: { ar: "إرسال الطلب", en: "Send Request" },
  footerText: {
    ar: "© 2026 Pearly Smile Dental Center. جميع الحقوق محفوظة.",
    en: "© 2026 Pearly Smile Dental Center. All rights reserved.",
  },
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

class AppState {
  constructor() {
    this.currentLang = this.getStoredLanguage();
    this.currentTheme = this.getStoredTheme();
    this.pageType = document.documentElement.dataset.page || "home";
  }

  getStoredLanguage() {
    return localStorage.getItem(CONFIG.storageKeys.language) || CONFIG.defaults.language;
  }

  getStoredTheme() {
    return localStorage.getItem(CONFIG.storageKeys.theme) || CONFIG.defaults.theme;
  }

  setLanguage(lang) {
    this.currentLang = lang;
    localStorage.setItem(CONFIG.storageKeys.language, lang);
  }

  setTheme(theme) {
    this.currentTheme = theme;
    localStorage.setItem(CONFIG.storageKeys.theme, theme);
  }
}

const appState = new AppState();

// ============================================================================
// LANGUAGE MANAGEMENT
// ============================================================================

class LanguageManager {
  constructor(translations, appState) {
    this.translations = translations;
    this.appState = appState;
  }

  getTranslation(key, lang) {
    return this.translations[key]?.[lang];
  }

  setLanguage(lang) {
    this.updateDocumentLanguage(lang);
    this.updatePageTitle(lang);
    this.updateLanguageToggle(lang);
    this.updateTranslatableElements(lang);
    this.appState.setLanguage(lang);
  }

  updateDocumentLanguage(lang) {
    document.documentElement.lang = this.translations.htmlLang[lang];
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }

  updatePageTitle(lang) {
    const title =
      this.translations.pageTitles?.[this.appState.pageType]?.[lang] ||
      this.translations.title[lang];
    document.title = title;
  }

  updateLanguageToggle(lang) {
    const btn = document.getElementById("languageToggle");
    if (btn) {
      btn.textContent = lang === "ar" ? "EN" : "AR";
    }
  }

  updateTranslatableElements(lang) {
    const translatableItems = document.querySelectorAll("[data-translate]");
    translatableItems.forEach((item) => {
      const key = item.dataset.translate;
      if (!key) return;
      const translation = this.getTranslation(key, lang);
      if (translation) {
        item.textContent = translation;
      }
    });
  }

  toggleLanguage() {
    const newLang = this.appState.currentLang === "ar" ? "en" : "ar";
    this.setLanguage(newLang);
  }
}

// ============================================================================
// THEME MANAGEMENT
// ============================================================================

class ThemeManager {
  constructor(appState) {
    this.appState = appState;
  }

  setTheme(theme) {
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark-theme", isDark);
    this.updateThemeToggle(isDark);
    this.appState.setTheme(theme);
  }

  updateThemeToggle(isDark) {
    const btn = document.getElementById("themeToggle");
    if (btn) {
      btn.textContent = isDark ? "☀️" : "🌙";
    }
  }

  toggleTheme() {
    const newTheme = this.appState.currentTheme === "dark" ? "light" : "dark";
    this.setTheme(newTheme);
  }
}

// ============================================================================
// ANIMATION UTILITIES
// ============================================================================

class CounterAnimator {
  static animateCounters() {
    const counters = document.querySelectorAll(".counter");
    counters.forEach((counter) => {
      this.animateCounter(counter);
    });
  }

  static animateCounter(counter) {
    const target = +counter.dataset.target;
    const duration = CONFIG.animation.counterDuration;
    let startTime = null;

    const updateCounter = (time) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const currentNumber = Math.floor(progress * target);
      counter.textContent = currentNumber.toLocaleString("en-US");

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        counter.textContent = target.toLocaleString("en-US") + "+";
      }
    };

    requestAnimationFrame(updateCounter);
  }
}

// ============================================================================
// FAQ ACCORDION
// ============================================================================

class FAQAccordion {
  static init() {
    const faqItems = document.querySelectorAll(".faq-item");
    faqItems.forEach((item) => {
      FAQAccordion.attachListener(item);
    });
  }

  static attachListener(item) {
    const btn = item.querySelector(".faq-question");
    if (!btn) return;

    btn.addEventListener("click", () => {
      FAQAccordion.toggleItem(item);
    });
  }

  static toggleItem(item) {
    item.classList.toggle("active");
  }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

class EventListenerManager {
  static attachLanguageListener(languageManager) {
    const langBtn = document.getElementById("languageToggle");
    if (langBtn) {
      langBtn.addEventListener("click", () => {
        languageManager.toggleLanguage();
      });
    }
  }

  static attachThemeListener(themeManager) {
    const themeBtn = document.getElementById("themeToggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        themeManager.toggleTheme();
      });
    }
  }
}

// ============================================================================
// APP INITIALIZATION
// ============================================================================

class App {
  constructor() {
    this.languageManager = new LanguageManager(TRANSLATIONS, appState);
    this.themeManager = new ThemeManager(appState);
  }

  init() {
    this.initializeTheme();
    this.initializeLanguage();
    this.initializeAnimations();
    this.attachEventListeners();
  }

  initializeTheme() {
    this.themeManager.setTheme(appState.currentTheme);
  }

  initializeLanguage() {
    this.languageManager.setLanguage(appState.currentLang);
  }

  initializeAnimations() {
    CounterAnimator.animateCounters();
  }

  attachEventListeners() {
    EventListenerManager.attachLanguageListener(this.languageManager);
    EventListenerManager.attachThemeListener(this.themeManager);
    FAQAccordion.init();
  }
}

// ============================================================================
// STARTUP
// ============================================================================

const initializeApp = () => {
  const app = new App();
  app.init();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

// Re-animate counters on page fully loaded
window.addEventListener("load", () => {
  CounterAnimator.animateCounters();
});
