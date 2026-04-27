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
    team: {
      ar: "فريق الأطباء | Pearly Smile Dental Center",
      en: "Our Team | Pearly Smile Dental Center",
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
  navOffers: { ar: "عروضنا", en: "Offers" },
  navTeam: { ar: "فريقنا", en: "Our Team" },
  navBooking: { ar: "حجز", en: "Booking" },
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
  teamHeroEyebrow: {
    ar: "فريق الأطباء",
    en: "Meet the Team",
  },
  teamHeroTitle: {
    ar: "تعرف على أطباء بيرلي سمايل",
    en: "Meet Our Expert Dental Team",
  },
  teamHeroText: {
    ar: "خبرات متعددة وخطة علاج مخصصة — هدفنا راحتك ونتائج طويلة المدى.",
    en: "Experienced specialists with tailored treatment plans for long-lasting results.",
  },
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
  teamSectionLabel: { ar: "فريقنا", en: "Our Team" },
  teamSectionTitle: {
    ar: "أطباء متخصصون لمختلف الحالات",
    en: "Specialists for Every Dental Need",
  },
  teamPageTitle: {
    ar: "فريق الأطباء | Pearly Smile Dental Center",
    en: "Our Team | Pearly Smile Dental Center",
  },
  doctor1Name: { ar: "د. ريم العبدالله", en: "Dr. Reem Alabdullah" },
  doctor1Role: { ar: "أخصائية تجميل الأسنان", en: "Cosmetic Dentist" },
  doctor2Name: { ar: "د. خالد الشريف", en: "Dr. Khaled Alshareef" },
  doctor2Role: { ar: "جراح أسنان", en: "Oral Surgeon" },
  doctor3Name: { ar: "د. سارة الماجد", en: "Dr. Sara Almajid" },
  doctor3Role: { ar: "أخصائية تقويم", en: "Orthodontic Specialist" },
  teamDoctor1Name: { ar: "Dr. Mohamed Bilal Abdulsamad", en: "Dr. Mohamed Bilal Abdulsamad" },
  teamDoctor1Role: { ar: "أخصائي تقويم الأسنان", en: "Orthodontist" },
  teamDoctor2Name: { ar: "Dr. Shadi Almoghayer", en: "Dr. Shadi Almoghayer" },
  teamDoctor2Role: { ar: "أخصائي زراعة الأسنان", en: "Dental Implantologist" },
  teamDoctor3Name: { ar: "Dr. Srivalli Perumalla", en: "Dr. Srivalli Perumalla" },
  teamDoctor3Role: { ar: "أخصائي التركيبات", en: "Prosthodontist" },
  teamDoctor4Name: { ar: "Dr. Alaa Adi", en: "Dr. Alaa Adi" },
  teamDoctor4Role: { ar: "أخصائي لثة", en: "Periodontist" },
  teamDoctor5Name: { ar: "Dr. Shaha Eddib", en: "Dr. Shaha Eddib" },
  teamDoctor5Role: { ar: "طبيب أسنان عام", en: "GP Dentist" },
  teamDoctor6Name: { ar: "Dr. Sara Yousef", en: "Dr. Sara Yousef" },
  teamDoctor6Role: { ar: "طبيب أسنان عام", en: "GP Dentist" },
  teamDoctor7Name: { ar: "Dr. Ali Alnuami", en: "Dr. Ali Alnuami" },
  teamDoctor7Role: { ar: "طبيب أسنان عام", en: "GP Dentist" },
  teamDoctor8Name: { ar: "Dr. Nada Alawadhi", en: "Dr. Nada Alawadhi" },
  teamDoctor8Role: { ar: "طبيب أسنان عام", en: "GP Dentist" },
  teamDoctor9Name: { ar: "Dr. Antoine Emil Habib", en: "Dr. Antoine Emil Habib" },
  teamDoctor9Role: { ar: "جراح الفم والوجه والفكين", en: "Oral and Maxillofacial Surgeon" },
  bookingLabel: { ar: "احجز موعدك الآن", en: "Reserve Your Appointment" },
  bookingTitle: {
    ar: "استشر طبيبك في خطوات بسيطة",
    en: "Consult Your Dentist in Simple Steps",
  },
  bookingText: {
    ar: "املأ البيانات وسنتواصل معك لتأكيد موعدك بأسرع وقت.",
    en: "Fill in your details and we will contact you to confirm your appointment quickly.",
  },
  bookingDoctorLabel: { ar: "اختر الطبيب", en: "Choose Doctor" },
  bookingDoctorPlaceholder: { ar: "اختر الدكتور", en: "Select a doctor" },
  bookingBranchLabel: { ar: "اختر الفرع", en: "Choose Branch" },
  branchMain: { ar: "الفرع الرئيسي", en: "Main Branch" },
  branchOne: { ar: "الفرع الأول", en: "Branch One" },
  bookingBenefit1: { ar: "استجابة سريعة خلال 24 ساعة", en: "Fast response within 24 hours" },
  bookingBenefit2: {
    ar: "تأكيد الحجز الفوري عبر الهاتف أو الواتساب",
    en: "Instant booking confirmation by phone or WhatsApp",
  },
  bookingBenefit3: { ar: "خطوات بسيطة بدون تعقيد", en: "Simple, hassle-free steps" },
  bookingTimeLabel: { ar: "اختر الوقت", en: "Choose Time" },
  bookingTimePlaceholder: { ar: "اختر الوقت", en: "Select a time" },
  bookingNotesLabel: { ar: "ملاحظة (اختياري)", en: "Note (optional)" },
  bookingSuccess: { ar: "تم إرسال طلب الحجز بنجاح! سنتواصل لتأكيد الموعد.", en: "Booking request sent successfully! We will contact you to confirm the appointment." },
  viewProfile: { ar: "عرض البروفايل", en: "View Profile" },
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
    // update booking selects if present
    if (typeof BookingManager !== 'undefined' && BookingManager.updateForLanguage) {
      BookingManager.updateForLanguage(lang);
    }
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
      const ariaLabel = lang === "ar" ? "التبديل إلى الإنجليزية" : "Switch to Arabic";
      btn.setAttribute("aria-label", ariaLabel);
      btn.title = ariaLabel;
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
// BOOKING MANAGER
// ============================================================================

class BookingManager {
  static init() {
    this.doctorSelect = document.getElementById('doctor');
    this.branchSelect = document.getElementById('branch');
    this.timeSelect = document.getElementById('time');
    this.dateInput = document.getElementById('date');
    this.form = document.querySelector('.modern-form');
    this.bookingMessage = document.getElementById('bookingMessage');
    this.populateAll(this.appLang());
    this.attachListeners();
  }

  static appLang() {
    return appState.currentLang || CONFIG.defaults.language;
  }

  static populateAll(lang) {
    this.renderDoctors(lang);
    this.renderBranches(lang);
    this.renderTimes(lang);
  }

  static renderDoctors(lang) {
    const select = this.doctorSelect;
    if (!select) return;
    select.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.dataset.translate = 'bookingDoctorPlaceholder';
    placeholder.textContent = TRANSLATIONS.bookingDoctorPlaceholder?.[lang] || 'اختر الدكتور';
    select.appendChild(placeholder);

    for (let i = 1; i <= 9; i++) {
      const key = `teamDoctor${i}Name`;
      if (TRANSLATIONS[key]) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.dataset.translate = key;
        opt.textContent = TRANSLATIONS[key]?.[lang] || TRANSLATIONS[key]?.en || key;
        select.appendChild(opt);
      }
    }
  }

  static renderBranches(lang) {
    const select = this.branchSelect;
    if (!select) return;
    select.innerHTML = '';
    const b1 = document.createElement('option');
    b1.value = 'main';
    b1.dataset.translate = 'branchMain';
    b1.textContent = TRANSLATIONS.branchMain?.[lang] || 'Main Branch';
    select.appendChild(b1);

    const b2 = document.createElement('option');
    b2.value = 'one';
    b2.dataset.translate = 'branchOne';
    b2.textContent = TRANSLATIONS.branchOne?.[lang] || 'Branch One';
    select.appendChild(b2);
  }

  static timeSlotsFor(date, doctorKey, branch) {
    // Lightweight, deterministic slots for client-side selection.
    // Could be replaced by server-driven availability later.
    return [
      '09:00',
      '10:00',
      '11:30',
      '13:00',
      '15:30',
      '17:00'
    ];
  }

  static renderTimes(lang) {
    const select = this.timeSelect;
    if (!select) return;
    select.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.dataset.translate = 'bookingTimePlaceholder';
    placeholder.textContent = TRANSLATIONS.bookingTimePlaceholder?.[lang] || 'اختر الوقت';
    select.appendChild(placeholder);

    const slots = this.timeSlotsFor(this.dateInput?.value, this.doctorSelect?.value, this.branchSelect?.value);
    slots.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      select.appendChild(opt);
    });
  }

  static attachListeners() {
    if (this.doctorSelect) {
      this.doctorSelect.addEventListener('change', () => this.renderTimes(this.appLang()));
    }
    if (this.branchSelect) {
      this.branchSelect.addEventListener('change', () => this.renderTimes(this.appLang()));
    }
    if (this.dateInput) {
      this.dateInput.addEventListener('change', () => this.renderTimes(this.appLang()));
    }
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }
  }

  static handleSubmit() {
    const name = document.getElementById('name')?.value.trim();
    const phone = document.getElementById('phone')?.value.trim();
    const doctorKey = this.doctorSelect?.value;
    const doctorName = doctorKey ? (TRANSLATIONS[doctorKey]?.[this.appLang()] || doctorKey) : '';
    const branch = this.branchSelect?.value;
    const date = this.dateInput?.value;
    const time = this.timeSelect?.value;

    if (!name || !phone || !doctorName || !date || !time) {
      const msg = this.appLang() === 'ar' ? 'يرجى تعبئة جميع الحقول المطلوبة' : 'Please fill all required fields';
      this.showMessage(msg, 'error');
      return;
    }

    // Simulate a successful booking submission (progressive enhancement).
    const successText = TRANSLATIONS.bookingSuccess?.[this.appLang()] || 'تم إرسال طلبكم بنجاح! سنعاود الاتصال لتأكيد الموعد.';
    this.showMessage(successText, 'success');
    // reset form while preserving language and re-populate selects
    this.form.reset();
    this.populateAll(this.appLang());
  }

  static showMessage(text, type = 'success') {
    if (!this.bookingMessage) return;
    this.bookingMessage.hidden = false;
    this.bookingMessage.textContent = text;
    this.bookingMessage.className = `booking-message ${type}`;
    setTimeout(() => {
      this.bookingMessage.hidden = true;
    }, 6000);
  }

  static updateForLanguage(lang) {
    // if not initialized yet, try to init
    if (!this.doctorSelect || !this.branchSelect) {
      this.doctorSelect = document.getElementById('doctor');
      this.branchSelect = document.getElementById('branch');
      this.timeSelect = document.getElementById('time');
      this.dateInput = document.getElementById('date');
    }
    this.populateAll(lang);
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
// REVEAL OBSERVER (PERFORMANCE FRIENDLY)
// ============================================================================

class RevealObserver {
  static init() {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const items = document.querySelectorAll('.reveal');
    if (!items || items.length === 0) return;
    if (prefersReduced) {
      items.forEach((el) => el.classList.add('visible'));
      return;
    }

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    items.forEach((item) => io.observe(item));
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
    // initialize booking manager after language/DOM are ready
    if (typeof BookingManager !== 'undefined' && BookingManager.init) {
      BookingManager.init();
    }
  }

  initializeTheme() {
    this.themeManager.setTheme(appState.currentTheme);
  }

  initializeLanguage() {
    this.languageManager.setLanguage(appState.currentLang);
  }

  initializeAnimations() {
    RevealObserver.init();
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
