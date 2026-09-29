/**
 * MSRTC passes, concession schemes (योजना) and official notices.
 *
 * Every entry is taken from the MSRTC website or a dated news report of an
 * MSRTC / Government of Maharashtra decision, and carries its source link and
 * the date it was checked. Nothing here is inferred — when a detail (e.g. which
 * bus types) was not in the source, the text says to confirm at the depot.
 * Last reviewed: 2026-09-28.
 */

/** Colour-coded tone shared by schemes, alerts, the bell badge and filters. */
export type Tone = 'urgent' | 'action' | 'offer' | 'info' | 'personal' | 'festival';

export const TONES: Record<Tone, { color: string; soft: string; mr: string; en: string; icon: string }> = {
  urgent:   { color: '#e11d48', soft: '#ffe4e6', mr: 'तातडीचे',   en: 'Urgent',   icon: '⚠️' },
  action:   { color: '#ea580c', soft: '#ffedd5', mr: 'करायचे',    en: 'To do',    icon: '📝' },
  offer:    { color: '#059669', soft: '#d1fae5', mr: 'सवलत / ऑफर', en: 'Offer',    icon: '🎁' },
  info:     { color: '#0284c7', soft: '#e0f2fe', mr: 'माहिती',     en: 'Info',     icon: 'ℹ️' },
  personal: { color: '#7c3aed', soft: '#ede9fe', mr: 'तुमच्यासाठी', en: 'For you',  icon: '👤' },
  festival: { color: '#ca8a04', soft: '#fef9c3', mr: 'सण / गर्दी',  en: 'Festival', icon: '🎉' },
};
/** Higher = shown first and used for the bell badge colour. */
export const TONE_RANK: Record<Tone, number> = { urgent: 6, personal: 5, action: 4, festival: 3, offer: 2, info: 1 };

/** Who the traveller is — used to show only the schemes and alerts that apply. */
export type Category = 'woman' | 'senior65' | 'senior75' | 'student' | 'girlStudent' | 'commuter' | 'tourist';

export const CATEGORIES: { id: Category; mr: string; en: string; icon: string }[] = [
  { id: 'woman', mr: 'महिला', en: 'Woman', icon: '👩' },
  { id: 'senior65', mr: 'ज्येष्ठ नागरिक (६५–७५)', en: 'Senior citizen (65–75)', icon: '🧓' },
  { id: 'senior75', mr: 'अमृत ज्येष्ठ (७५+)', en: 'Senior 75+', icon: '👴' },
  { id: 'student', mr: 'विद्यार्थी', en: 'Student', icon: '🎓' },
  { id: 'girlStudent', mr: 'विद्यार्थिनी (५वी–१२वी)', en: 'Schoolgirl (class 5–12)', icon: '👧' },
  { id: 'commuter', mr: 'रोजचा प्रवासी', en: 'Daily commuter', icon: '🧑‍💼' },
  { id: 'tourist', mr: 'पर्यटक / फिरस्ती', en: 'Tourist', icon: '🧳' },
];

export interface Source { label: string; url: string; date: string }

export interface Scheme {
  id: string;
  tone: Tone;
  icon: string;
  titleMr: string;
  titleEn: string;
  /** Big number shown on the card, e.g. "५०%" or "मोफत". */
  benefitMr: string;
  benefitEn: string;
  whoMr: string;
  whoEn: string;
  pointsMr: string[];
  pointsEn: string[];
  for: Category[];
  sources: Source[];
}

