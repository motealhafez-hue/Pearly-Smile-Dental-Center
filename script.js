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
// LIGHTWEIGHT EVENT TRACKING (PUBLIC SITE)
// ============================================================================

const Analytics = (function () {
  const apiBase = (function () {
    try {
      return location.protocol === "file:" ? "http://127.0.0.1:8000" : location.origin;
    } catch (e) {
      return "http://127.0.0.1:8000";
    }
  })();

  let sessionId = localStorage.getItem("ps_session");

  if (!sessionId) {
    sessionId = "sess_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("ps_session", sessionId);
  }

  function trackEvent(type, data = {}) {
    try {
      fetch(apiBase + "/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          type,
          session_id: sessionId,
          timestamp: new Date().toISOString(),
          page: window.location.pathname,
          ...data,
        }),
      });
    } catch (e) {
      // No-op: tracking must never break UX.
    }
  }

  function textFrom(el, selector) {
    if (!el) return "";
    const n = selector ? el.querySelector(selector) : el;
    const t = n && n.textContent ? n.textContent : "";
    return String(t).trim();
  }

  const _offerCardsObserved = typeof WeakSet !== "undefined" ? new WeakSet() : null;

  function offerViewSeenIds() {
    try {
      const raw = sessionStorage.getItem("ps_offer_viewed");
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function rememberOfferView(id) {
    const key = String(id || "").trim();
    if (!key) return false;
    try {
      const seen = offerViewSeenIds();
      if (seen.includes(key)) return false;
      seen.push(key);
      sessionStorage.setItem("ps_offer_viewed", JSON.stringify(seen.slice(-300)));
      return true;
    } catch (e) {
      return true;
    }
  }

  function setupOfferViewTracking() {
    const path = (window.location.pathname || "").toLowerCase();
    const isOffers =
      path.endsWith("/offers.html") ||
      path.endsWith("offers.html") ||
      (document.documentElement.dataset && document.documentElement.dataset.page === "offers");
    if (!isOffers) return;

    const cards = document.querySelectorAll(".offer-card[data-offer-id]");
    if (!cards.length || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((ent) => {
          if (!ent.isIntersecting) return;
          const el = ent.target;
          if (!(el instanceof Element)) return;
          const id = el.getAttribute("data-offer-id");
          if (!id || !rememberOfferView(id)) return;
          trackEvent("offer_view", { offer_id: id });
        });
      },
      { root: null, threshold: [0.2, 0.35], rootMargin: "0px 0px -5% 0px" }
    );

    cards.forEach((c) => {
      if (_offerCardsObserved && _offerCardsObserved.has(c)) return;
      if (_offerCardsObserved) _offerCardsObserved.add(c);
      io.observe(c);
    });
  }

  function init() {
    // Page load
    trackEvent("page_view");

    // Delegated click tracking for doctors and services (covers index/team/services pages)
    document.addEventListener(
      "click",
      (e) => {
        const target = e.target;
        if (!(target instanceof Element)) return;

        const docCard = target.closest(".doctor-card");
        if (docCard) {
          const doctor =
            docCard.getAttribute("data-doctor") ||
            textFrom(docCard, "h4") ||
            textFrom(docCard, "h3") ||
            textFrom(docCard, "[aria-labelledby]") ||
            "Unknown";
          trackEvent("doctor_click", { doctor });
          return;
        }

        const svcCard = target.closest(".service-card");
        if (svcCard) {
          const service = (svcCard.getAttribute("data-service") || textFrom(svcCard, "h3") || "Unknown").trim();
          trackEvent("service_click", { service });
        }
      },
      { passive: true }
    );

    // Offer impressions (offers page; cards injected by CMS — re-run on cms-data-applied)
    const runOfferViews = () => {
      try {
        setupOfferViewTracking();
      } catch (e) {
        /* no-op */
      }
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", runOfferViews, { once: true });
    } else {
      requestAnimationFrame(runOfferViews);
    }
    document.addEventListener("cms-data-applied", runOfferViews);
  }

  return { sessionId, trackEvent, init };
})();

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
    service_general: {
      ar: "طب الأسنان العام | Pearly Smile Dental Center",
      en: "General Dentistry | Pearly Smile Dental Center",
    },
    service_xray: {
      ar: "التصوير بالأشعة | Pearly Smile Dental Center",
      en: "Dental X-Ray Imaging | Pearly Smile Dental Center",
    },
    service_restorations: {
      ar: "حشوات وترميمات | Pearly Smile Dental Center",
      en: "Fillings & Restorations | Pearly Smile Dental Center",
    },
    service_gums: {
      ar: "علاج اللثة | Pearly Smile Dental Center",
      en: "Gum Care | Pearly Smile Dental Center",
    },
    service_implants: {
      ar: "زراعة الأسنان | Pearly Smile Dental Center",
      en: "Dental Implants | Pearly Smile Dental Center",
    },
    service_oral_surgery: {
      ar: "جراحة الفم | Pearly Smile Dental Center",
      en: "Oral Surgery | Pearly Smile Dental Center",
    },
    service_pediatric: {
      ar: "طب أسنان الأطفال | Pearly Smile Dental Center",
      en: "Pediatric Dentistry | Pearly Smile Dental Center",
    },
    service_endodontics: {
      ar: "علاج العصب | Pearly Smile Dental Center",
      en: "Root Canal Treatment | Pearly Smile Dental Center",
    },
    offers: {
      ar: "عروض عيد الأضحى | Pearly Smile Dental Center",
      en: "Eid Al-Adha Offers | Pearly Smile Dental Center",
    },
    team: {
      ar: "فريق الأطباء | Pearly Smile Dental Center",
      en: "Our Team | Pearly Smile Dental Center",
    },
    about: {
      ar: "عنّا | Pearly Smile Dental Center",
      en: "About Us | Pearly Smile Dental Center",
    },
    blog: {
      ar: "المدونة | Pearly Smile Dental Center",
      en: "Blog | Pearly Smile Dental Center",
    },
    blog_post: {
      ar: "مقال | Pearly Smile Dental Center",
      en: "Article | Pearly Smile Dental Center",
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
  navBlog: { ar: "المدونة", en: "Blog" },
  navTeam: { ar: "فريقنا", en: "Our Team" },
  navAbout: { ar: "عنّا", en: "About Us" },
  navBooking: { ar: "حجز", en: "Booking" },
  blogHeroTitle: {
    ar: "نصائح، أدلة، وتحديثات تساعدك على اتخاذ قرار أفضل",
    en: "Dental tips, guides, and clinic updates",
  },
  blogHeroText: {
    ar: "مقالات قصيرة وواضحة — هدفها تبسيط الخيارات وتشجيعك على حجز موعد بثقة.",
    en: "Clear, practical articles designed to help you decide and book with confidence.",
  },
  blogPageTitle: { ar: "المدونة | Pearly Smile Dental Center", en: "Blog | Pearly Smile Dental Center" },
  blogPageDescription: {
    ar: "أدلة ونصائح وتحديثات من Pearly Smile Dental Center تساعدك على العناية بصحة الفم واتخاذ قرار مناسب.",
    en: "Dental guides, clinic updates, and practical tips from Pearly Smile Dental Center.",
  },
  blogSectionEyebrow: { ar: "المقالات", en: "Articles" },
  blogSectionTitle: { ar: "أحدث المقالات", en: "Latest articles" },
  blogSearchLabel: { ar: "ابحث عن مقال…", en: "Search articles…" },
  blogTagLabel: { ar: "التصنيف", en: "Tag" },
  blogAllTags: { ar: "كل التصنيفات", en: "All tags" },
  blogPrev: { ar: "السابق", en: "Prev" },
  blogNext: { ar: "التالي", en: "Next" },
  blogReadMore: { ar: "اقرأ المزيد", en: "Read more" },
  blogReadTimeSuffix: { ar: "دقائق قراءة", en: "min read" },
  blogQuickRead: { ar: "قراءة سريعة", en: "Quick read" },
  blogNoArticles: { ar: "لا توجد مقالات مطابقة.", en: "No articles found." },
  blogNoRelated: { ar: "لا توجد مقالات ذات صلة بعد.", en: "No related articles yet." },
  blogStartApi: { ar: "تعذر تحميل المقالات. شغّل السيرفر.", en: "Unable to load blog posts. Start the API server." },
  blogMissingSlug: { ar: "الرابط غير صحيح (slug مفقود).", en: "Missing article slug." },
  blogNotFound: { ar: "المقال غير موجود.", en: "Article not found." },
  blogLoading: { ar: "جارٍ التحميل…", en: "Loading…" },
  blogBackToBlog: { ar: "العودة إلى المدونة", en: "Back to Blog" },
  blogRelatedEyebrow: { ar: "مقترحات", en: "Recommended" },
  blogRelatedTitle: { ar: "مقالات ذات صلة", en: "Related articles" },
  blogCtaTitle: { ar: "جاهز لخطوتك التالية؟", en: "Ready for your next step?" },
  blogCtaText: {
    ar: "احجز موعدك اليوم لنضع لك خطة واضحة ومريحة — ونبدأ بخطوة بثقة نحو ابتسامة صحية.",
    en: "Book today for a clear, comfort-first plan—and take the next step toward a healthier smile.",
  },
  blogCtaBook: { ar: "احجز الآن", en: "Book now" },
  blogCtaDoctors: { ar: "تعرف على الأطباء", en: "Meet our doctors" },
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
    ar: "فحص دوري، تنظيف، علاج تسوس، وخطة صحة أسنان مستمرة لكل العائلة.",
    en: "Routine check-ups, cleanings, cavity care, and an ongoing oral health plan for the whole family.",
  },
  service2Title: { ar: "صور إكس رِي", en: "X-Ray Imaging" },
  service2Text: {
    ar: "أشعة دقيقة لعرض حالة الفم كاملة قبل أي علاج أو عملية.",
    en: "Accurate imaging to assess your oral health before any treatment or procedure.",
  },
  seeAllServices: { ar: "شوف الكل", en: "See All" },
  service3Title: { ar: "حشوات وترميمات", en: "Fillings & Restorations" },
  service3Text: {
    ar: "حشوات تجميلية وتقويمية لاستعادة الأسنان وتقوية مظهرها.",
    en: "Cosmetic fillings and restorations to rebuild strength and improve appearance.",
  },
  service4Title: { ar: "اختصاص لثة", en: "Periodontal Care" },
  service4Text: {
    ar: "علاج لثة والتهاباتها مع تنظيف عميق وحماية للأسنان.",
    en: "Gum care, inflammation treatment, and deep cleaning to protect teeth.",
  },
  service5Title: { ar: "اختصاص زراعة", en: "Implant Specialist" },
  service5Text: {
    ar: "زراعة أسنان ثابتة تدوم طويلاً وتبدو طبيعية للغاية.",
    en: "Fixed implants designed to last and look natural.",
  },
  service6Title: { ar: "اختصاص جراحة فم", en: "Oral Surgery" },
  service6Text: {
    ar: "جراحات فم متقدمة لحالات معقدة والأخراج بالراحة والأمان.",
    en: "Advanced oral procedures for complex cases with comfort and safety.",
  },
  service7Title: { ar: "اختصاص أطفال", en: "Pediatric Dentistry" },
  service7Text: {
    ar: "رعاية لطيفة ومشجعة للأطفال لتجربة زيارة سهلة ومريحة.",
    en: "Gentle, encouraging care for an easy and comfortable visit.",
  },
  service8Title: { ar: "اختصاص عصب", en: "Endodontics" },
  service8Text: {
    ar: "علاج جذور حديث لتخفيف الألم وحفظ الأسنان باستخدام تقنيات متطورة.",
    en: "Modern root canal treatment to relieve pain and preserve teeth.",
  },

  /* Services cards (expanded back side) */
  service1More: {
    ar: "متابعة شاملة لصحة الفم والأسنان مع خطة علاج واضحة ونصائح يومية بسيطة للحفاظ على الابتسامة.",
    en: "Comprehensive follow-up with a clear plan and simple daily guidance to maintain a healthy smile.",
  },
  service2More: {
    ar: "تصوير رقمي سريع يساعد على تشخيص أدق وخطة علاج آمنة، مع تقارير واضحة ومتابعة أفضل للحالة.",
    en: "Fast digital imaging for more accurate diagnosis, safer planning, and clearer follow-up.",
  },
  service3More: {
    ar: "حلول ترميمية بمواد عالية الجودة لتقوية السن وتحسين الشكل والوظيفة مع نتائج طبيعية ومريحة.",
    en: "High-quality restorative options to strengthen the tooth and improve look and function with natural results.",
  },
  service4More: {
    ar: "علاج التهاب اللثة وتنظيف عميق للجذور لتحسين الصحة وتقليل النزيف والرائحة، مع خطة وقائية طويلة المدى.",
    en: "Gum inflammation care and deep cleaning to improve health and reduce bleeding/odor, with a long-term prevention plan.",
  },
  service5More: {
    ar: "تقييم دقيق وخطة زراعة مناسبة لحالتك لاستعادة الابتسامة والمضغ بثبات، مع متابعة لضمان أفضل نتيجة.",
    en: "A precise assessment and tailored implant plan to restore your smile and bite with confident follow-up.",
  },
  service6More: {
    ar: "إجراءات جراحية دقيقة مع تخطيط مسبق وتعليمات واضحة قبل وبعد، لتجربة آمنة وتقليل الانزعاج.",
    en: "Carefully planned procedures with clear before/after guidance for a safer, more comfortable experience.",
  },
  service7More: {
    ar: "بيئة ودودة وخطوات علاج بسيطة تساعد الطفل على الشعور بالأمان، مع إرشادات للأهل للعناية اليومية.",
    en: "A friendly environment and simple steps to help kids feel safe—plus guidance for parents at home.",
  },
  service8More: {
    ar: "علاج جذور يركز على تقليل الألم وحفظ السن، مع خطوات دقيقة وشرح واضح لما تحتاجه قبل وبعد الجلسة.",
    en: "Root canal care focused on pain relief and tooth preservation, with clear steps and guidance before and after.",
  },

  /* Shared labels (services system) */
  serviceBackToServices: { ar: "العودة إلى الخدمات", en: "Back to Services" },
  serviceImageFallback: { ar: "صورة الخدمة", en: "Service image" },
  serviceDetailOverviewTitle: { ar: "نظرة عامة", en: "Overview" },
  serviceDetailWhoForTitle: { ar: "لمن تناسب؟", en: "Who is it for?" },
  serviceDetailWhatExpectTitle: { ar: "ماذا تتوقع في الزيارة؟", en: "What to expect" },
  serviceDetailBenefitsTitle: { ar: "لماذا يختارنا المرضى؟", en: "Why patients choose us" },
  serviceDetailStepsTitle: { ar: "خطوات الخدمة", en: "How it works" },
  serviceDetailAftercareTitle: { ar: "بعد الزيارة", en: "Aftercare" },
  serviceDetailFaqTitle: { ar: "أسئلة شائعة", en: "FAQs" },
  serviceCtaTitle: { ar: "جاهز لخطوتك التالية؟", en: "Ready for your next step?" },
  serviceCtaText: {
    ar: "احجز موعدك اليوم لنضع لك خطة واضحة ومريحة — ونبدأ بخطوة بثقة نحو ابتسامة صحية.",
    en: "Book today for a clear, comfort-first plan—and take the next step toward a healthier smile.",
  },
  serviceCtaBook: { ar: "احجز الآن", en: "Book now" },
  serviceCtaCall: { ar: "اتصل بنا", en: "Call us" },

  /* Detail pages hero + body copy */
  serviceGeneralHeroText: {
    ar: "رعاية يومية متكاملة لصحة الفم والأسنان — فحص شامل، تنظيف، وعلاج تسوس بخطة واضحة تناسب احتياجك.",
    en: "Everyday comprehensive care—check-ups, cleanings, and cavity treatment with a clear plan tailored to you.",
  },
  serviceGeneralOverview: {
    ar: "نساعدك على الحفاظ على صحة الفم والأسنان عبر فحوصات دورية وتنظيف احترافي، مع علاج مبكر للمشكلات لتفادي تفاقمها.",
    en: "We help you maintain oral health with routine exams and professional cleanings—catching issues early before they grow.",
  },
  serviceGeneralWhoFor: {
    ar: "مناسبة للجميع: زيارات دورية، تنظيف، متابعة حساسية الأسنان، ومعالجة التسوس البسيط — لكل الأعمار.",
    en: "For everyone—routine visits, cleanings, sensitivity follow-up, and early cavity care across all ages.",
  },
  serviceGeneralWhatExpect: {
    ar: "تقييم الحالة، شرح الخيارات، ثم تنفيذ الإجراء بخطوات مريحة. ستحصل على توصيات واضحة للعناية المنزلية والمتابعة.",
    en: "Assessment, clear options, then comfortable treatment steps—plus simple at-home guidance and follow-up recommendations.",
  },
  serviceGeneralBenefit1: {
    ar: "خطة واضحة خطوة بخطوة، بدون مفاجآت في العلاج.",
    en: "A clear step-by-step plan—no surprises.",
  },
  serviceGeneralBenefit2: {
    ar: "تركيز على الوقاية وتقليل الحاجة لإجراءات أكبر لاحقًا.",
    en: "Prevention-first to reduce the need for bigger procedures later.",
  },
  serviceGeneralBenefit3: {
    ar: "تنظيف احترافي بلطف مع نصائح عملية للعناية اليومية.",
    en: "Gentle professional cleaning with practical daily-care tips.",
  },
  serviceGeneralBenefit4: {
    ar: "متابعة منظمة للحالات الحساسة والتسوس المبكر.",
    en: "Structured follow-up for sensitivity and early decay.",
  },
  serviceGeneralStep1: {
    ar: "فحص شامل وتقييم اللثة والأسنان.",
    en: "Comprehensive exam of teeth and gums.",
  },
  serviceGeneralStep2: {
    ar: "تنظيف احترافي وإزالة الترسبات بلطف.",
    en: "Professional cleaning with gentle plaque/tartar removal.",
  },
  serviceGeneralStep3: {
    ar: "علاج موجه للتسوس أو الحساسية عند الحاجة.",
    en: "Targeted care for cavities or sensitivity when needed.",
  },
  serviceGeneralStep4: {
    ar: "خطة متابعة وتوصيات منزلية قابلة للتطبيق.",
    en: "A follow-up plan with simple at-home guidance.",
  },
  serviceGeneralAftercare: {
    ar: "سنقترح روتينًا بسيطًا للتفريش والخيط، ونحدد مواعيد متابعة حسب حالتك. الهدف: ابتسامة صحية بثقة وراحة على المدى الطويل.",
    en: "We’ll recommend a simple brushing/flossing routine and schedule follow-ups based on your needs—so your smile stays healthy long-term.",
  },
  serviceGeneralFaqQ1: { ar: "كم مرة أحتاج لزيارة الطبيب العام؟", en: "How often should I come in?" },
  serviceGeneralFaqA1: {
    ar: "غالبًا كل 6 أشهر، وقد تختلف حسب صحة اللثة والتسوس السابق. سنقترح ما يناسبك بعد الفحص.",
    en: "Often every 6 months, but it depends on gum health and past decay. We’ll recommend the right interval after your exam.",
  },
  serviceGeneralFaqQ2: { ar: "هل التنظيف يسبب ألمًا؟", en: "Does cleaning hurt?" },
  serviceGeneralFaqA2: {
    ar: "عادة يكون مريحًا، وقد تشعر بحساسية بسيطة إذا كانت اللثة ملتهبة. نعمل بلطف ونشرح كل خطوة.",
    en: "It’s usually comfortable. Mild sensitivity can happen if gums are inflamed—we work gently and explain each step.",
  },
  serviceGeneralFaqQ3: { ar: "متى أحتاج علاجًا إضافيًا؟", en: "When do I need additional treatment?" },
  serviceGeneralFaqA3: {
    ar: "إذا وُجد تسوس أو التهاب، سنوضح الخيارات والبدائل ونبدأ بأقل إجراء مناسب للحالة.",
    en: "If decay or inflammation is found, we’ll explain options and start with the least appropriate step for your case.",
  },

  serviceXrayHeroText: {
    ar: "تصوير رقمي سريع يساعد على تشخيص أدق وخطة علاج آمنة، مع نتائج واضحة يسهل متابعتها.",
    en: "Fast digital imaging for more accurate diagnosis and safer planning—with clear results you can follow.",
  },
  serviceXrayOverview: {
    ar: "نستخدم التصوير الرقمي لتوضيح حالة الأسنان والعظم بدقة، مما يساعد في اختيار الخطة الأنسب للعلاج وتقييم النتائج.",
    en: "Digital imaging provides a clear view of teeth and bone, supporting the best plan and better outcome evaluation.",
  },
  serviceXrayWhoFor: {
    ar: "مناسبة قبل الحشوات، علاج العصب، الزراعة، أو عند وجود ألم غير واضح السبب — لتشخيص أدق بأسرع وقت.",
    en: "Helpful before fillings, root canal, implants, or when pain is unclear—so we can diagnose faster and more accurately.",
  },
  serviceXrayWhatExpect: {
    ar: "تصوير سريع وخفيف، ثم شرح النتائج بصورة واضحة وربطها بخطة العلاج المقترحة مع إجابة أسئلتك.",
    en: "A quick scan, then a clear explanation of findings and how they connect to your recommended plan.",
  },
  serviceXrayBenefit1: { ar: "صور واضحة تساعد على اتخاذ قرار علاجي أدق.", en: "Clear images support better decisions." },
  serviceXrayBenefit2: { ar: "سرعة في التنفيذ ونتائج يمكن شرحها بسهولة.", en: "Fast process with easy-to-explain results." },
  serviceXrayBenefit3: { ar: "ربط النتائج بخطة علاج واقعية ومفهومة.", en: "Findings tied to a practical, understandable plan." },
  serviceXrayBenefit4: { ar: "متابعة أفضل لتطور الحالة قبل/بعد العلاج.", en: "Better before/after tracking of progress." },
  serviceXrayStep1: { ar: "تقييم سريع لما تحتاجه من تصوير.", en: "Quick assessment of what imaging is needed." },
  serviceXrayStep2: { ar: "التقاط الصور بوقت قصير وبشكل مريح.", en: "Capture images quickly and comfortably." },
  serviceXrayStep3: { ar: "مراجعة النتائج وشرحها بطريقة بسيطة.", en: "Review results and explain them simply." },
  serviceXrayStep4: { ar: "توصية واضحة بخطوة العلاج التالية إن لزم.", en: "Clear recommendation for the next step if needed." },
  serviceXrayAftercare: {
    ar: "قد نستخدم الصور كمرجع للمتابعة. ستغادر ومعك فهم واضح لما تعنيه النتائج وما هي الخطوة التالية.",
    en: "We may use the images for follow-up. You’ll leave with a clear understanding of what they mean and what comes next.",
  },
  serviceXrayFaqQ1: { ar: "هل التصوير بالأشعة آمن؟", en: "Is dental X-ray imaging safe?" },
  serviceXrayFaqA1: {
    ar: "نستخدم تصويرًا رقميًا بجرعات منخفضة قدر الإمكان، ويتم تحديد الحاجة إليه حسب الحالة.",
    en: "We use digital imaging with the lowest reasonable exposure and only when clinically needed.",
  },
  serviceXrayFaqQ2: { ar: "هل أحتاج أشعة لكل زيارة؟", en: "Do I need X-rays every visit?" },
  serviceXrayFaqA2: {
    ar: "ليس دائمًا. نعتمد على الأعراض والخطة العلاجية، ونستخدم التصوير عند وجود فائدة تشخيصية واضحة.",
    en: "Not always. It depends on symptoms and your plan—we image when there’s a clear diagnostic benefit.",
  },
  serviceXrayFaqQ3: { ar: "هل يمكنني فهم النتائج؟", en: "Will I understand the results?" },
  serviceXrayFaqA3: {
    ar: "نعم. نعرض النتائج ونشرحها بلغة بسيطة مع ما تعنيه على الخطة العلاجية.",
    en: "Yes—we’ll show and explain them in plain language and how they affect your plan.",
  },

  serviceRestorationsBenefit1: { ar: "نتائج طبيعية من حيث اللون والملمس.", en: "Natural-looking results in color and texture." },
  serviceRestorationsBenefit2: { ar: "حماية للسن وتقوية للوظيفة اليومية.", en: "Protects the tooth and strengthens daily function." },
  serviceRestorationsBenefit3: { ar: "شرح واضح للخيارات قبل البدء.", en: "Clear options explained before we begin." },
  serviceRestorationsBenefit4: { ar: "تشطيب دقيق لراحة أفضل عند المضغ.", en: "Precise finishing for a more comfortable bite." },
  serviceRestorationsStep1: { ar: "فحص وتشخيص لتحديد نوع الترميم المناسب.", en: "Exam and diagnosis to choose the right restoration." },
  serviceRestorationsStep2: { ar: "تحضير بسيط وإزالة التسوس عند الحاجة.", en: "Simple preparation and decay removal if needed." },
  serviceRestorationsStep3: { ar: "تطبيق الترميم واختيار اللون المناسب.", en: "Place the restoration and match the shade." },
  serviceRestorationsStep4: { ar: "تشطيب وتلميع مع إرشادات للحفاظ على النتيجة.", en: "Finish and polish with guidance to maintain results." },
  serviceRestorationsAftercare: {
    ar: "سنوضح ما يجب تجنبه خلال أول 24 ساعة إن لزم، وكيف تحافظ على الحشوة/الترميم عبر روتين تنظيف بسيط وفحوصات دورية.",
    en: "We’ll explain what to avoid in the first 24 hours if needed and how to maintain your restoration with simple care and regular check-ups.",
  },
  serviceRestorationsFaqQ1: { ar: "هل شكل الحشوة سيكون واضحًا؟", en: "Will the filling be noticeable?" },
  serviceRestorationsFaqA1: { ar: "نختار اللون بعناية ونقوم بتشطيب دقيق لتبدو النتيجة طبيعية قدر الإمكان.", en: "We match the shade carefully and finish precisely so it looks as natural as possible." },
  serviceRestorationsFaqQ2: { ar: "كم تدوم الحشوات والترميمات؟", en: "How long do fillings/restorations last?" },
  serviceRestorationsFaqA2: { ar: "تعتمد على العناية اليومية ونمط المضغ. المتابعة الدورية تساعد على إطالة العمر الافتراضي.", en: "It depends on daily care and biting habits. Regular follow-ups help extend longevity." },
  serviceRestorationsFaqQ3: { ar: "هل أحتاج أكثر من جلسة؟", en: "Will I need more than one visit?" },
  serviceRestorationsFaqA3: { ar: "في الغالب جلسة واحدة تكفي للحشوات البسيطة، وقد نحتاج أكثر حسب حجم الحالة ونوع الترميم.", en: "Most simple fillings are done in one visit. Larger cases may require more depending on the restoration type." },

  serviceGumsBenefit1: { ar: "تحسين صحة اللثة وتقليل النزيف بشكل ملحوظ.", en: "Improves gum health and reduces bleeding." },
  serviceGumsBenefit2: { ar: "تنظيف علاجي يساعد على تقليل الالتهابات والرائحة.", en: "Therapeutic cleaning that helps reduce inflammation and odor." },
  serviceGumsBenefit3: { ar: "خطة وقائية طويلة المدى لتجنب تدهور الحالة.", en: "Long-term prevention plan to avoid worsening." },
  serviceGumsBenefit4: { ar: "إرشادات منزلية عملية وسهلة الالتزام.", en: "Practical at-home guidance that’s easy to follow." },
  serviceGumsStep1: { ar: "تقييم اللثة وتحديد مستوى الالتهاب.", en: "Assess gums and determine inflammation level." },
  serviceGumsStep2: { ar: "تنظيف علاجي وإزالة الترسبات تحت اللثة عند الحاجة.", en: "Therapeutic cleaning and sub-gum deposits removal if needed." },
  serviceGumsStep3: { ar: "تخفيف الالتهاب بخطة علاج مناسبة.", en: "Reduce inflammation with an appropriate care plan." },
  serviceGumsStep4: { ar: "متابعة وقائية لضمان استقرار النتائج.", en: "Preventive follow-up to keep results stable." },
  serviceGumsAftercare: {
    ar: "سنعطيك روتينًا بسيطًا للتفريش والخيط وغسول مناسب إن لزم، مع مواعيد متابعة تضمن ثبات النتائج وتحسنها.",
    en: "We’ll provide a simple brushing/flossing routine and a suitable rinse if needed, plus follow-ups to maintain and improve results.",
  },
  serviceGumsFaqQ1: { ar: "هل نزيف اللثة أمر طبيعي؟", en: "Is gum bleeding normal?" },
  serviceGumsFaqA1: { ar: "النزيف المتكرر غالبًا علامة التهاب. العلاج والتنظيف والالتزام بروتين العناية يساعدان على التحسن.", en: "Frequent bleeding is often a sign of inflammation. Treatment, cleaning, and consistent care usually improve it." },
  serviceGumsFaqQ2: { ar: "هل التنظيف العميق مؤلم؟", en: "Is deep cleaning painful?" },
  serviceGumsFaqA2: { ar: "نسعى لراحة المريض قدر الإمكان، وقد نستخدم وسائل مساعدة حسب الحالة. نوضح كل خطوة قبل البدء.", en: "We aim for maximum comfort and may use supportive measures depending on your case. We explain each step beforehand." },
  serviceGumsFaqQ3: { ar: "كم تحتاج اللثة لتتحسن؟", en: "How long does improvement take?" },
  serviceGumsFaqA3: { ar: "يختلف حسب شدة الالتهاب والالتزام المنزلي. غالبًا تبدأ النتائج خلال أسابيع مع المتابعة.", en: "It depends on severity and at-home consistency. Many patients see improvement within weeks with follow-up." },

  serviceImplantsBenefit1: { ar: "خطة زراعة واضحة مبنية على تقييم وتشخيص دقيق.", en: "A clear implant plan built on precise evaluation." },
  serviceImplantsBenefit2: { ar: "تركيز على النتيجة الطبيعية والثبات في المضغ.", en: "Focus on natural results and stable chewing." },
  serviceImplantsBenefit3: { ar: "شرح مبسط للمراحل والمدة المتوقعة قبل البدء.", en: "Simple explanation of stages and expected timeline." },
  serviceImplantsBenefit4: { ar: "متابعة بعدية منظمة لضمان أفضل اندماج وراحة.", en: "Structured follow-up for optimal healing and comfort." },
  serviceImplantsStep1: { ar: "تقييم شامل وصور تشخيصية لتحديد الخطة.", en: "Comprehensive evaluation and imaging to plan." },
  serviceImplantsStep2: { ar: "تجهيز الخطة (المراحل، الزمن، والتكلفة المتوقعة).", en: "Prepare the plan (stages, timeline, expected cost)." },
  serviceImplantsStep3: { ar: "تنفيذ الزراعة وفق المعايير المناسبة للحالة.", en: "Perform the implant procedure based on your case." },
  serviceImplantsStep4: { ar: "متابعة وتركيب الترميم النهائي لتحقيق نتيجة طبيعية.", en: "Follow-up and final restoration for a natural result." },
  serviceImplantsAftercare: {
    ar: "نتابع معك خطوة بخطوة ونوضح تعليمات العناية بعد كل مرحلة. الالتزام بالتعليمات والمتابعة يرفع نسبة النجاح ويحسن الراحة.",
    en: "We follow up step-by-step and provide guidance after each stage. Consistent care and follow-up improve success and comfort.",
  },
  serviceImplantsFaqQ1: { ar: "هل زراعة الأسنان مناسبة للجميع؟", en: "Are implants suitable for everyone?" },
  serviceImplantsFaqA1: { ar: "تعتمد على صحة العظم واللثة والحالة العامة. نحدد ذلك بعد فحص وتصوير مناسب.", en: "It depends on bone/gum health and overall condition. We confirm suitability after exam and imaging." },
  serviceImplantsFaqQ2: { ar: "كم تستغرق مراحل الزراعة؟", en: "How long do implant stages take?" },
  serviceImplantsFaqA2: { ar: "تختلف حسب الحالة. سنوضح لك المدة المتوقعة وخطوات المتابعة قبل البدء.", en: "It varies by case. We’ll explain the expected timeline and follow-up steps before starting." },
  serviceImplantsFaqQ3: { ar: "هل النتيجة ستكون طبيعية؟", en: "Will it look natural?" },
  serviceImplantsFaqA3: { ar: "نستهدف نتيجة قريبة جدًا من الطبيعي من حيث الشكل والوظيفة، مع اختيار ترميم مناسب لحالتك.", en: "We aim for a highly natural look and function with a restoration tailored to your case." },

  serviceOralSurgeryBenefit1: { ar: "تقييم دقيق وخطة واضحة قبل أي إجراء.", en: "Accurate evaluation and a clear plan before any procedure." },
  serviceOralSurgeryBenefit2: { ar: "تركيز على الراحة وتقليل القلق أثناء الزيارة.", en: "Comfort-first approach to reduce anxiety." },
  serviceOralSurgeryBenefit3: { ar: "تعليمات مكتوبة وواضحة لما قبل/بعد الإجراء.", en: "Clear written guidance before and after the procedure." },
  serviceOralSurgeryBenefit4: { ar: "متابعة منظمة لضمان التعافي بشكل أفضل.", en: "Structured follow-up for smoother recovery." },
  serviceOralSurgeryStep1: { ar: "تشخيص وتخطيط اعتمادًا على الفحص والصور.", en: "Diagnosis and planning based on exam and imaging." },
  serviceOralSurgeryStep2: { ar: "شرح الإجراء والبدائل وتوقعات التعافي.", en: "Explain the procedure, alternatives, and recovery expectations." },
  serviceOralSurgeryStep3: { ar: "تنفيذ آمن بخطوات مريحة قدر الإمكان.", en: "Perform safely with comfort in mind." },
  serviceOralSurgeryStep4: { ar: "متابعة بعدية وتعليمات تساعد على الشفاء.", en: "Aftercare and follow-up instructions to support healing." },
  serviceOralSurgeryAftercare: { ar: "سنعطيك إرشادات واضحة للأدوية والعناية والغذاء مؤقتًا إن لزم، مع موعد متابعة لضمان سير التعافي بالشكل الصحيح.", en: "We provide clear guidance on meds, care, and temporary diet if needed, plus a follow-up to ensure proper healing." },
  serviceOralSurgeryFaqQ1: { ar: "هل سأشعر بألم بعد الإجراء؟", en: "Will I have pain after the procedure?" },
  serviceOralSurgeryFaqA1: { ar: "قد يحدث انزعاج بسيط يختلف حسب الحالة. سنوضح خطة الراحة/الأدوية لتقليل الألم قدر الإمكان.", en: "Some discomfort can occur depending on the case. We’ll explain a comfort/medication plan to minimize pain." },
  serviceOralSurgeryFaqQ2: { ar: "كم يستغرق التعافي؟", en: "How long is recovery?" },
  serviceOralSurgeryFaqA2: { ar: "يعتمد على نوع الإجراء. سنعطيك توقعًا واضحًا ونقاطًا تساعدك على التعافي بسرعة.", en: "It depends on the procedure. We’ll give clear expectations and tips to recover faster." },
  serviceOralSurgeryFaqQ3: { ar: "هل أحتاج صورًا قبل الجراحة؟", en: "Do I need imaging before surgery?" },
  serviceOralSurgeryFaqA3: { ar: "غالبًا نعم لتخطيط أدق. نحدد ذلك حسب الحالة ونشرح السبب بوضوح.", en: "Often yes for precise planning. We’ll decide based on your case and explain why." },

  servicePediatricBenefit1: { ar: "أسلوب لطيف يخفف قلق الطفل ويزيد تعاونه.", en: "A gentle approach that reduces anxiety and improves cooperation." },
  servicePediatricBenefit2: { ar: "شرح مبسط للأهل وخطة متابعة واضحة.", en: "Simple explanations for parents and a clear follow-up plan." },
  servicePediatricBenefit3: { ar: "تركيز على الوقاية والتعليم اليومي.", en: "Strong focus on prevention and daily habits." },
  servicePediatricBenefit4: { ar: "زيارات منظمة تحافظ على صحة الأسنان مبكرًا.", en: "Structured visits that protect dental health early." },
  servicePediatricStep1: { ar: "تعارف وتهيئة للطفل قبل الفحص.", en: "Warm welcome and preparation before the exam." },
  servicePediatricStep2: { ar: "فحص بسيط مع شرح لطيف ومناسب للعمر.", en: "Simple exam with age-appropriate explanations." },
  servicePediatricStep3: { ar: "خطة علاج/وقاية حسب الحالة.", en: "A prevention/treatment plan based on the case." },
  servicePediatricStep4: { ar: "إرشادات للأهل لروتين يومي يدعم النتائج.", en: "Parent guidance for a daily routine that supports results." },
  servicePediatricAftercare: { ar: "سنحدد مواعيد متابعة مناسبة لعمر الطفل، ونشارك نصائح بسيطة تساعد على تقليل التسوس وتحسين العادات اليومية.", en: "We’ll schedule age-appropriate follow-ups and share simple tips to reduce cavities and improve daily habits." },
  servicePediatricFaqQ1: { ar: "متى تكون أول زيارة للطفل؟", en: "When should the first visit be?" },
  servicePediatricFaqA1: { ar: "يفضل مبكرًا مع بداية ظهور الأسنان أو خلال السنة الأولى، ثم زيارات متابعة حسب توصية الطبيب.", en: "Early—when teeth start to appear or within the first year—then follow-ups as recommended." },
  servicePediatricFaqQ2: { ar: "كيف نخفف خوف الطفل؟", en: "How can we reduce fear?" },
  servicePediatricFaqA2: { ar: "نستخدم أسلوبًا تدريجيًا ولطيفًا، ونشرح للطفل بطريقة مبسطة. وجود الأهل يساعد أيضًا.", en: "We use a gradual, gentle approach and explain simply. A parent’s presence often helps too." },
  servicePediatricFaqQ3: { ar: "هل الوقاية أفضل من العلاج؟", en: "Is prevention better than treatment?" },
  servicePediatricFaqA3: { ar: "نعم، الوقاية والمتابعة تقللان الحاجة لإجراءات أكبر. نساعدك بروتين بسيط يناسب الطفل.", en: "Yes—prevention and follow-ups reduce the need for bigger procedures. We’ll help with a simple child-friendly routine." },

  serviceEndodonticsBenefit1: { ar: "تركيز على تخفيف الألم بسرعة وبخطوات واضحة.", en: "Focused on fast pain relief with clear steps." },
  serviceEndodonticsBenefit2: { ar: "تقنيات حديثة تساعد على الدقة وتقليل الانزعاج.", en: "Modern techniques for precision and comfort." },
  serviceEndodonticsBenefit3: { ar: "شرح مبسط لما يحدث داخل السن ولماذا نحتاج العلاج.", en: "Simple explanation of what’s happening and why treatment is needed." },
  serviceEndodonticsBenefit4: { ar: "تعليمات بعدية تساعد على التعافي والمتابعة بثقة.", en: "Aftercare guidance to recover and follow up confidently." },
  serviceEndodonticsStep1: { ar: "تشخيص لتحديد سبب الألم وخطة العلاج.", en: "Diagnosis to identify pain cause and plan treatment." },
  serviceEndodonticsStep2: { ar: "تنظيف القنوات وإزالة الالتهاب بدقة.", en: "Clean canals and remove inflammation precisely." },
  serviceEndodonticsStep3: { ar: "حشو وحماية القنوات للحفاظ على السن.", en: "Fill and protect canals to preserve the tooth." },
  serviceEndodonticsStep4: { ar: "متابعة وتوجيهات لاستكمال الترميم إن لزم.", en: "Follow-up and guidance to complete restoration if needed." },
  serviceEndodonticsAftercare: { ar: "قد تشعر بحساسية بسيطة لفترة قصيرة. سنوضح لك ما هو طبيعي وما يستدعي التواصل، ونحدد الخطوة التالية لحماية السن.", en: "You may feel mild sensitivity briefly. We’ll explain what’s normal, what to watch for, and the next step to protect the tooth." },
  serviceEndodonticsFaqQ1: { ar: "هل علاج العصب مؤلم؟", en: "Is a root canal painful?" },
  serviceEndodonticsFaqA1: { ar: "الهدف الأساسي هو إزالة الألم. مع التخدير والخطوات الحديثة، تكون الجلسة غالبًا مريحة.", en: "The goal is pain relief. With anesthesia and modern steps, treatment is usually comfortable." },
  serviceEndodonticsFaqQ2: { ar: "هل يمكن حفظ السن بدل الخلع؟", en: "Can the tooth be saved instead of extracted?" },
  serviceEndodonticsFaqA2: { ar: "في كثير من الحالات نعم. بعد التشخيص نوضح أفضل خيار للحفاظ على السن ووظيفته.", en: "Often yes. After diagnosis we’ll recommend the best option to preserve the tooth and function." },
  serviceEndodonticsFaqQ3: { ar: "متى أحتاج ترميمًا بعد العلاج؟", en: "When do I need restoration after treatment?" },
  serviceEndodonticsFaqA3: { ar: "قد تحتاج حشوة أو تاج حسب الحالة. نوضح الخطة بعد الجلسة لضمان حماية السن.", en: "You may need a filling or crown depending on the case. We’ll outline the plan to protect the tooth." },

  serviceRestorationsHeroText: {
    ar: "حلول ترميمية بمواد عالية الجودة لتحسين الشكل والوظيفة مع نتائج طبيعية ومريحة.",
    en: "High-quality restorations that improve look and function with natural, comfortable results.",
  },
  serviceRestorationsOverview: {
    ar: "نستخدم حشوات تجميلية وترميمات حديثة لإصلاح التسوس أو الكسر، مع اختيار اللون والشكل الأقرب لطبيعة الأسنان.",
    en: "We use modern fillings and restorations to repair decay or small fractures, matching color and shape naturally.",
  },
  serviceRestorationsWhoFor: {
    ar: "لمن لديهم تسوس، تآكل، أو كسر بسيط، أو يرغبون بتحسين شكل السن مع الحفاظ على وظيفته.",
    en: "For decay, wear, or minor fractures—or anyone improving a tooth’s appearance while preserving function.",
  },
  serviceRestorationsWhatExpect: {
    ar: "تقييم الحالة ثم تحضير بسيط للحشوة/الترميم، مع إنهاء مريح وتوجيهات للحفاظ على النتيجة.",
    en: "Assessment, a simple preparation, then comfortable finishing—plus guidance to protect your results.",
  },

  serviceGumsHeroText: {
    ar: "علاج التهاب اللثة وتنظيف عميق للجذور لتحسين الصحة وتقليل النزيف والرائحة بخطة وقائية.",
    en: "Gum inflammation care and deep cleaning to improve health and reduce bleeding/odor with prevention in mind.",
  },
  serviceGumsOverview: {
    ar: "نقيّم صحة اللثة ونستخدم تقنيات تنظيف وعلاج تساعد على تقليل الالتهابات وحماية الأسنان على المدى الطويل.",
    en: "We assess gum health and use cleaning/treatment techniques that reduce inflammation and protect teeth long-term.",
  },
  serviceGumsWhoFor: {
    ar: "لمن يعاني من نزيف أثناء التفريش، رائحة فم مستمرة، أو حساسية/تراجع في اللثة — ولمن يريد وقاية مبكرة.",
    en: "For bleeding while brushing, persistent bad breath, or gum sensitivity/recession—and for early prevention.",
  },
  serviceGumsWhatExpect: {
    ar: "فحص وتقييم ثم تنظيف علاجي عند الحاجة، مع خطة متابعة ونصائح يومية تساعد على تثبيت النتائج.",
    en: "Evaluation, therapeutic cleaning when needed, and a follow-up plan with daily tips to keep results stable.",
  },

  serviceImplantsHeroText: {
    ar: "تقييم دقيق وخطة زراعة مناسبة لحالتك لاستعادة الابتسامة والمضغ بثبات، مع متابعة لضمان أفضل نتيجة.",
    en: "A precise assessment and tailored implant plan to restore your smile and bite—with careful follow-up.",
  },
  serviceImplantsOverview: {
    ar: "تساعد زراعة الأسنان على تعويض الأسنان المفقودة بشكل ثابت. نبدأ بتقييم شامل ثم نحدد الخطة الأنسب للحصول على نتيجة طبيعية وآمنة.",
    en: "Dental implants replace missing teeth with a stable solution. We assess thoroughly and build a plan for safe, natural results.",
  },
  serviceImplantsWhoFor: {
    ar: "لمن فقد سنًا أو أكثر ويريد حلاً ثابتًا، أو لا يناسبه الحل المتحرك — بعد تقييم صحة العظم واللثة.",
    en: "For missing teeth when you want a fixed solution—after evaluating bone and gum health.",
  },
  serviceImplantsWhatExpect: {
    ar: "فحص وصور تشخيصية، ثم شرح مراحل الزراعة والمدة المتوقعة، مع إرشادات واضحة قبل وبعد كل مرحلة.",
    en: "Exam and imaging, then an explanation of stages and timelines—with clear guidance before and after each step.",
  },

  serviceOralSurgeryHeroText: {
    ar: "إجراءات جراحية دقيقة مع تخطيط مسبق وتعليمات واضحة قبل وبعد، لتجربة آمنة وتقليل الانزعاج.",
    en: "Carefully planned oral procedures with clear before/after guidance for a safer, more comfortable experience.",
  },
  serviceOralSurgeryOverview: {
    ar: "نوفر إجراءات جراحية للفم في حالات محددة بعد تقييم دقيق، مع شرح الخطة وتقليل القلق عبر خطوات واضحة.",
    en: "We provide oral procedures for specific cases after careful evaluation, with a clear plan to reduce anxiety.",
  },
  serviceOralSurgeryWhoFor: {
    ar: "للحالات التي تحتاج تدخلاً جراحيًا مثل بعض الخلع المعقد أو مشكلات معينة — بعد تقييم الطبيب.",
    en: "For cases requiring surgical intervention—such as certain complex extractions—after your dentist’s evaluation.",
  },
  serviceOralSurgeryWhatExpect: {
    ar: "شرح مبسط للإجراء، خطة الألم/الراحة، وتعليمات بعد العملية تساعد على تعافٍ أفضل ومتابعة منظمة.",
    en: "A simple explanation, comfort/pain plan, and post-care instructions to support smoother recovery and follow-up.",
  },

  servicePediatricHeroText: {
    ar: "بيئة ودودة وخطوات علاج بسيطة تساعد الطفل على الشعور بالأمان، مع إرشادات للأهل للعناية اليومية.",
    en: "A friendly environment and simple steps to help kids feel safe—plus at-home guidance for parents.",
  },
  servicePediatricOverview: {
    ar: "نركز على راحة الطفل وبناء تجربة إيجابية. نشرح الخطوات بطريقة بسيطة ونختار حلولًا مناسبة لعمر الطفل وحالته.",
    en: "We focus on comfort and a positive experience—explaining steps simply and choosing age-appropriate solutions.",
  },
  servicePediatricWhoFor: {
    ar: "للأطفال من أول زيارة وحتى المتابعة الدورية، ولعلاج التسوس أو الوقاية، ولتعليم العناية اليومية بأسلوب لطيف.",
    en: "From first visits to routine follow-ups—prevention, cavity care, and gentle daily-care education.",
  },
  servicePediatricWhatExpect: {
    ar: "استقبال هادئ، فحص بسيط، ثم شرح للأهل وخطة متابعة. هدفنا أن يخرج الطفل مرتاحًا وواثقًا.",
    en: "A calm welcome, simple exam, then a clear plan for parents—so your child leaves comfortable and confident.",
  },

  serviceEndodonticsHeroText: {
    ar: "علاج جذور يركز على تقليل الألم وحفظ السن، مع خطوات دقيقة وشرح واضح لما تحتاجه قبل وبعد الجلسة.",
    en: "Root canal care focused on pain relief and tooth preservation, with clear guidance before and after.",
  },
  serviceEndodonticsOverview: {
    ar: "يساعد علاج العصب على إزالة الألم وحفظ السن عند التهاب العصب. نستخدم تقنيات حديثة لراحة أكبر ودقة أعلى.",
    en: "Root canal treatment relieves pain and preserves the tooth when the nerve is inflamed, using modern techniques for comfort and precision.",
  },
  serviceEndodonticsWhoFor: {
    ar: "لمن يعاني من ألم مستمر، حساسية قوية، أو التهاب عصب — بعد فحص وتشخيص يحدد العلاج المناسب.",
    en: "For persistent pain, strong sensitivity, or nerve inflammation—after an exam confirms the right approach.",
  },
  serviceEndodonticsWhatExpect: {
    ar: "تخفيف الألم ثم تنفيذ خطوات العلاج بشكل مريح، مع تعليمات بعد الجلسة لمساعدتك على التعافي والمتابعة.",
    en: "Comfortable treatment steps focused on pain relief, plus aftercare instructions to support recovery and follow-up.",
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
  // About Us Page Translations
  aboutEyebrow: { ar: "تعرف على قصة نجاحنا", en: "Our Story" },
  aboutTitle: { ar: "مرحباً بكم في Pearly Smile Dental Center", en: "Welcome to Pearly Smile Dental Center" },
  aboutSubtitle: {
    ar: "نحن فخورون بخدمة مجتمع أبوظبي منذ عام 2018، ونقدم رعاية أسنان متكاملة بتقنيات حديثة وطاقم طبي محترف.",
    en: "We proudly serve the Abu Dhabi community since 2018, offering comprehensive dental care with modern technology and professional medical staff."
  },
  aboutStoryTitle: { ar: "قصتنا ورحلتنا", en: "Our Story & Journey" },
  aboutStoryText1: {
    ar: "تأسس مركز بيرلي سمايل لطب الأسنان في عام 2018 برؤية واضحة: تقديم رعاية أسنان استثنائية تجمع بين أحدث التقنيات والرعاية الإنسانية المتميزة. بدأنا كعيادة صغيرة في قلب أبوظبي، وبتفانٍ فريقنا وثقة مرضانا، نمينا لتصبح واحدة من أبرز مراكز طب الأسنان في الإمارات.",
    en: "Pearly Smile Dental Center was founded in 2018 with a clear vision: to provide exceptional dental care that combines the latest technology with outstanding human care. We started as a small clinic in the heart of Abu Dhabi, and through our team's dedication and our patients' trust, we grew to become one of the leading dental centers in the UAE."
  },
  aboutStoryText2: {
    ar: "اليوم، نخدم آلاف العائلات في أبوظبي والإمارات المجاورة، ونفتخر بكوننا وجهة موثوقة للرعاية الشاملة للأسنان. نحن نؤمن بأن الابتسامة الصحية هي حق للجميع، ونسعى جاهدين لجعل تجربة علاج الأسنان مريحة ومريحة لكل مريض.",
    en: "Today, we serve thousands of families in Abu Dhabi and neighboring emirates, and we are proud to be a trusted destination for comprehensive dental care. We believe that a healthy smile is everyone's right, and we strive to make the dental treatment experience comfortable and reassuring for every patient."
  },
  aboutImageAlt: { ar: "عيادة بيرلي سمايل الحديثة", en: "Modern Pearly Smile Clinic" },
  missionTitle: { ar: "رؤيتنا", en: "Our Vision" },
  missionText: {
    ar: "أن نكون المركز الرائد في طب الأسنان في منطقة أبوظبي من خلال تقديم رعاية استثنائية وتقنيات مبتكرة تحسن جودة حياة مرضانا.",
    en: "To be the leading dental center in the Abu Dhabi region by providing exceptional care and innovative technologies that improve our patients' quality of life."
  },
  valuesTitle: { ar: "قيمنا", en: "Our Values" },
  valuesText: {
    ar: "نؤمن بالشفافية، الجودة، والرعاية الشخصية. كل مريض هو فرد له احتياجات فريدة، ونحن نلتزم بتقديم حلول مخصصة لكل حالة.",
    en: "We believe in transparency, quality, and personalized care. Every patient is an individual with unique needs, and we are committed to providing customized solutions for each case."
  },
  commitmentTitle: { ar: "التزامنا", en: "Our Commitment" },
  commitmentText: {
    ar: "نلتزم باستخدام أحدث المعدات والتقنيات، وتدريب فريقنا باستمرار، والحفاظ على أعلى معايير النظافة والسلامة.",
    en: "We are committed to using the latest equipment and technologies, continuously training our team, and maintaining the highest standards of hygiene and safety."
  },
  aboutStatsTitle: { ar: "أرقامنا تتحدث عنا", en: "Our Numbers Speak for Themselves" },
  aboutStatsSubtitle: { ar: "إنجازاتنا خلال السنوات الماضية", en: "Our achievements over the past years" },
  statPatients: { ar: "مريض راضٍ", en: "Satisfied Patients" },
  statDoctors: { ar: "طبيب متخصص", en: "Specialized Doctors" },
  statStaff: { ar: "موظف داعم", en: "Support Staff" },
  statSatisfaction: { ar: "% رضا المرضى", en: "Patient Satisfaction" },
  facilitiesTitle: { ar: "مرافقنا الحديثة", en: "Our Modern Facilities" },
  facility1Title: { ar: "غرف علاج متطورة", en: "Advanced Treatment Rooms" },
  facility1Text: {
    ar: "12 غرفة علاج مجهزة بأحدث تقنيات طب الأسنان، مع أنظمة تعقيم متقدمة لضمان سلامة المرضى.",
    en: "12 treatment rooms equipped with the latest dental technologies, with advanced sterilization systems to ensure patient safety."
  },
  facility2Title: { ar: "تصوير رقمي متكامل", en: "Integrated Digital Imaging" },
  facility2Text: {
    ar: "وحدة تصوير أشعة سينية رقمية كاملة (CBCT، بانوراما، وأشعة داخلية) لتشخيص دقيق.",
    en: "Complete digital X-ray imaging unit (CBCT, panoramic, and intraoral) for accurate diagnosis."
  },
  facility3Title: { ar: "منطقة استقبال مريحة", en: "Comfortable Reception Area" },
  facility3Text: {
    ar: "منطقة انتظار فسيحة مع وسائل ترفيهية وخدمة واي فاي مجانية لتجربة مريحة للمرضى.",
    en: "Spacious waiting area with entertainment facilities and free Wi-Fi for a comfortable patient experience."
  },
  facility4Title: { ar: "مواقف مجانية", en: "Free Parking" },
  facility4Text: {
    ar: "مواقف سيارات مجانية ومخصصة للمرضى لتسهيل الوصول إلى العيادة.",
    en: "Free and dedicated parking spaces for patients to facilitate access to the clinic."
  },
  communityTitle: { ar: "فخورون بخدمة مجتمع أبوظبي", en: "Proudly Serving the Abu Dhabi Community" },
  communityText: {
    ar: "Pearly Smile Dental Center تفتخر بخدمة مجتمع أبوظبي منذ تأسيسها. نحن نشارك بانتظام في فعاليات الصحة المجتمعية، ونقدم فحوصات مجانية، وندوات توعوية حول صحة الفم والأسنان. نؤمن بأن الصحة الجيدة تبدأ بفم صحي، ونسعى لنشر هذه الثقافة في مجتمعنا.",
    en: "Pearly Smile Dental Center is proud to serve the Abu Dhabi community since its establishment. We regularly participate in community health events, provide free check-ups, and conduct awareness seminars about oral and dental health. We believe that good health starts with a healthy mouth, and we strive to spread this culture in our community."
  },
  communityCardTitle: { ar: "المجتمع", en: "Community" },
  communityCardText: {
    ar: "نفتخر بخدمة مجتمع أبوظبي منذ 2018، ونشارك بانتظام في فعاليات الصحة المجتمعية والتوعوية.",
    en: "We proudly serve the Abu Dhabi community since 2018, regularly participating in community health events and awareness programs."
  },
  // New About Cards Translations
  whoWeAreTitle: { ar: "من نحن", en: "Who We Are" },
  whoWeAreText: {
    ar: "فريق من أطباء الأسنان المتخصصين والممرضين المدربين، ملتزمون بتقديم رعاية أسنان شاملة ومريحة لكل مريض.",
    en: "A team of specialized dentists and trained nurses, committed to providing comprehensive and comfortable dental care for every patient."
  },
  safetyTitle: { ar: "السلامة", en: "Safety" },
  safetyText: {
    ar: "نلتزم بأعلى معايير النظافة والتعقيم، مع أنظمة متقدمة لضمان سلامة المرضى في كل زيارة.",
    en: "We adhere to the highest standards of hygiene and sterilization, with advanced systems to ensure patient safety in every visit."
  },
  technologyTitle: { ar: "التقنية", en: "Technology" },
  technologyText: {
    ar: "نستخدم أحدث تقنيات طب الأسنان الرقمية للتشخيص الدقيق والعلاج الفعال مع نتائج طويلة المدى.",
    en: "We use the latest digital dental technologies for accurate diagnosis and effective treatment with long-term results."
  },
  readMore: { ar: "اقرأ المزيد", en: "Read More" },
  highlight1: { ar: "✓ فحوصات مجانية للمدارس", en: "✓ Free school check-ups" },
  highlight2: { ar: "✓ مشاركة في معارض الصحة", en: "✓ Participation in health exhibitions" },
  highlight3: { ar: "✓ برامج توعوية للمجتمع", en: "✓ Community awareness programs" },
  aboutCtaTitle: { ar: "جاهزون لرعاية ابتسامتك؟", en: "Ready to Care for Your Smile?" },
  aboutCtaText: {
    ar: "انضم إلى آلاف المرضى الراضين عن خدماتنا. احجز موعدك اليوم واستمتع برعاية أسنان استثنائية.",
    en: "Join thousands of satisfied patients with our services. Book your appointment today and enjoy exceptional dental care."
  },
  bookNow: { ar: "احجز موعدك", en: "Book Your Appointment" },
  callUs: { ar: "اتصل بنا", en: "Call Us" },
  // Home Page About Preview Translations
  aboutPreviewEyebrow: { ar: "تعرف علينا", en: "Get to Know Us" },
  aboutPreviewTitle: {
    ar: "Pearly Smile Dental Center — رعاية أسنان مميزة في أبوظبي",
    en: "Pearly Smile Dental Center — premium dental care in Abu Dhabi",
  },
  aboutPreviewText: {
    ar: "رعاية أسنان متقدمة بتجربة مريحة وخطة علاج واضحة — من الفحص وحتى التجميل والزرعات.",
    en: "Advanced dental care with a comfort-first experience and a clear treatment plan—from check-ups to cosmetic dentistry and implants.",
  },
  coreValues: { ar: "قيمنا الأساسية: رعاية • دقة • ثقة", en: "Core Values: Care • Precision • Trust" },
  aboutPreviewBadge1: { ar: "تشخيص رقمي", en: "Digital diagnostics" },
  aboutPreviewBadge2: { ar: "راحة وخصوصية", en: "Comfort & privacy" },
  aboutPreviewBadge3: { ar: "نتائج طبيعية", en: "Natural results" },
  aboutPreviewViewStats: { ar: "شوف أرقامنا", en: "View our stats" },
  aboutPreviewPanel1Title: { ar: "عناية شاملة في مكان واحد", en: "Comprehensive care in one place" },
  aboutPreviewPanel1Text: {
    ar: "فحوصات، تنظيف، تجميل، تقويم، زرعات، وجراحة — بخطة علاج مدروسة تناسب احتياجك.",
    en: "Check-ups, cleanings, cosmetic dentistry, orthodontics, implants, and surgery—guided by a thoughtful plan tailored to you.",
  },
  aboutPreviewPanel2Title: { ar: "معايير عالية للسلامة", en: "High safety standards" },
  aboutPreviewPanel2Text: {
    ar: "تعقيم دقيق وإجراءات واضحة لضمان تجربة آمنة ومطمئنة في كل زيارة.",
    en: "Strict sterilization and clear protocols to ensure a safe, reassuring visit every time.",
  },
  aboutPreviewGlanceLabel: { ar: "لمحة سريعة", en: "At a glance" },
  aboutPreviewGlance1Title: { ar: "منذ 2018", en: "Since 2018" },
  aboutPreviewGlance1Text: { ar: "ثقة المجتمع وخبرة متراكمة", en: "Trusted locally with years of experience" },
  aboutPreviewGlance2Title: { ar: "لغتان", en: "Bilingual" },
  aboutPreviewGlance2Text: { ar: "خدمة عربية وإنجليزية", en: "Arabic & English care" },
  aboutPreviewGlance3Title: { ar: "تقنيات حديثة", en: "Modern tech" },
  aboutPreviewGlance3Text: { ar: "تشخيص وعلاج بدقة أعلى", en: "More precise diagnosis and treatment" },
  learnMore: { ar: "تعرف أكثر عنّا", en: "Learn More About Us" },
  previewImageAlt: { ar: "مركز بيرلي سمايل لطب الأسنان", en: "Pearly Smile Dental Center" },
};

