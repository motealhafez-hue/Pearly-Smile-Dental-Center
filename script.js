const header = document.querySelector("header");
const themeToggle = document.getElementById("themeToggle");
const languageToggle = document.getElementById("languageToggle");
const translatableItems = document.querySelectorAll("[data-translate]");
const storedLanguage = localStorage.getItem("ps-lang");
const storedTheme = localStorage.getItem("ps-theme");
const pageType = document.documentElement.dataset.page || "home";
const translations = {
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
  servicesHeroEyebrow: { ar: "كل التخصصات في مكان واحد", en: "All specialties in one place" },
  servicesHeroTitle: { ar: "خدمات طب الأسنان المتقدمة من بيرلي سمايل", en: "Advanced dental services from Pearly Smile" },
  servicesHeroText: {
    ar: "تعرف على جميع تخصصاتنا من الطبيب العام إلى جراحة الفم وزراعة الأسنان وعلاج عصب الأطفال.",
    en: "Discover all our specialties from general dentistry to oral surgery, implants, and pediatric care.",
  },
  servicesSectionLabel: { ar: "خدمات متكاملة", en: "Comprehensive Services" },
  servicesSectionTitle: { ar: "نقدم العلاج الكامل لكل احتياجات الأسنان", en: "We provide full treatment for all dental needs" },
  servicesBookingLabel: { ar: "هل تريد مزيد من المعلومات؟", en: "Want more information?" },
  servicesBookingTitle: { ar: "سجل موعدك الآن مع أحد أطبائنا المتخصصين", en: "Book your consultation with one of our specialists" },
  servicesBookingText: {
    ar: "نحن جاهزون للإجابة على استفساراتك وإعداد خطة علاجية مخصصة لك.",
    en: "We are ready to answer your questions and prepare a custom treatment plan for you.",
  },
  servicesBookingButton: { ar: "احجز الآن", en: "Book Now" },
  labelName: { ar: "الاسم الكامل", en: "Full Name" },
  labelPhone: { ar: "رقم الهاتف", en: "Phone Number" },
  labelDate: { ar: "تاريخ الزيارة", en: "Visit Date" },
  submitButton: { ar: "إرسال الطلب", en: "Send Request" },
  footerText: {
    ar: "© 2026 Pearly Smile Dental Center. جميع الحقوق محفوظة.",
    en: "© 2026 Pearly Smile Dental Center. All rights reserved.",
  },
};

const setLanguage = (lang) => {
  document.documentElement.lang = translations.htmlLang[lang];
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.title = translations.pageTitles?.[pageType]?.[lang] || translations.title[lang];
  if (languageToggle) {
    languageToggle.textContent = lang === "ar" ? "EN" : "AR";
  }
  localStorage.setItem("ps-lang", lang);

  translatableItems.forEach((item) => {
    const key = item.dataset.translate;
    if (!key) return;
    item.textContent = translations[key][lang] || item.textContent;
  });
};

let currentLang = storedLanguage || "ar";
let currentTheme = storedTheme || "light";
if (languageToggle) {
  languageToggle.addEventListener("click", () => {
    currentLang = currentLang === "ar" ? "en" : "ar";
    setLanguage(currentLang);
  });
}
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    setTheme(currentTheme);
  });
}

const setTheme = (theme) => {
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("dark-theme", isDark);
  if (themeToggle) {
    themeToggle.textContent = isDark ? "☀️" : "🌙";
  }
  localStorage.setItem("ps-theme", theme);
};

setLanguage(currentLang);
setTheme(currentTheme);

const counters = document.querySelectorAll(".counter");
const animateCounters = () => {
  counters.forEach((counter) => {
    const target = +counter.dataset.target;
    const duration = 2200;
    let startTime = null;

    const updateCounter = (time) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const currentNumber = Math.floor(progress * target);
      counter.textContent = currentNumber.toLocaleString("en-US");
      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        counter.textContent = target.toLocaleString("en-US");
      }
    };

    requestAnimationFrame(updateCounter);
  });
};

window.addEventListener("load", () => {
  animateCounters();
});