export const SCHEMES: Scheme[] = [
  {
    id: 'ncmc-card',
    tone: 'urgent',
    icon: '💳',
    titleMr: 'एसटी NCMC स्मार्ट कार्ड',
    titleEn: 'ST NCMC smart card',
    benefitMr: '₹१९९',
    benefitEn: '₹199',
    whoMr: 'सवलतधारक सर्व प्रवासी — महिला, ज्येष्ठ नागरिक, विद्यार्थी, दिव्यांग',
    whoEn: 'All concession holders — women, seniors, students, persons with disabilities',
    pointsMr: [
      'आधारशी जोडलेले RuPay NCMC कार्ड; १ एप्रिल २०२६ पासून सुरू. कार्ड ₹१९९, किमान रिचार्ज ₹१००.',
      'महिला व ६५–७५ वयोगटातील ज्येष्ठांना सवलतीसाठी १ सप्टेंबर २०२६ पासून कार्ड आवश्यक; सर्व्हर अडचणींमुळे जुनी पद्धत ३० सप्टेंबर २०२६ पर्यंत चालू.',
      '७५+ अमृत ज्येष्ठ नागरिकांना अतिरिक्त मुदत दिली आहे.',
      'नोंदणी: जवळचे एसटी आगार / बस स्थानक किंवा अधिकृत केंद्र. कार्ड सक्रिय करून त्यात शिल्लक ठेवा.',
    ],
    pointsEn: [
      'Aadhaar-linked RuPay NCMC card, launched 1 April 2026. Card ₹199, minimum recharge ₹100.',
      'Women and seniors aged 65–75 need it for concessions from 1 Sep 2026; because of server problems the old method is allowed until 30 Sep 2026.',
      'Amrut senior citizens (75+) have been given extra time.',
      'Register at your nearest MSRTC depot / bus stand or an authorised centre, then activate and top it up.',
    ],
    for: ['woman', 'senior65', 'senior75', 'student', 'girlStudent'],
    sources: [
      { label: 'GKToday — NCMC launch', url: 'https://www.gktoday.in/msrtc-launches-ncmc-smart-card-for-digital-bus-travel/', date: '2026-04' },
      { label: 'Trak.in — mandatory from 1 Sep', url: 'https://trak.in/stories/ncmc-now-mandatory-for-women-senior-citizens-to-get-msrtc-concessions/', date: '2026-09-01' },
      { label: 'Free Press Journal — old system till 30 Sep', url: 'https://www.freepressjournal.in/mumbai/maharashtra-msrtc-extends-old-concession-ticket-system-for-senior-citizens-women-until-september-30-amid-ncmc-server-issues', date: '2026-09-15' },
    ],
  },
  {
    id: 'mahila-sanman',
    tone: 'offer',
    icon: '👩',
    titleMr: 'महिला सन्मान योजना',
    titleEn: 'Mahila Sanman Yojana',
    benefitMr: '५०% सवलत',
    benefitEn: '50% off',
    whoMr: 'सर्व महिला प्रवासी — महाराष्ट्र राज्यांतर्गत प्रवास',
    whoEn: 'All women passengers — journeys within Maharashtra',
    pointsMr: [
      '१७ मार्च २०२३ पासून सर्व प्रकारच्या एसटी बसमध्ये (शिवनेरीसह) तिकिटावर ५०% सवलत.',
      'सवलतीची रक्कम राज्य सरकार महामंडळाला देते.',
      'आता सवलतीसाठी NCMC स्मार्ट कार्ड आवश्यक (वर पाहा).',
    ],
    pointsEn: [
      'Since 17 March 2023: 50% off the fare on every MSRTC bus type, Shivneri included.',
      'The state government reimburses the concession to MSRTC.',
      'The NCMC smart card is now required to claim it (see above).',
    ],
    for: ['woman', 'girlStudent'],
    sources: [
      { label: 'Urban Transport News', url: 'https://urbantransportnews.com/news/maharashtra-introduces-50-concession-for-women-in-msrtc-buses', date: '2023-03' },
      { label: 'Zee 24 Taas — GR', url: 'https://zeenews.india.com/marathi/maharashtra/mahila-samman-yojana-effective-from-today-50-percent-discount-on-st-travel/698624', date: '2023-03-17' },
    ],
  },
  {
    id: 'amrut-jyeshtha',
    tone: 'offer',
    icon: '👴',
    titleMr: 'अमृत ज्येष्ठ नागरिक योजना',
    titleEn: 'Amrut Jyeshtha Nagrik Yojana',
    benefitMr: 'मोफत प्रवास',
    benefitEn: 'Free travel',
    whoMr: '७५ वर्षांवरील महाराष्ट्रातील नागरिक',
    whoEn: 'Maharashtra residents aged 75+',
    pointsMr: [
      'सर्व एसटी बसमध्ये १००% मोफत प्रवास.',
      'वय व महाराष्ट्र रहिवासाचा मूळ पुरावा सोबत ठेवा — वाहक तपासतात.',
      'NCMC कार्ड लवकरच आवश्यक होईल; ७५+ साठी अतिरिक्त मुदत.',
    ],
    pointsEn: [
      '100% free travel on MSRTC buses.',
      'Carry original proof of age and Maharashtra residence — conductors check.',
      'The NCMC card will become mandatory; 75+ have extra time.',
    ],
    for: ['senior75'],
    sources: [
      { label: 'Deccan Herald', url: 'https://www.deccanherald.com/india/maharashtra/msrtc-makes-mobility-cards-mandatory-for-women-senior-citizens-to-avail-concessions-from-august-1-4038189', date: '2026' },
      { label: 'lalparibus.in guide', url: 'https://lalparibus.in/msrtc-st-travel-guide/', date: '2026' },
    ],
  },
  {
    id: 'senior-65',
    tone: 'offer',
    icon: '🧓',
    titleMr: 'ज्येष्ठ नागरिक सवलत',
    titleEn: 'Senior citizen concession',
    benefitMr: '५०% सवलत',
    benefitEn: '50% off',
    whoMr: '६५ ते ७५ वयोगटातील महाराष्ट्रातील नागरिक',
    whoEn: 'Maharashtra residents aged 65–75',
    pointsMr: [
      'तिकिटावर ५०% सवलत. कोणत्या बस प्रकारांवर लागू ते आगारात खात्री करा.',
      'वयाचा व महाराष्ट्र रहिवासाचा फोटो-ओळखपत्र पुरावा आवश्यक.',
      'सवलतीसाठी NCMC स्मार्ट कार्ड आवश्यक.',
    ],
    pointsEn: [
      '50% off the fare. Confirm at the depot which bus types it covers.',
      'Photo ID proving age and Maharashtra residence is required.',
      'The NCMC smart card is required to claim it.',
    ],
    for: ['senior65'],
    sources: [
      { label: 'Deccan Herald', url: 'https://www.deccanherald.com/india/maharashtra/msrtc-makes-mobility-cards-mandatory-for-women-senior-citizens-to-avail-concessions-from-august-1-4038189', date: '2026' },
    ],
  },
  {
    id: 'student-pass',
    tone: 'offer',
    icon: '🎓',
    titleMr: 'विद्यार्थी मासिक पास',
    titleEn: 'Student monthly pass',
    benefitMr: '६६.६७% सवलत',
    benefitEn: '66.67% off',
    whoMr: 'घर ते शाळा/महाविद्यालय प्रवास करणारे विद्यार्थी',
    whoEn: 'Students travelling between home and school/college',
    pointsMr: [
      'मासिक पासच्या भाड्याच्या फक्त ३३.३३% रक्कम भरावी लागते.',
      '“एसटी पास थेट तुमच्या शाळेत” मोहिमेत पास शाळा/महाविद्यालयातच मिळतात.',
      'पास स्मार्ट कार्डवर दिला जातो.',
    ],
    pointsEn: [
      'Students pay only 33.33% of the monthly pass fare.',
      "Under 'ST Bus Pass Thet Tumchya Shalet' passes are issued at the school/college itself.",
      'The pass is issued on a smart card.',
    ],
    for: ['student', 'girlStudent'],
    sources: [
      { label: 'EducationWorld', url: 'https://educationworld.in/msrtc-to-deliver-subsidised-bus-passes-directly-to-schools/', date: '2025' },
      { label: 'Free Press Journal', url: 'https://www.freepressjournal.in/mumbai/maharashtra-news-msrtcs-bus-pass-direct-to-school-campaign-benefits-over-52-lakh-students-in-just-15-days', date: '2025' },
    ],
  },
  {
    id: 'ahilyabai-holkar',
    tone: 'offer',
    icon: '👧',
    titleMr: 'पुण्यश्लोक अहिल्याबाई होळकर योजना',
    titleEn: 'Punyashlok Ahilyabai Holkar Yojana',
    benefitMr: 'मोफत पास',
    benefitEn: 'Free pass',
    whoMr: 'इयत्ता ५वी ते १२वी विद्यार्थिनी',
    whoEn: 'Girl students, class 5 to 12',
    pointsMr: ['शाळेत जाण्या-येण्यासाठी संपूर्ण मोफत एसटी पास.', 'शाळेमार्फत अर्ज करा.'],
    pointsEn: ['Completely free ST pass for travel to and from school.', 'Apply through the school.'],
    for: ['girlStudent'],
    sources: [
      { label: 'Free Press Journal', url: 'https://www.freepressjournal.in/mumbai/maharashtra-news-msrtcs-bus-pass-direct-to-school-campaign-benefits-over-52-lakh-students-in-just-15-days', date: '2025' },
    ],
  },
  {
    id: 'avadel-tithe-pravas',
    tone: 'offer',
    icon: '🧳',
    titleMr: 'आवडेल तेथे कोठेही प्रवास पास',
    titleEn: 'Travel-as-you-like pass (4 / 7 days)',
    benefitMr: '४ व ७ दिवस',
    benefitEn: '4 & 7 days',
    whoMr: 'कोणताही प्रवासी — अमर्याद प्रवास (राज्यात व आंतरराज्य एसटी मार्गांवर)',
    whoEn: 'Anyone — unlimited travel on MSRTC routes incl. interstate',
    pointsMr: [
      '१ फेब्रुवारी २०२५ चे दर (प्रौढ / मूल ५–१२ वर्षे): साधी बस — ४ दिवस ₹१,८१४ / ₹९१०, ७ दिवस ₹३,१७१ / ₹१,५८८.',
      'शिवशाही — ४ दिवस ₹२,५३३ / ₹१,२६९, ७ दिवस ₹४,४२९ / ₹२,२१७. १२ मी. ई-बस — ४ दिवस ₹२,८६१ / ₹१,४३३, ७ दिवस ₹५,००३ / ₹२,५०४.',
      'डिसेंबर २०२५ च्या बातमीनुसार ४ दिवसांचा साधा पास ₹१,३६४ (मूल ₹६८५) इतका कमी केला — खरेदीपूर्वी आगारात दर खात्री करा.',
      '१० दिवस आधी खरेदी करता येतो; पास हस्तांतरणीय नाही; आसनाची हमी नाही (आरक्षण शुल्क भरून); हरवल्यास परतावा नाही.',
    ],
    pointsEn: [
      'Fares from 1 Feb 2025 (adult / child 5–12): Ordinary — 4 days ₹1,814 / ₹910, 7 days ₹3,171 / ₹1,588.',
      'Shivshahi — 4 days ₹2,533 / ₹1,269, 7 days ₹4,429 / ₹2,217. 12 m e-bus — 4 days ₹2,861 / ₹1,433, 7 days ₹5,003 / ₹2,504.',
      'A December 2025 report says the 4-day ordinary pass was cut to ₹1,364 (child ₹685) — confirm the fare at the depot before buying.',
      'Buy up to 10 days ahead; not transferable; no seat guarantee (reservation extra); no refund if lost.',
    ],
    for: ['tourist'],
    sources: [
      { label: 'MSRTC — ४ आणि ७ दिवसांकरिता पास', url: 'https://msrtc.maharashtra.gov.in/GeneralPages/4-7DaysPasses.aspx', date: 'official' },
      { label: 'Pudhari — revised fares 1 Feb 2025', url: 'https://pudhari.news/maharashtra/mumbai/st-mahamandal-aavdel-tithe-kothehi-pravas-yojana-costlier', date: '2025-01-30' },
      { label: 'Navarashtra — 4-day pass ₹1,364', url: 'https://www.navarashtra.com/maharashtra/msrtc-launched-a-travel-plan-wherever-you-like-4-days-pass-in-only-1364-tourism-all-maharashtra-1075742.html', date: '2025-12-08' },
    ],
  },
  {
    id: 'ebus-pass',
    tone: 'offer',
    icon: '⚡',
    titleMr: 'ई-बस मासिक / त्रैमासिक पास',
    titleEn: 'E-bus monthly / quarterly pass',
    benefitMr: '३० दिवस = २० फेऱ्या',
    benefitEn: '30 days for 20 round trips',
    whoMr: 'ठराविक मार्गावर रोज प्रवास करणारे',
    whoEn: 'Daily commuters on a fixed route',
    pointsMr: [
      'मासिक पास: ३० दिवस प्रवास, भाडे फक्त २० परतीच्या फेऱ्यांचे.',
      'त्रैमासिक पास: ९० दिवस प्रवास, भाडे ६० परतीच्या फेऱ्यांचे.',
      '९ मी. व १२ मी. ई-बस आणि ई-शिवाईवर लागू; ई-शिवनेरीवर नाही.',
    ],
    pointsEn: [
      'Monthly: 30 days of travel for the price of 20 round trips.',
      'Quarterly: 90 days for the price of 60 round trips.',
      'Valid on 9 m and 12 m e-buses and E-Shivai; not on E-Shivneri.',
    ],
    for: ['commuter'],
    sources: [
      { label: 'Free Press Journal', url: 'https://www.freepressjournal.in/mumbai/msrtc-launches-travel-pass-scheme-for-electric-bus-commuters-in-maharashtra', date: '2025-10-09' },
    ],
  },
];