if (typeof window !== "undefined") {
  window.TRANSLATIONS = TRANSLATIONS;
}

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
    if (typeof SiteData !== "undefined" && SiteData.refreshLanguage) {
      SiteData.refreshLanguage();
    }
    // update booking selects if present
    if (typeof BookingManager !== 'undefined' && BookingManager.updateForLanguage) {
      BookingManager.updateForLanguage(lang);
    }
    // update blog UI if present
    if (typeof window !== "undefined" && window.Blog && typeof window.Blog.refreshLanguage === "function") {
      window.Blog.refreshLanguage(lang);
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
      if (item.dataset.cmsBound) return;
      if (item.closest("[data-cms-bound]")) return;
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
    this._bookingStartedTracked = false;
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

    const cmsDocs = typeof window !== "undefined" && window.__SITE_DATA__ && window.__SITE_DATA__.doctors;
    const maxDocs = cmsDocs && cmsDocs.length ? cmsDocs.length : 9;
    for (let i = 1; i <= maxDocs; i++) {
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
      '10:30',
      '11:30',
      '12:00',
      '12:30',
      '13:00',
      '13:30',
      '14:00',
      '14:30',
      '15:00',
      '15:30',
      '16:00',
      '16:30',
      '17:00',
      '17:30',
      '18:00',
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
      // Booking form open / first interaction
      this.form.addEventListener(
        'focusin',
        () => {
          if (this._bookingStartedTracked) return;
          this._bookingStartedTracked = true;
          if (typeof Analytics !== "undefined" && Analytics.trackEvent) {
            Analytics.trackEvent("booking_started");
          }
        },
        { passive: true }
      );

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

    if (typeof Analytics !== "undefined" && Analytics.trackEvent) {
      Analytics.trackEvent("booking_completed", {
        doctor: doctorName || undefined,
        service: "consultation",
      });
    }
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
    // Animate home page counters
    const counters = document.querySelectorAll(".counter");
    counters.forEach((counter) => {
      this.animateCounter(counter);
    });
    
    // Animate about page stat numbers
    const statNumbers = document.querySelectorAll(".stat-number[data-count]");
    statNumbers.forEach((stat) => {
      this.animateStat(stat);
    });
    
    // Animate preview stat numbers
    const previewStats = document.querySelectorAll(".preview-stat-number[data-count]");
    previewStats.forEach((stat) => {
      this.animateStat(stat);
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

  static animateStat(stat) {
    const target = +stat.dataset.count;
    const duration = CONFIG.animation.counterDuration;
    let startTime = null;

    const updateStat = (time) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const currentNumber = Math.floor(progress * target);
      stat.textContent = currentNumber.toLocaleString("en-US");

      if (progress < 1) {
        requestAnimationFrame(updateStat);
      } else {
        stat.textContent = target.toLocaleString("en-US");
      }
    };

    requestAnimationFrame(updateStat);
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

  /** After CMS replaces `#cms-team-doctors`, new `.reveal` nodes stay opacity:0 until `.visible` is set (init() already ran). */
  static refresh() {
    document.querySelectorAll("#cms-team-doctors .reveal").forEach((el) => {
      el.classList.add("visible");
    });
  }
}

if (typeof window !== "undefined") {
  window.RevealObserver = RevealObserver;
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
    const answer = item.querySelector(".faq-answer");
    if (!btn) return;

    // Initialize ARIA + collapsed state
    btn.setAttribute("aria-expanded", item.classList.contains("active") ? "true" : "false");
    if (answer && !item.classList.contains("active")) {
      answer.style.maxHeight = "0px";
    }

    btn.addEventListener("click", () => FAQAccordion.toggleItem(item));
  }

  static toggleItem(item) {
    const btn = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer");
    const isOpen = item.classList.toggle("active");

    if (btn) btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (!answer) return;

    // Smooth height animation (no heavy JS)
    if (isOpen) {
      answer.style.maxHeight = answer.scrollHeight + "px";
    } else {
      answer.style.maxHeight = "0px";
    }
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
    this.initializeMobileNavbar();
    this.initializeServicesCards();
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

  initializeMobileNavbar() {
    const header = document.querySelector("header.mobile-nav");
    if (!header) return;

    const toggleBtn = header.querySelector("#mobileMenuToggle");
    const nav = header.querySelector("#mobileNav");
    const closeBtn = header.querySelector("#mobileMenuClose");
    const backdropBtn = header.querySelector("#mobileMenuBackdrop");
    const panel = nav?.querySelector(".mobile-menu-panel");

    if (!toggleBtn || !nav) return;

    const mql = window.matchMedia("(max-width: 768px)");
    const isMobile = () => mql.matches;

    const setOpen = (open) => {
      document.documentElement.classList.toggle("mobile-nav-open", open);
      toggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
      toggleBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (!open) return;
      const firstLink = nav.querySelector("a");
      if (firstLink) firstLink.focus({ preventScroll: true });
    };

    const toggle = () => {
      if (!isMobile()) return;
      const open = document.documentElement.classList.contains("mobile-nav-open");
      setOpen(!open);
    };

    const close = () => setOpen(false);

    toggleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      toggle();
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        close();
      });
    }

    // Backdrop button closes (reliable tap-outside close).
    if (backdropBtn) {
      backdropBtn.addEventListener("click", (e) => {
        e.preventDefault();
        close();
      });
    }

    // Close after selecting a link (better mobile UX).
    nav.addEventListener("click", (e) => {
      if (!isMobile()) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest("a")) close();
    });

    // Close on ESC
    document.addEventListener("keydown", (e) => {
      if (!isMobile()) return;
      if (e.key === "Escape") close();
    });

    // Reset only when leaving the mobile breakpoint (avoid mobile address-bar resize issues)
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", (e) => {
        if (!e.matches) close();
      });
    } else if (typeof mql.addListener === "function") {
      // Safari <14
      mql.addListener((e) => {
        if (!e.matches) close();
      });
    }
  }

  initializeServicesCards() {
    if ((appState.pageType || "home") !== "services") return;

    const grid = document.querySelector(".services-grid--cards");
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll(".service-card.flip-card"));
    if (cards.length === 0) return;

    const isTouch = () =>
      window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
      window.matchMedia("(max-width: 768px)").matches;

    const setExpanded = (card, expanded) => {
      card.classList.toggle("is-expanded", expanded);
      card.setAttribute("aria-expanded", expanded ? "true" : "false");
    };

    const collapseAllExcept = (keep) => {
      cards.forEach((c) => {
        if (c === keep) return;
        setExpanded(c, false);
      });
    };

    const toggleCard = (card) => {
      if (!isTouch()) return;
      const expanded = card.classList.contains("is-expanded");
      collapseAllExcept(card);
      setExpanded(card, !expanded);
    };

    cards.forEach((card) => {
      card.addEventListener("click", (e) => {
        const target = e.target;
        if (!(target instanceof Element)) return;
        // Don't hijack navigation clicks.
        if (target.closest("a, button")) return;
        toggleCard(card);
      });

      card.addEventListener("keydown", (e) => {
        if (!isTouch()) return;
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        toggleCard(card);
      });
    });

    // Close expanded cards when tapping outside the grid (mobile ergonomics).
    document.addEventListener("click", (e) => {
      if (!isTouch()) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".services-grid--cards")) return;
      collapseAllExcept(null);
    });
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
  const start = () => {
    const app = new App();
    app.init();
  };
  if (typeof SiteData !== "undefined" && SiteData.load) {
    SiteData.load().finally(start);
  } else {
    start();
  }
};

