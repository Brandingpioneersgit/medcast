import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://medcasts:medcasts@localhost:5432/medcasts";

async function seed() {
  const client = postgres(DATABASE_URL);
  const db = drizzle(client, { schema });

  console.log("Seeding database...\n");

  // ============================================================
  // REGIONS
  // ============================================================
  const [southAsia] = await db.insert(schema.regions).values([
    { name: "South Asia", slug: "south-asia", sortOrder: 1 },
    { name: "Middle East", slug: "middle-east", sortOrder: 2 },
    { name: "Southeast Asia", slug: "southeast-asia", sortOrder: 3 },
    { name: "Europe", slug: "europe", sortOrder: 4 },
    { name: "East Africa", slug: "east-africa", sortOrder: 5 },
    { name: "West Africa", slug: "west-africa", sortOrder: 6 },
    { name: "Central Asia", slug: "central-asia", sortOrder: 7 },
  ]).returning();
  console.log("+ Regions seeded");

  // ============================================================
  // COUNTRIES
  // ============================================================
  const countryRows = await db.insert(schema.countries).values([
    // Destination countries
    { regionId: southAsia.id, name: "India", slug: "india", isoCode: "IND", currencyCode: "INR", currencySymbol: "₹", callingCode: "+91", flagEmoji: "🇮🇳", isDestination: true, isSource: false },
    { regionId: 3, name: "Turkey", slug: "turkey", isoCode: "TUR", currencyCode: "TRY", currencySymbol: "₺", callingCode: "+90", flagEmoji: "🇹🇷", isDestination: true, isSource: false },
    { regionId: 3, name: "Singapore", slug: "singapore", isoCode: "SGP", currencyCode: "SGD", currencySymbol: "S$", callingCode: "+65", flagEmoji: "🇸🇬", isDestination: true, isSource: false },
    { regionId: 3, name: "Thailand", slug: "thailand", isoCode: "THA", currencyCode: "THB", currencySymbol: "฿", callingCode: "+66", flagEmoji: "🇹🇭", isDestination: true, isSource: false },
    { regionId: 2, name: "United Arab Emirates", slug: "uae", isoCode: "ARE", currencyCode: "AED", currencySymbol: "د.إ", callingCode: "+971", flagEmoji: "🇦🇪", isDestination: true, isSource: false },
    { regionId: 4, name: "Germany", slug: "germany", isoCode: "DEU", currencyCode: "EUR", currencySymbol: "€", callingCode: "+49", flagEmoji: "🇩🇪", isDestination: true, isSource: false },
    { regionId: 3, name: "South Korea", slug: "south-korea", isoCode: "KOR", currencyCode: "KRW", currencySymbol: "₩", callingCode: "+82", flagEmoji: "🇰🇷", isDestination: true, isSource: false },
    { regionId: 3, name: "Malaysia", slug: "malaysia", isoCode: "MYS", currencyCode: "MYR", currencySymbol: "RM", callingCode: "+60", flagEmoji: "🇲🇾", isDestination: true, isSource: false },
    { regionId: 2, name: "Saudi Arabia", slug: "saudi-arabia", isoCode: "SAU", currencyCode: "SAR", currencySymbol: "﷼", callingCode: "+966", flagEmoji: "🇸🇦", isDestination: true, isSource: true },
    // Source countries
    { regionId: 5, name: "Nigeria", slug: "nigeria", isoCode: "NGA", currencyCode: "NGN", currencySymbol: "₦", callingCode: "+234", flagEmoji: "🇳🇬", isDestination: false, isSource: true },
    { regionId: 5, name: "Kenya", slug: "kenya", isoCode: "KEN", currencyCode: "KES", currencySymbol: "KSh", callingCode: "+254", flagEmoji: "🇰🇪", isDestination: false, isSource: true },
    { regionId: 5, name: "Ethiopia", slug: "ethiopia", isoCode: "ETH", currencyCode: "ETB", currencySymbol: "Br", callingCode: "+251", flagEmoji: "🇪🇹", isDestination: false, isSource: true },
    { regionId: 2, name: "Iraq", slug: "iraq", isoCode: "IRQ", currencyCode: "IQD", currencySymbol: "ع.د", callingCode: "+964", flagEmoji: "🇮🇶", isDestination: false, isSource: true },
    { regionId: 2, name: "Oman", slug: "oman", isoCode: "OMN", currencyCode: "OMR", currencySymbol: "ر.ع.", callingCode: "+968", flagEmoji: "🇴🇲", isDestination: false, isSource: true },
    { regionId: 7, name: "Uzbekistan", slug: "uzbekistan", isoCode: "UZB", currencyCode: "UZS", currencySymbol: "сўм", callingCode: "+998", flagEmoji: "🇺🇿", isDestination: false, isSource: true },
    { regionId: southAsia.id, name: "Bangladesh", slug: "bangladesh", isoCode: "BGD", currencyCode: "BDT", currencySymbol: "৳", callingCode: "+880", flagEmoji: "🇧🇩", isDestination: false, isSource: true },
  ]).returning();
  const india = countryRows[0];
  const turkey = countryRows[1];
  const singapore = countryRows[2];
  const thailand = countryRows[3];
  const uae = countryRows[4];
  const germany = countryRows[5];
  const southKorea = countryRows[6];
  const malaysia = countryRows[7];
  console.log("+ Countries seeded");

  // ============================================================
  // CITIES
  // ============================================================
  const cityRows = await db.insert(schema.cities).values([
    // India
    { countryId: india.id, name: "New Delhi", slug: "new-delhi", stateProvince: "Delhi", airportCode: "DEL", timezone: "Asia/Kolkata" },
    { countryId: india.id, name: "Gurugram", slug: "gurugram", stateProvince: "Haryana", airportCode: "DEL", timezone: "Asia/Kolkata" },
    { countryId: india.id, name: "Noida", slug: "noida", stateProvince: "Uttar Pradesh", airportCode: "DEL", timezone: "Asia/Kolkata" },
    { countryId: india.id, name: "Faridabad", slug: "faridabad", stateProvince: "Haryana", airportCode: "DEL", timezone: "Asia/Kolkata" },
    { countryId: india.id, name: "Mumbai", slug: "mumbai", stateProvince: "Maharashtra", airportCode: "BOM", timezone: "Asia/Kolkata" },
    { countryId: india.id, name: "Bengaluru", slug: "bengaluru", stateProvince: "Karnataka", airportCode: "BLR", timezone: "Asia/Kolkata" },
    { countryId: india.id, name: "Chennai", slug: "chennai", stateProvince: "Tamil Nadu", airportCode: "MAA", timezone: "Asia/Kolkata" },
    // Turkey
    { countryId: turkey.id, name: "Istanbul", slug: "istanbul", stateProvince: "Istanbul", airportCode: "IST", timezone: "Europe/Istanbul" },
    { countryId: turkey.id, name: "Ankara", slug: "ankara", stateProvince: "Ankara", airportCode: "ESB", timezone: "Europe/Istanbul" },
    // Singapore
    { countryId: singapore.id, name: "Singapore", slug: "singapore-city", stateProvince: null, airportCode: "SIN", timezone: "Asia/Singapore" },
    // Thailand
    { countryId: thailand.id, name: "Bangkok", slug: "bangkok", stateProvince: "Bangkok", airportCode: "BKK", timezone: "Asia/Bangkok" },
    { countryId: thailand.id, name: "Phuket", slug: "phuket", stateProvince: "Phuket", airportCode: "HKT", timezone: "Asia/Bangkok" },
    // UAE
    { countryId: uae.id, name: "Dubai", slug: "dubai", stateProvince: "Dubai", airportCode: "DXB", timezone: "Asia/Dubai" },
    { countryId: uae.id, name: "Abu Dhabi", slug: "abu-dhabi", stateProvince: "Abu Dhabi", airportCode: "AUH", timezone: "Asia/Dubai" },
    // Germany
    { countryId: germany.id, name: "Berlin", slug: "berlin", stateProvince: "Berlin", airportCode: "BER", timezone: "Europe/Berlin" },
    { countryId: germany.id, name: "Munich", slug: "munich", stateProvince: "Bavaria", airportCode: "MUC", timezone: "Europe/Berlin" },
    // South Korea
    { countryId: southKorea.id, name: "Seoul", slug: "seoul", stateProvince: "Seoul", airportCode: "ICN", timezone: "Asia/Seoul" },
    // Malaysia
    { countryId: malaysia.id, name: "Kuala Lumpur", slug: "kuala-lumpur", stateProvince: "Kuala Lumpur", airportCode: "KUL", timezone: "Asia/Kuala_Lumpur" },
  ] as any).returning();
  const [
    newDelhi, gurugram, noida, faridabad,
    mumbai, bengaluru, chennai,
    istanbul, ankara,
    singaporeCity,
    bangkok, phuket,
    dubai, abuDhabi,
    berlin, munich,
    seoul,
    kualaLumpur,
  ] = cityRows;
  console.log("+ Cities seeded");

  // ============================================================
  // ACCREDITATIONS
  // ============================================================
  const accredRows = await db.insert(schema.accreditations).values([
    { name: "Joint Commission International", slug: "jci", acronym: "JCI", description: "Global gold standard for healthcare accreditation" },
    { name: "National Accreditation Board for Hospitals", slug: "nabh", acronym: "NABH", description: "India's healthcare quality standard" },
    { name: "International Organization for Standardization", slug: "iso", acronym: "ISO", description: "ISO 9001 quality management" },
  ]).returning();
  console.log("+ Accreditations seeded");

  // ============================================================
  // AMENITIES
  // ============================================================
  await db.insert(schema.amenities).values([
    { name: "Airport Pickup", slug: "airport-pickup", icon: "plane", category: "travel" },
    { name: "Translator Services", slug: "translator", icon: "languages", category: "support" },
    { name: "International Patient Lounge", slug: "intl-lounge", icon: "sofa", category: "comfort" },
    { name: "Halal Food", slug: "halal-food", icon: "utensils", category: "food" },
    { name: "Prayer Room", slug: "prayer-room", icon: "moon", category: "religious" },
    { name: "Free WiFi", slug: "wifi", icon: "wifi", category: "connectivity" },
    { name: "Currency Exchange", slug: "currency-exchange", icon: "banknote", category: "financial" },
    { name: "Visa Assistance", slug: "visa-assistance", icon: "file-text", category: "travel" },
  ]);
  console.log("+ Amenities seeded");

  // ============================================================
  // HOSPITALS
  // ============================================================
  const hospitalRows = await db.insert(schema.hospitals).values([
    {
      cityId: gurugram.id, name: "Artemis Hospital", slug: "artemis-hospital",
      description: "Artemis Hospital is a state-of-the-art multi-specialty hospital in Gurugram. Established in 2007, it is well-regarded for orthopaedics, cancer care, and critical care services with 600+ beds and advanced robotic surgery capabilities.",
      phone: "+911244511111", email: "international@artemishospitals.com", website: "https://www.artemishospitals.com",
      establishedYear: 2007, bedCapacity: 600, rating: "4.5", reviewCount: 285,
      airportDistanceKm: "25", airportTransferAvailable: true,
      isActive: true, isFeatured: true, isVerified: true,
    },
    {
      cityId: gurugram.id, name: "Medanta - The Medicity", slug: "medanta-medicity",
      description: "Medanta is a multi-super specialty hospital founded by Dr. Naresh Trehan. Known for comprehensive care across 20+ specialties with 1600 beds, advanced research facilities, and world-class cardiac care.",
      phone: "+911244834111", email: "international@medanta.org", website: "https://www.medanta.org",
      establishedYear: 2009, bedCapacity: 1600, rating: "4.7", reviewCount: 412,
      airportDistanceKm: "28", airportTransferAvailable: true,
      isActive: true, isFeatured: true, isVerified: true,
    },
    {
      cityId: newDelhi.id, name: "Indraprastha Apollo Hospital", slug: "apollo-hospital-delhi",
      description: "Indraprastha Apollo is the flagship hospital of the Apollo Group in New Delhi. A 700-bed facility offering a wide range of specialties with JCI accreditation and India's first proton therapy center.",
      phone: "+911126925858", email: "intlmarketing@apollohospitals.com", website: "https://www.apollohospitals.com",
      establishedYear: 1996, bedCapacity: 700, rating: "4.9", reviewCount: 520,
      airportDistanceKm: "15", airportTransferAvailable: true,
      isActive: true, isFeatured: true, isVerified: true,
    },
    {
      cityId: newDelhi.id, name: "Max Super Speciality Hospital, Saket", slug: "max-hospital-saket",
      description: "Max Saket is part of the Max Healthcare network. A leading 500-bed hospital known for cardiac sciences, orthopaedics, and oncology with JCI accreditation.",
      phone: "+911126515050", email: "intlpatients@maxhealthcare.com", website: "https://www.maxhealthcare.in",
      establishedYear: 2006, bedCapacity: 500, rating: "4.3", reviewCount: 320,
      airportDistanceKm: "12", airportTransferAvailable: true,
      isActive: true, isFeatured: true, isVerified: true,
    },
    {
      cityId: faridabad.id, name: "Amrita Hospital Faridabad", slug: "amrita-hospital-faridabad",
      description: "Amrita Hospital is a 2600-bed facility, one of the largest hospitals in India. Part of the Amrita Vishwa Vidyapeetham university system with cutting-edge medical technology.",
      phone: "+911800123456", email: "intl@amritahospital.org",
      establishedYear: 2022, bedCapacity: 2600, rating: "4.4", reviewCount: 180,
      airportDistanceKm: "35", airportTransferAvailable: true,
      isActive: true, isFeatured: false, isVerified: true,
    },
    {
      cityId: faridabad.id, name: "Sarvodaya Hospital", slug: "sarvodaya-hospital",
      description: "Sarvodaya Hospital is a multi-specialty healthcare facility in Faridabad offering comprehensive medical services with modern infrastructure and experienced medical professionals.",
      phone: "+911294000000", email: "info@sarvodayahospital.com",
      establishedYear: 2008, bedCapacity: 500, rating: "4.1", reviewCount: 150,
      airportDistanceKm: "38", airportTransferAvailable: false,
      isActive: true, isFeatured: false, isVerified: true,
    },
    // Turkey
    {
      cityId: istanbul.id, name: "Acıbadem Maslak Hospital", slug: "acibadem-maslak",
      description: "Flagship hospital of the Acıbadem Healthcare Group in Istanbul — JCI-accredited with centres of excellence in cardiology, oncology, and robotic surgery.",
      phone: "+902123044444", email: "international@acibadem.com", website: "https://www.acibademinternational.com",
      establishedYear: 2011, bedCapacity: 235, rating: "4.6", reviewCount: 310,
      airportDistanceKm: "35", airportTransferAvailable: true,
      isActive: true, isFeatured: true, isVerified: true,
    },
    {
      cityId: istanbul.id, name: "Memorial Şişli Hospital", slug: "memorial-sisli",
      description: "First JCI-accredited hospital in Turkey. Known for bone marrow transplantation, IVF, and advanced orthopaedic surgery.",
      phone: "+902124447888", email: "info@memorial.com.tr", website: "https://www.memorial.com.tr",
      establishedYear: 2000, bedCapacity: 200, rating: "4.5", reviewCount: 285,
      airportDistanceKm: "18", airportTransferAvailable: true,
      isActive: true, isFeatured: true, isVerified: true,
    },
    // Thailand
    {
      cityId: bangkok.id, name: "Bumrungrad International", slug: "bumrungrad-international",
      description: "One of the world's top medical-tourism hospitals. Serves over 1.1M patients from 190+ countries each year with JCI and CCPC certifications.",
      phone: "+6620661000", email: "info@bumrungrad.com", website: "https://www.bumrungrad.com",
      establishedYear: 1980, bedCapacity: 580, rating: "4.8", reviewCount: 640,
      airportDistanceKm: "30", airportTransferAvailable: true,
      isActive: true, isFeatured: true, isVerified: true,
    },
    {
      cityId: bangkok.id, name: "Bangkok Hospital", slug: "bangkok-hospital",
      description: "Flagship of the Bangkok Dusit Medical Services network. Multi-specialty 550-bed facility with renowned cardiac and orthopaedic centres.",
      phone: "+6623105000", email: "info@bangkokhospital.com", website: "https://www.bangkokhospital.com",
      establishedYear: 1972, bedCapacity: 550, rating: "4.5", reviewCount: 420,
      airportDistanceKm: "32", airportTransferAvailable: true,
      isActive: true, isFeatured: true, isVerified: true,
    },
    // UAE
    {
      cityId: dubai.id, name: "Mediclinic City Hospital", slug: "mediclinic-city-hospital",
      description: "Tertiary-care hospital in Dubai Healthcare City with JCI accreditation. Strong cardiac, oncology, and women's-health programs.",
      phone: "+97144359999", email: "dubai@mediclinic.ae", website: "https://www.mediclinic.ae",
      establishedYear: 2008, bedCapacity: 280, rating: "4.5", reviewCount: 275,
      airportDistanceKm: "10", airportTransferAvailable: true,
      isActive: true, isFeatured: true, isVerified: true,
    },
    {
      cityId: abuDhabi.id, name: "Cleveland Clinic Abu Dhabi", slug: "cleveland-clinic-abu-dhabi",
      description: "Extension of the US Cleveland Clinic. 364-bed facility with 5 centres of excellence including cardiovascular and digestive disease institutes.",
      phone: "+97128019000", email: "intlpatients@clevelandclinicabudhabi.ae", website: "https://www.clevelandclinicabudhabi.ae",
      establishedYear: 2015, bedCapacity: 364, rating: "4.7", reviewCount: 395,
      airportDistanceKm: "15", airportTransferAvailable: true,
      isActive: true, isFeatured: true, isVerified: true,
    },
    // Singapore
    {
      cityId: singaporeCity.id, name: "Mount Elizabeth Hospital", slug: "mount-elizabeth-hospital",
      description: "345-bed private tertiary hospital; among Asia's top hospitals for complex cardiology, oncology, and transplant surgery.",
      phone: "+6567372666", email: "ppl@parkwaypantai.com", website: "https://www.mountelizabeth.com.sg",
      establishedYear: 1979, bedCapacity: 345, rating: "4.7", reviewCount: 380,
      airportDistanceKm: "22", airportTransferAvailable: true,
      isActive: true, isFeatured: true, isVerified: true,
    },
    // Germany
    {
      cityId: berlin.id, name: "Charité — Universitätsmedizin Berlin", slug: "charite-berlin",
      description: "Europe's largest university hospital. Global leader in cardiology, oncology, neurology, and research-driven medicine.",
      phone: "+493045050", email: "international@charite.de", website: "https://www.charite.de",
      establishedYear: 1710, bedCapacity: 3011, rating: "4.6", reviewCount: 220,
      airportDistanceKm: "10", airportTransferAvailable: true,
      isActive: true, isFeatured: true, isVerified: true,
    },
    {
      cityId: munich.id, name: "Klinikum rechts der Isar (TUM)", slug: "klinikum-rechts-der-isar",
      description: "University hospital of the Technical University of Munich. Leading oncology, cardiac, and transplant center in southern Germany.",
      phone: "+498941400", email: "internationaloffice@mri.tum.de", website: "https://www.mri.tum.de",
      establishedYear: 1834, bedCapacity: 1161, rating: "4.6", reviewCount: 170,
      airportDistanceKm: "30", airportTransferAvailable: true,
      isActive: true, isFeatured: true, isVerified: true,
    },
    // South Korea
    {
      cityId: seoul.id, name: "Asan Medical Center", slug: "asan-medical-center",
      description: "Korea's largest hospital and among the world's busiest for liver transplants. Newsweek world top 30.",
      phone: "+82230103114", email: "ims@amc.seoul.kr", website: "https://eng.amc.seoul.kr",
      establishedYear: 1989, bedCapacity: 2700, rating: "4.8", reviewCount: 410,
      airportDistanceKm: "50", airportTransferAvailable: true,
      isActive: true, isFeatured: true, isVerified: true,
    },
    // Malaysia
    {
      cityId: kualaLumpur.id, name: "Prince Court Medical Centre", slug: "prince-court-medical-centre",
      description: "JCI-accredited 277-bed hospital in Kuala Lumpur, regularly ranked among the world's top medical-tourism destinations.",
      phone: "+60321600000", email: "info@princecourt.com", website: "https://www.princecourt.com",
      establishedYear: 2007, bedCapacity: 277, rating: "4.5", reviewCount: 230,
      airportDistanceKm: "55", airportTransferAvailable: true,
      isActive: true, isFeatured: true, isVerified: true,
    },
  ]).returning();
  const [
    artemis, medanta, apollo, max, amrita, sarvodaya,
    acibadem, memorial, bumrungrad, bangkokHospital,
    mediclinic, clevelandAD, mountElizabeth,
    charite, tumMunich,
    asan,
    princeCourt,
  ] = hospitalRows;
  console.log("+ Hospitals seeded");

  // ============================================================
  // HOSPITAL ACCREDITATIONS
  // ============================================================
  await db.insert(schema.hospitalAccreditations).values([
    { hospitalId: artemis.id, accreditationId: accredRows[0].id },
    { hospitalId: medanta.id, accreditationId: accredRows[0].id },
    { hospitalId: medanta.id, accreditationId: accredRows[1].id },
    { hospitalId: apollo.id, accreditationId: accredRows[1].id },
    { hospitalId: apollo.id, accreditationId: accredRows[0].id },
    { hospitalId: max.id, accreditationId: accredRows[0].id },
    { hospitalId: amrita.id, accreditationId: accredRows[1].id },
    { hospitalId: sarvodaya.id, accreditationId: accredRows[1].id },
    { hospitalId: acibadem.id, accreditationId: accredRows[0].id },
    { hospitalId: memorial.id, accreditationId: accredRows[0].id },
    { hospitalId: bumrungrad.id, accreditationId: accredRows[0].id },
    { hospitalId: bangkokHospital.id, accreditationId: accredRows[0].id },
    { hospitalId: mediclinic.id, accreditationId: accredRows[0].id },
    { hospitalId: clevelandAD.id, accreditationId: accredRows[0].id },
    { hospitalId: mountElizabeth.id, accreditationId: accredRows[0].id },
    { hospitalId: charite.id, accreditationId: accredRows[2].id },
    { hospitalId: tumMunich.id, accreditationId: accredRows[2].id },
    { hospitalId: asan.id, accreditationId: accredRows[0].id },
    { hospitalId: princeCourt.id, accreditationId: accredRows[0].id },
  ]);
  console.log("+ Hospital accreditations seeded");

  // ============================================================
  // SPECIALTIES
  // ============================================================
  const specRows = await db.insert(schema.specialties).values([
    { name: "Cardiac Surgery", slug: "cardiac-surgery", description: "Heart surgery including bypass, valve replacement, angioplasty, and advanced cardiac interventions.", sortOrder: 1, isActive: true },
    { name: "Orthopedics", slug: "orthopedics", description: "Joint replacement, spine surgery, sports medicine, and musculoskeletal treatments.", sortOrder: 2, isActive: true },
    { name: "Oncology", slug: "oncology", description: "Comprehensive cancer care including surgery, chemotherapy, radiation therapy, and immunotherapy.", sortOrder: 3, isActive: true },
    { name: "Neurology & Neurosurgery", slug: "neurology-neurosurgery", description: "Brain and spine surgery, epilepsy treatment, stroke care, and neurological disorders.", sortOrder: 4, isActive: true },
    { name: "Organ Transplant", slug: "organ-transplant", description: "Liver, kidney, heart, and bone marrow transplantation with comprehensive pre and post-operative care.", sortOrder: 5, isActive: true },
    { name: "GI Surgery", slug: "gi-surgery", description: "Gastrointestinal surgery including laparoscopic procedures, bariatric surgery, and liver surgery.", sortOrder: 6, isActive: true },
    { name: "Cosmetic Surgery", slug: "cosmetic-surgery", description: "Rhinoplasty, liposuction, hair transplant, and other aesthetic procedures.", sortOrder: 7, isActive: true },
    { name: "Fertility & IVF", slug: "fertility-ivf", description: "IVF, ICSI, egg freezing, and comprehensive fertility treatments.", sortOrder: 8, isActive: true },
    { name: "Ophthalmology", slug: "ophthalmology", description: "LASIK, cataract surgery, retina treatments, and comprehensive eye care.", sortOrder: 9, isActive: true },
    { name: "Dental", slug: "dental", description: "Dental implants, full mouth rehabilitation, cosmetic dentistry, and oral surgery.", sortOrder: 10, isActive: true },
  ]).returning();
  const [cardiac, ortho, onco, neuro, transplant, gi] = specRows;
  console.log("+ Specialties seeded");

  // ============================================================
  // HOSPITAL SPECIALTIES
  // ============================================================
  const allHospitals = [
    artemis, medanta, apollo, max, amrita, sarvodaya,
    acibadem, memorial, bumrungrad, bangkokHospital,
    mediclinic, clevelandAD, mountElizabeth,
    charite, tumMunich, asan, princeCourt,
  ];
  const coreSpecs = [cardiac, ortho, onco, neuro, transplant, gi];
  const hsValues = [];
  for (const h of allHospitals) {
    for (const s of coreSpecs) {
      hsValues.push({ hospitalId: h.id, specialtyId: s.id, isCenterOfExcellence: Math.random() > 0.5 });
    }
  }
  await db.insert(schema.hospitalSpecialties).values(hsValues);
  console.log("+ Hospital specialties seeded");

  // ============================================================
  // TREATMENTS
  // ============================================================
  const treatmentRows = await db.insert(schema.treatments).values([
    // Cardiac
    { specialtyId: cardiac.id, name: "CABG (Heart Bypass Surgery)", slug: "cabg-heart-bypass", description: "Coronary artery bypass grafting to restore blood flow to the heart.", hospitalStayDays: 8, recoveryDays: 45, successRatePercent: "98", isActive: true },
    { specialtyId: cardiac.id, name: "Angioplasty with Stent", slug: "angioplasty-stent", description: "Minimally invasive procedure to open blocked arteries using a balloon and stent.", hospitalStayDays: 3, recoveryDays: 14, successRatePercent: "95", isMinimallyInvasive: true, isActive: true },
    { specialtyId: cardiac.id, name: "Heart Valve Replacement", slug: "heart-valve-replacement", description: "Surgical replacement of damaged heart valves.", hospitalStayDays: 10, recoveryDays: 60, successRatePercent: "96", isActive: true },
    // Ortho
    { specialtyId: ortho.id, name: "Total Knee Replacement", slug: "total-knee-replacement", description: "Complete knee joint replacement with artificial prosthesis.", hospitalStayDays: 5, recoveryDays: 90, successRatePercent: "97", isActive: true },
    { specialtyId: ortho.id, name: "Hip Replacement", slug: "hip-replacement", description: "Total hip arthroplasty with advanced implant technology.", hospitalStayDays: 5, recoveryDays: 90, successRatePercent: "96", isActive: true },
    { specialtyId: ortho.id, name: "Spine Surgery", slug: "spine-surgery", description: "Laminectomy, discectomy, and spinal fusion procedures.", hospitalStayDays: 5, recoveryDays: 60, successRatePercent: "92", isActive: true },
    // Onco
    { specialtyId: onco.id, name: "Chemotherapy (per cycle)", slug: "chemotherapy-cycle", description: "Systemic cancer treatment using anti-cancer drugs.", hospitalStayDays: 1, recoveryDays: 14, isActive: true },
    { specialtyId: onco.id, name: "Cancer Surgery", slug: "cancer-surgery", description: "Surgical removal of cancerous tumors — breast, GI, head-neck.", hospitalStayDays: 7, recoveryDays: 30, successRatePercent: "90", isActive: true },
    { specialtyId: onco.id, name: "Radiation Therapy (IMRT)", slug: "radiation-therapy-imrt", description: "Advanced radiation treatment targeting cancer cells precisely.", hospitalStayDays: 0, recoveryDays: 30, isActive: true },
    // Neuro
    { specialtyId: neuro.id, name: "Brain Tumor Surgery", slug: "brain-tumor-surgery", description: "Craniotomy-based surgical removal of brain tumors.", hospitalStayDays: 10, recoveryDays: 60, successRatePercent: "88", isActive: true },
    { specialtyId: neuro.id, name: "Deep Brain Stimulation", slug: "deep-brain-stimulation", description: "Implanting electrodes for Parkinson's disease treatment.", hospitalStayDays: 7, recoveryDays: 30, successRatePercent: "85", isActive: true },
    // Transplant
    { specialtyId: transplant.id, name: "Liver Transplant", slug: "liver-transplant", description: "Complete liver transplantation from living or deceased donors.", hospitalStayDays: 21, recoveryDays: 90, successRatePercent: "92", requiresDonor: true, isActive: true },
    { specialtyId: transplant.id, name: "Kidney Transplant", slug: "kidney-transplant", description: "Kidney transplantation with comprehensive post-op care.", hospitalStayDays: 14, recoveryDays: 60, successRatePercent: "95", requiresDonor: true, isActive: true },
    // GI
    { specialtyId: gi.id, name: "Gastric Sleeve Surgery", slug: "gastric-sleeve", description: "Weight loss surgery removing 80% of the stomach.", hospitalStayDays: 3, recoveryDays: 30, successRatePercent: "93", isMinimallyInvasive: true, isActive: true },
    { specialtyId: gi.id, name: "Laparoscopic Gallbladder Surgery", slug: "laparoscopic-gallbladder", description: "Minimally invasive removal of the gallbladder.", hospitalStayDays: 2, recoveryDays: 14, successRatePercent: "99", isMinimallyInvasive: true, isActive: true },
  ]).returning();
  console.log("+ Treatments seeded");

  // ============================================================
  // HOSPITAL TREATMENTS (pricing)
  // ============================================================
  const pricing: { hospitalId: number; treatmentId: number; costMinUsd: string; costMaxUsd: string }[] = [];
  const basePrices: Record<string, [number, number]> = {
    "cabg-heart-bypass": [5000, 7000],
    "angioplasty-stent": [3000, 4500],
    "heart-valve-replacement": [6000, 9000],
    "total-knee-replacement": [4000, 6000],
    "hip-replacement": [5000, 7500],
    "spine-surgery": [5000, 7500],
    "chemotherapy-cycle": [500, 800],
    "cancer-surgery": [3000, 6000],
    "radiation-therapy-imrt": [3500, 5500],
    "brain-tumor-surgery": [7000, 10000],
    "deep-brain-stimulation": [18000, 25000],
    "liver-transplant": [30000, 40000],
    "kidney-transplant": [13000, 18000],
    "gastric-sleeve": [5000, 7000],
    "laparoscopic-gallbladder": [2000, 3000],
  };

  for (const h of allHospitals) {
    for (const t of treatmentRows) {
      const base = basePrices[t.slug];
      if (base) {
        const variance = 0.8 + Math.random() * 0.4; // 80-120% of base
        pricing.push({
          hospitalId: h.id,
          treatmentId: t.id,
          costMinUsd: Math.round(base[0] * variance).toString(),
          costMaxUsd: Math.round(base[1] * variance).toString(),
        });
      }
    }
  }
  await db.insert(schema.hospitalTreatments).values(pricing);
  console.log("+ Hospital treatment pricing seeded");

  // ============================================================
  // DOCTORS
  // ============================================================
  const doctorData = [
    { hospitalId: artemis.id, name: "Dr. Aditya Gupta", slug: "dr-aditya-gupta", title: "Dr.", qualifications: "MBBS, MS, MCh (Neurosurgery)", experienceYears: 22, patientsTreated: 15000, rating: "4.8", reviewCount: 180, specialtyId: neuro.id, bio: "One of India's leading neurosurgeons specializing in brain tumors and deep brain stimulation." },
    { hospitalId: artemis.id, name: "Dr. Pawan Goyal", slug: "dr-pawan-goyal", title: "Dr.", qualifications: "MBBS, MS (Ortho), Fellowship Joint Replacement", experienceYears: 18, patientsTreated: 10000, rating: "4.7", reviewCount: 145, specialtyId: ortho.id, bio: "Expert in robotic knee and hip replacement surgery." },
    { hospitalId: medanta.id, name: "Dr. Naresh Trehan", slug: "dr-naresh-trehan", title: "Dr.", qualifications: "MBBS, MD, FRCS", experienceYears: 45, patientsTreated: 48000, rating: "4.9", reviewCount: 520, specialtyId: cardiac.id, bio: "Chairman and Managing Director of Medanta. World-renowned cardiovascular surgeon." },
    { hospitalId: medanta.id, name: "Dr. Arvind Kumar", slug: "dr-arvind-kumar", title: "Dr.", qualifications: "MBBS, MS, MCh (Thoracic Surgery)", experienceYears: 35, patientsTreated: 20000, rating: "4.8", reviewCount: 280, specialtyId: onco.id, bio: "Pioneer in robotic thoracic surgery and lung cancer treatment." },
    { hospitalId: apollo.id, name: "Dr. Vinod Raina", slug: "dr-vinod-raina", title: "Dr.", qualifications: "MBBS, MD (Medicine), DM (Oncology)", experienceYears: 30, patientsTreated: 25000, rating: "4.9", reviewCount: 350, specialtyId: onco.id, bio: "Senior oncologist specializing in breast cancer and lymphomas." },
    { hospitalId: apollo.id, name: "Dr. S.K. Gupta", slug: "dr-sk-gupta", title: "Dr.", qualifications: "MBBS, MS, MCh (CTVS)", experienceYears: 28, patientsTreated: 18000, rating: "4.7", reviewCount: 220, specialtyId: cardiac.id, bio: "Expert in minimally invasive cardiac surgery and valve repair." },
    { hospitalId: max.id, name: "Dr. Harit Chaturvedi", slug: "dr-harit-chaturvedi", title: "Dr.", qualifications: "MBBS, MS, MCh (Surgical Oncology)", experienceYears: 25, patientsTreated: 12000, rating: "4.8", reviewCount: 190, specialtyId: onco.id, bio: "Leading surgical oncologist specializing in breast and GI cancers." },
    { hospitalId: max.id, name: "Dr. Rajneesh Malhotra", slug: "dr-rajneesh-malhotra", title: "Dr.", qualifications: "MBBS, MS, MCh (CTVS), FRCS", experienceYears: 22, patientsTreated: 10000, rating: "4.6", reviewCount: 160, specialtyId: cardiac.id, bio: "Expert in aortic surgery and complex cardiac procedures." },
    { hospitalId: amrita.id, name: "Dr. Ashish Kumar", slug: "dr-ashish-kumar", title: "Dr.", qualifications: "MBBS, MS (Ortho), Fellowship Sports Medicine", experienceYears: 15, patientsTreated: 8000, rating: "4.5", reviewCount: 95, specialtyId: ortho.id, bio: "Sports medicine and arthroscopy specialist." },
    { hospitalId: sarvodaya.id, name: "Dr. Ranjan Kumar", slug: "dr-ranjan-kumar", title: "Dr.", qualifications: "MBBS, MD, DM (Gastroenterology)", experienceYears: 20, patientsTreated: 11000, rating: "4.4", reviewCount: 120, specialtyId: gi.id, bio: "Expert in advanced endoscopy and GI surgery." },
  ];

  const doctorRows = await db.insert(schema.doctors).values(
    doctorData.map(d => ({
      hospitalId: d.hospitalId,
      name: d.name,
      slug: d.slug,
      title: d.title,
      qualifications: d.qualifications,
      experienceYears: d.experienceYears,
      patientsTreated: d.patientsTreated,
      rating: d.rating,
      reviewCount: d.reviewCount,
      bio: d.bio,
      languagesSpoken: JSON.stringify(["English", "Hindi"]),
      isActive: true,
      isFeatured: true,
    }))
  ).returning();
  console.log("+ Doctors seeded");

  // Doctor specialties
  for (let i = 0; i < doctorRows.length; i++) {
    await db.insert(schema.doctorSpecialties).values({
      doctorId: doctorRows[i].id,
      specialtyId: doctorData[i].specialtyId,
      isPrimary: true,
    });
  }
  console.log("+ Doctor specialties seeded");

  // ============================================================
  // TESTIMONIALS
  // ============================================================
  await db.insert(schema.testimonials).values([
    { hospitalId: medanta.id, patientName: "Ahmed Al-Rashid", patientCountry: "Iraq", patientAge: 52, rating: 5, title: "Life-saving cardiac surgery", story: "I came to Medanta for a complex heart bypass surgery. Dr. Trehan and his team were exceptional. The entire process from arrival to recovery was seamless. The international patient department helped with everything including visa and accommodation.", isVerified: true, isFeatured: true, isActive: true },
    { hospitalId: apollo.id, patientName: "Grace Okafor", patientCountry: "Kenya", patientAge: 34, rating: 5, title: "Successful cancer treatment", story: "Apollo Hospital gave me a second chance at life. The oncology team was thorough in their approach, and the cost was a fraction of what it would have been in the US. The hospital arranged translator services and my coordinator spoke Swahili!", isVerified: true, isFeatured: true, isActive: true },
    { hospitalId: artemis.id, patientName: "Tsegaye Bekele", patientCountry: "Ethiopia", patientAge: 45, rating: 4, title: "Knee replacement success", story: "After years of knee pain, I finally got bilateral knee replacement at Artemis. Dr. Goyal used robotic technology and I was walking within days. The care was world-class and affordable.", isVerified: true, isFeatured: true, isActive: true },
    { hospitalId: max.id, patientName: "Fatima Hassan", patientCountry: "Oman", patientAge: 28, rating: 5, title: "Excellent neurosurgery experience", story: "My family was worried about brain surgery abroad, but Max Hospital exceeded all expectations. The facilities were top-notch and the medical team was incredibly skilled. Halal food and prayer room availability made us feel at home.", isVerified: true, isFeatured: true, isActive: true },
    { hospitalId: medanta.id, patientName: "Nikolai Petrov", patientCountry: "Uzbekistan", patientAge: 60, rating: 5, title: "Liver transplant at Medanta", story: "I was told I needed a liver transplant urgently. Medanta's transplant team performed the surgery flawlessly. The recovery care was exceptional and the Russian-speaking coordinator made everything easy for my family.", isVerified: true, isFeatured: true, isActive: true },
  ]);
  console.log("+ Testimonials seeded");

  // ============================================================
  // CONDITIONS
  // ============================================================
  const conditionRows = await db.insert(schema.conditions).values([
    { name: "Heart Blockage", slug: "heart-blockage", description: "Coronary artery disease causing reduced blood flow to the heart." },
    { name: "Knee Pain", slug: "knee-pain", description: "Chronic knee pain from arthritis, injury, or degenerative conditions." },
    { name: "Breast Cancer", slug: "breast-cancer", description: "Cancer originating in breast tissue, one of the most common cancers worldwide." },
    { name: "Brain Tumor", slug: "brain-tumor", description: "Abnormal growth of cells in the brain requiring surgical intervention." },
    { name: "Liver Failure", slug: "liver-failure", description: "End-stage liver disease requiring transplantation." },
    { name: "Obesity", slug: "obesity", description: "Excessive body weight requiring bariatric surgical intervention." },
    { name: "Spinal Disc Herniation", slug: "spinal-disc-herniation", description: "Disc bulge or rupture causing back pain and nerve compression." },
    { name: "Kidney Failure", slug: "kidney-failure", description: "Chronic kidney disease requiring dialysis or transplantation." },
  ]).returning();
  console.log("+ Conditions seeded");

  // Condition-specialty mappings
  await db.insert(schema.conditionSpecialties).values([
    { conditionId: conditionRows[0].id, specialtyId: cardiac.id },
    { conditionId: conditionRows[1].id, specialtyId: ortho.id },
    { conditionId: conditionRows[2].id, specialtyId: onco.id },
    { conditionId: conditionRows[3].id, specialtyId: neuro.id },
    { conditionId: conditionRows[4].id, specialtyId: transplant.id },
    { conditionId: conditionRows[5].id, specialtyId: gi.id },
    { conditionId: conditionRows[6].id, specialtyId: ortho.id },
    { conditionId: conditionRows[7].id, specialtyId: transplant.id },
  ]);
  console.log("+ Condition-specialty mappings seeded");

  // Condition-treatment mappings
  await db.insert(schema.conditionTreatments).values([
    { conditionId: conditionRows[0].id, treatmentId: treatmentRows[0].id, isPrimary: true },
    { conditionId: conditionRows[0].id, treatmentId: treatmentRows[1].id },
    { conditionId: conditionRows[1].id, treatmentId: treatmentRows[3].id, isPrimary: true },
    { conditionId: conditionRows[2].id, treatmentId: treatmentRows[7].id, isPrimary: true },
    { conditionId: conditionRows[2].id, treatmentId: treatmentRows[6].id },
    { conditionId: conditionRows[3].id, treatmentId: treatmentRows[9].id, isPrimary: true },
    { conditionId: conditionRows[4].id, treatmentId: treatmentRows[11].id, isPrimary: true },
    { conditionId: conditionRows[5].id, treatmentId: treatmentRows[13].id, isPrimary: true },
    { conditionId: conditionRows[6].id, treatmentId: treatmentRows[5].id, isPrimary: true },
    { conditionId: conditionRows[7].id, treatmentId: treatmentRows[12].id, isPrimary: true },
  ]);
  console.log("+ Condition-treatment mappings seeded");

  // ============================================================
  // ADMIN USER
  // ============================================================
  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash("admin123", 10);
  await db.insert(schema.adminUsers).values({
    name: "Admin",
    email: "admin@medcasts.com",
    passwordHash: hash,
    role: "superadmin",
    isActive: true,
  });
  console.log("+ Admin user seeded (admin@medcasts.com / admin123)");

  console.log("\n✓ Database seeded successfully!");

  await client.end();
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