export interface OfficialAlert {
  id: string;
  tone: Tone;
  /** Shown from this date (inclusive) … */
  from: string;
  /** … until this date (inclusive). */
  to: string;
  /** Empty = everyone; otherwise only travellers in these categories (or who set no profile). */
  for: Category[];
  titleMr: string;
  titleEn: string;
  bodyMr: string;
  bodyEn: string;
  schemeId?: string;
  source: Source;
}

export const OFFICIAL_ALERTS: OfficialAlert[] = [
  {
    id: 'ncmc-deadline-sep30',
    tone: 'urgent',
    from: '2026-09-15',
    to: '2026-09-30',
    for: ['woman', 'senior65'],
    titleMr: 'सवलतीसाठी जुनी पद्धत फक्त ३० सप्टेंबरपर्यंत',
    titleEn: 'Old concession method only until 30 September',
    bodyMr: 'महिला व ६५–७५ वयोगटातील ज्येष्ठांनी NCMC स्मार्ट कार्ड लगेच काढा व सक्रिय करा — त्यानंतर सवलतीसाठी कार्ड आवश्यक.',
    bodyEn: 'Women and seniors aged 65–75: get and activate the NCMC smart card now — after this the card is needed for the concession.',
    schemeId: 'ncmc-card',
    source: { label: 'Free Press Journal', url: 'https://www.freepressjournal.in/mumbai/maharashtra-msrtc-extends-old-concession-ticket-system-for-senior-citizens-women-until-september-30-amid-ncmc-server-issues', date: '2026-09-15' },
  },
  {
    id: 'ncmc-now-required',
    tone: 'urgent',
    from: '2026-10-01',
    to: '2026-11-30',
    for: ['woman', 'senior65'],
    titleMr: 'एसटी सवलतीसाठी NCMC कार्ड आता आवश्यक',
    titleEn: 'NCMC card now required for ST concessions',
    bodyMr: 'मुदतवाढ ३० सप्टेंबरला संपली. कार्ड नसेल तर जवळच्या आगारात नोंदणी करा. (नवीन मुदतवाढ जाहीर झाल्यास येथे कळवू.)',
    bodyEn: 'The extension ended on 30 September. No card yet? Register at your nearest depot. (We will update this if a new extension is announced.)',
    schemeId: 'ncmc-card',
    source: { label: 'Trak.in', url: 'https://trak.in/stories/ncmc-now-mandatory-for-women-senior-citizens-to-get-msrtc-concessions/', date: '2026-09-01' },
  },
  {
    id: 'ncmc-75-extra-time',
    tone: 'info',
    from: '2026-09-01',
    to: '2026-12-31',
    for: ['senior75'],
    titleMr: '७५+ अमृत ज्येष्ठांना NCMC साठी अतिरिक्त मुदत',
    titleEn: 'Extra time for 75+ seniors to get the NCMC card',
    bodyMr: 'बोटांच्या ठशाच्या अडचणींमुळे मुदत वाढवली आहे. तरीही लवकर नोंदणी करून ठेवा.',
    bodyEn: 'Extended because of fingerprint-authentication problems. Registering early is still a good idea.',
    schemeId: 'ncmc-card',
    source: { label: 'Free Press Journal', url: 'https://www.freepressjournal.in/mumbai/maharashtra-msrtc-extends-old-concession-ticket-system-for-senior-citizens-women-until-september-30-amid-ncmc-server-issues', date: '2026-09-15' },
  },
  {
    id: 'ebus-pass-offer',
    tone: 'offer',
    from: '2026-01-01',
    to: '2026-12-31',
    for: ['commuter'],
    titleMr: 'रोजच्या प्रवासासाठी ई-बस पास',
    titleEn: 'E-bus pass for daily trips',
    bodyMr: '३० दिवसांचा प्रवास फक्त २० परतीच्या फेऱ्यांच्या भाड्यात — ई-बस व ई-शिवाईवर.',
    bodyEn: '30 days of travel for the price of 20 round trips — on e-buses and E-Shivai.',
    schemeId: 'ebus-pass',
    source: { label: 'Free Press Journal', url: 'https://www.freepressjournal.in/mumbai/msrtc-launches-travel-pass-scheme-for-electric-bus-commuters-in-maharashtra', date: '2025-10-09' },
  },
  {
    id: 'diwali-pass-idea',
    tone: 'offer',
    from: '2026-10-15',
    to: '2026-11-10',
    for: ['tourist'],
    titleMr: 'दिवाळी सुट्टीत फिरायचंय? ४ / ७ दिवसांचा पास',
    titleEn: 'Diwali holiday trip? 4 / 7-day pass',
    bodyMr: '“आवडेल तेथे कोठेही प्रवास” पास १० दिवस आधी घेता येतो. दर पाहा.',
    bodyEn: "The 'travel as you like' pass can be bought 10 days ahead. See fares.",
    schemeId: 'avadel-tithe-pravas',
    source: { label: 'MSRTC', url: 'https://msrtc.maharashtra.gov.in/GeneralPages/4-7DaysPasses.aspx', date: 'official' },
  },
];