// Global UX fix: clear accidental text selection on non-input clicks.
// Keeps forms and article reading selectable.
(function () {
  function isEditableTarget(t) {
    if (!(t instanceof Element)) return false;
    return Boolean(
      t.closest(
        'input, textarea, select, option, [contenteditable="true"], #articleContent, .service-detail-content'
      )
    );
  }
  document.addEventListener(
    "mousedown",
    (e) => {
      const t = e.target;
      if (isEditableTarget(t)) return;
      const sel = window.getSelection && window.getSelection();
      if (sel && typeof sel.removeAllRanges === "function" && sel.type === "Range") {
        sel.removeAllRanges();
      }
    },
    { passive: true }
  );
})();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

// Start tracking as soon as DOM is ready (doesn't block app init).
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => Analytics.init());
} else {
  Analytics.init();
}

// ============================================================================
// AI + SEO DISCOVERY (JSON-LD + keywords)
// ============================================================================

const Discovery = (function () {
  const apiBase = (function () {
    try {
      return location.protocol === "file:" ? "http://127.0.0.1:8000" : location.origin;
    } catch (e) {
      return "http://127.0.0.1:8000";
    }
  })();

  const cacheKey = "ps_ai_index_cache_v1";
  const cacheTtlMs = 10 * 60 * 1000; // 10 min

  function now() {
    return Date.now ? Date.now() : +new Date();
  }

  function currentLang() {
    return localStorage.getItem("ps-lang") || document.documentElement.lang || "ar";
  }

  function pickLang(val, lang) {
    if (val == null) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object") return val[lang] || val.ar || val.en || "";
    return String(val);
  }

  function absUrl(path) {
    if (!path) return "";
    if (String(path).startsWith("http")) return String(path);
    const base = location.protocol === "file:" ? apiBase : location.origin;
    const p = String(path).startsWith("/") ? String(path) : "/" + String(path);
    return base + p;
  }

  async function fetchAiIndex() {
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached && cached.t && cached.v && now() - cached.t < cacheTtlMs) {
          return cached.v;
        }
      }
    } catch (e) {}

    const r = await fetch(apiBase + "/api/ai-index", { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error("ai-index fetch failed");
    const v = await r.json();
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({ t: now(), v }));
    } catch (e) {}
    return v;
  }

  function ensureMeta(name) {
    let el = document.querySelector('meta[name="' + name + '"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", name);
      document.head.appendChild(el);
    }
    return el;
  }

  function setKeywords(keys) {
    if (!Array.isArray(keys) || keys.length === 0) return;
    // Keep it compact; meta keywords isn't a ranking factor, but helps AI/extractors.
    const compact = keys
      .map((k) => String(k || "").trim())
      .filter(Boolean)
      .slice(0, 40)
      .join(", ");
    if (!compact) return;
    ensureMeta("keywords").setAttribute("content", compact);
  }

  function upsertJsonLd(id, payload) {
    if (!payload) return;
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.id = id;
      document.head.appendChild(el);
    }
    try {
      el.textContent = JSON.stringify(payload);
    } catch (e) {
      // No-op
    }
  }

  function buildGraph(ai) {
    const lang = currentLang();
    const origin = location.protocol === "file:" ? apiBase : location.origin;
    const pageUrl = origin + (location.pathname || "/");
    const page = document.documentElement && document.documentElement.dataset ? document.documentElement.dataset.page : "";

    const clinic = ai && ai.clinic ? ai.clinic : {};
    const clinicUrl = clinic.url ? String(clinic.url) : origin + "/";

    const graph = [];

    graph.push({
      "@type": "MedicalClinic",
      "@id": clinicUrl + "#clinic",
      name: clinic.name || "Pearly Smile Dental Center",
      description: clinic.description || "",
      url: clinicUrl,
      image: clinic.image ? absUrl(clinic.image) : undefined,
      telephone: clinic.telephone || undefined,
      address: clinic.location
        ? {
            "@type": "PostalAddress",
            addressCountry: (clinic.location.country || "").toString(),
            addressLocality: (clinic.location.city || "").toString(),
          }
        : undefined,
      keywords: Array.isArray(ai.keywords) ? ai.keywords.slice(0, 30).join(", ") : undefined,
    });

    // Page node (ties the page to the clinic)
    graph.push({
      "@type": "WebPage",
      "@id": pageUrl + "#webpage",
      url: pageUrl,
      name: document.title || "",
      isPartOf: { "@id": clinicUrl + "#clinic" },
    });

    // Dataset pointing to the AI index (helps non-JS parsers discover everything)
    graph.push({
      "@type": "Dataset",
      "@id": clinicUrl + "#ai-index",
      name: "Pearly Smile AI index",
      description: "Machine-readable clinic content: services, doctors, offers, and blog posts.",
      url: absUrl("/api/ai-index"),
      keywords: Array.isArray(ai.keywords) ? ai.keywords.slice(0, 50) : undefined,
    });

    if (page === "services" && Array.isArray(ai.services)) {
      graph.push({
        "@type": "ItemList",
        name: "Dental services",
        itemListElement: ai.services.slice(0, 50).map((s, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          url: s.url || undefined,
          item: {
            "@type": "MedicalService",
            name: pickLang(s.name, lang),
            description: pickLang(s.description, lang),
            url: s.url || undefined,
            image: s.image ? absUrl(s.image) : undefined,
            keywords: Array.isArray(s.keywords) ? s.keywords.join(", ") : undefined,
          },
        })),
      });
    }

    if ((page === "team" || page === "about" || page === "home") && Array.isArray(ai.doctors)) {
      graph.push({
        "@type": "ItemList",
        name: "Clinic doctors",
        itemListElement: ai.doctors.slice(0, 50).map((d, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          url: d.url || undefined,
          item: {
            "@type": "Physician",
            name: pickLang(d.name, lang),
            description: pickLang(d.description, lang),
            url: d.url || undefined,
            image: d.image ? absUrl(d.image) : undefined,
            keywords: Array.isArray(d.keywords) ? d.keywords.join(", ") : undefined,
          },
        })),
      });
    }

    if (page === "offers" && Array.isArray(ai.offers)) {
      graph.push({
        "@type": "ItemList",
        name: "Clinic offers",
        itemListElement: ai.offers.slice(0, 50).map((o, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          url: o.url || undefined,
          item: {
            "@type": "Offer",
            name: pickLang(o.name, lang),
            description: pickLang(o.description, lang),
            url: o.url || undefined,
            image: o.image ? absUrl(o.image) : undefined,
            keywords: Array.isArray(o.keywords) ? o.keywords.join(", ") : undefined,
          },
        })),
      });
    }

    if (page === "blog" && Array.isArray(ai.blogs)) {
      graph.push({
        "@type": "Blog",
        name: "Pearly Smile Blog",
        url: absUrl("/blog"),
        blogPost: ai.blogs.slice(0, 50).map((b) => ({
          "@type": "BlogPosting",
          headline: pickLang(b.name, lang),
          description: pickLang(b.description, lang),
          url: b.url || undefined,
          image: b.image ? absUrl(b.image) : undefined,
          keywords: Array.isArray(b.keywords) ? b.keywords.join(", ") : undefined,
        })),
      });
    }

    // Service detail pages (data-page is like service_implants, etc.)
    if (page && String(page).startsWith("service_") && Array.isArray(ai.services)) {
      const hit = ai.services.find((s) => s && s.url && s.url.indexOf(location.pathname.replace(/^\//, "")) !== -1);
      if (hit) {
        graph.push({
          "@type": "MedicalService",
          name: pickLang(hit.name, lang),
          description: pickLang(hit.description, lang),
          url: hit.url || undefined,
          image: hit.image ? absUrl(hit.image) : undefined,
          keywords: Array.isArray(hit.keywords) ? hit.keywords.join(", ") : undefined,
          provider: { "@id": clinicUrl + "#clinic" },
        });
      }
    }

    return { "@context": "https://schema.org", "@graph": graph.filter(Boolean) };
  }

  async function init() {
    try {
      const ai = await fetchAiIndex();
      if (ai && Array.isArray(ai.keywords)) setKeywords(ai.keywords);
      upsertJsonLd("ps-jsonld-ai", buildGraph(ai || {}));
    } catch (e) {
      // Must never break UX
    }
  }

  return { init };
})();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => Discovery.init());
} else {
  Discovery.init();
}