/** Festival rush windows (crowding / extra buses announced by MSRTC). */
export const FESTIVALS = [
  { id: 'ganeshotsav-2026', nameMr: 'गणेशोत्सव', nameEn: 'Ganeshotsav', start: '2026-08-26', end: '2026-09-06', noteMr: 'कोकण व पुणे मार्गावर जादा गाड्या — अधिकृत प्रसिद्धीनंतरच दाखवल्या जातील.', noteEn: 'Extra buses on Konkan and Pune routes — shown only once officially announced.' },
  { id: 'dussehra-2026', nameMr: 'दसरा', nameEn: 'Dussehra', start: '2026-10-19', end: '2026-10-21', noteMr: 'दसरा प्रवास — आगाऊ आरक्षण करा.', noteEn: 'Dussehra travel — book ahead.' },
  { id: 'diwali-2026', nameMr: 'दिवाळी', nameEn: 'Diwali', start: '2026-11-04', end: '2026-11-13', noteMr: 'दिवाळी (लक्ष्मीपूजन ८ नोव्हें., भाऊबीज ११ नोव्हें.) काळात गर्दी — वेळापत्रक बदलू शकते, स्थानकावर खात्री करा.', noteEn: 'Diwali (Lakshmi Puja 8 Nov, Bhau Beej 11 Nov) rush — timings may change, confirm at the bus stand.' },
];

export const OFFICIAL_LINKS = [
  { mr: 'एसटी अधिकृत संकेतस्थळ', en: 'MSRTC official website', url: 'https://msrtc.maharashtra.gov.in/' },
  { mr: 'ऑनलाईन आरक्षण', en: 'Online reservation', url: 'https://npublic.msrtcors.com/reservation-home?faces-redirect=true&deviceType=browser' },
  { mr: '४ व ७ दिवसांचे पास', en: '4 & 7-day passes', url: 'https://msrtc.maharashtra.gov.in/GeneralPages/4-7DaysPasses.aspx' },
];
