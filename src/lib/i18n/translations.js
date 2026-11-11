export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "th", label: "ไทย" },
];

export const DEFAULT_LANG = "en";
export const LANG_STORAGE_KEY = "lang";

// English text is the key; a missing entry falls back to the English text.
const TH = {
  "Timezone": "เขตเวลา",
  "Theme": "ธีม",
  "Language": "ภาษา",
  "Card": "การ์ด",
  "Pipeline": "ไปป์ไลน์",
  "My Profile": "โปรไฟล์ของฉัน",
  "Alt Schedule": "ตารางเวลา Alt",
  "Farm Schedule": "ตารางเวลา Farm",
  "ServerE6 Schedule": "ตารางเวลา ServerE6",
  "Switch page": "สลับหน้า",
  "Select theme": "เลือกธีม",
  "Toggle theme": "สลับธีม",
  "Boss and event speech volume": "ระดับเสียงแจ้งเตือนบอสและอีเวนต์",
  "Spawn:": "เกิดเวลา:",
  "Time:": "เวลา:",
  "Event": "อีเวนต์",
  "EVENT": "อีเวนต์",
  "INVASION": "รุกราน",
  "Invasion": "รุกราน",
  "Updated by": "อัปเดตโดย",
  "pts": "แต้ม",
  "SINGLE": "เดี่ยว",
  "NEXT UP": "ถัดไป",
  "CHAIN": "ต่อเนื่อง",
  "Solo Spawn": "เกิดเดี่ยว",
  "Boss Chain": "บอสต่อเนื่อง",
  "Minute": "นาที",
  "Minutes": "นาที",
  "spawn": "ตัว",
  "spawns": "ตัว",
  "Starts in": "เริ่มใน",
  "No upcoming bosses or events right now.": "ตอนนี้ยังไม่มีบอสหรืออีเวนต์ที่กำลังจะมา",
  "All Boss Schedule": "ตารางบอสทั้งหมด",
  "Farm Server Boss Schedule": "ตารางบอสเซิร์ฟเวอร์ Farm",
  "ServerE6 Boss Schedule": "ตารางบอสเซิร์ฟเวอร์ E6",
  "Boss Pipelines": "ไปป์ไลน์บอส",
  "Alt Server Pipelines": "ไปป์ไลน์เซิร์ฟเวอร์ Alt",
  "Farm Server Pipelines": "ไปป์ไลน์เซิร์ฟเวอร์ Farm",
  "ServerE6 Pipelines": "ไปป์ไลน์เซิร์ฟเวอร์ E6",
  "Bosses & events grouped by spawn-time chains": "บอสและอีเวนต์ที่จัดกลุ่มตามช่วงเวลาเกิดต่อเนื่อง",
  "© 2026 cepret. All rights reserved": "© 2026 cepret. สงวนลิขสิทธิ์",
  "Enter your PIN to continue": "กรอกรหัส PIN เพื่อดำเนินการต่อ",
  "Incorrect PIN. Please try again.": "รหัส PIN ไม่ถูกต้อง กรุณาลองอีกครั้ง",
  "Connection error. Please try again.": "การเชื่อมต่อผิดพลาด กรุณาลองอีกครั้ง",
  "Unlock": "ปลดล็อก",
  "Checking…": "กำลังตรวจสอบ…",
};

const BOSS_NAMES_TH = {
  "chertuba": "เชอร์ทูบา",
  "kelsus": "เคลซอส",
  "basila": "บาซิลา",
  "tromba": "ทรอมบา",
  "savan": "ซาบัน (มดชั้น 2)",
  "queen ant": "ราชินีมด",
  "contaminated cruma": "ครูม่าที่ถูกปนเปือน (ชั้น4)",
  "mutated cruma": "ครูม่ามนุษย์กลายพันธุ์ (หนองน้ำ)",
  "core susceptor": "คอร์ซัสเซปเตอร์",
  "katan": "คาทาน (ชั้น6)",
  "sarka": "ซาร์ก้า",
  "talakin": "ทาลาคิน",
  "pan dra'eed": "พันดรายด์",
  "timitris": "ทิมิทริส",
  "stonegeist": "สตัน",
  "valefar": "เทมเพสต์",
  "felis": "เฟลิส",
  "enkura": "เอนคูรา",
  "gahareth": "แกเร็ธ",
  "dragon beast": "ดราก้อนบีสต์",
  "pan narod": "พันนาโรด",
  "matura": "มาทูรา",
  "breka": "เบรก้า",
  "behemonth": "เบฮีมอธ",
  "behemoth": "เบฮีมอธ",
  "medusa": "เมดูซ่า",
  "black lily": "แบล็คลิลลี่",
  "samuel": "ซามูเอล",
  "talkin": "ทัลคิน",
  "timiniel": "ทิมิเนล",
  "balbo": "บัลโบ",
  "orfen": "ออร์เฟน",
  "selu": "เซลลู",
  "repiro": "เรปิโร",
  "coroon": "โครูน",
  "mirror of oblivion": "กระจกแห่งการหลงลืม",
  "glaki": "กลากิ",
  "cabrio": "คาบริโอ",
  "flynt": "ฟลินท์",
  "haff": "ฮาร์ป",
  "hisilrome": "ฮิชิโลเม",
  "landor": "แลนเดอร์",
  "andras": "แอนดราส",
  "olkuth": "โอล์คุส",
  "rahha": "ลาฮา",
  "thanatos": "ทานาทอส",
  "phoenix": "ฟินิกซ์",
};

// Event names come from Supabase; add lowercase English → Thai entries here when available.
const EVENT_NAMES_TH = {};

function lookup(map, name) {
  if (typeof name !== "string") return name;
  return map[name.trim().toLowerCase()] ?? name;
}

export function translate(lang, key) {
  if (lang !== "th") return key;
  return TH[key] ?? key;
}

export function translateBossName(lang, name) {
  if (lang !== "th") return name;
  return lookup(BOSS_NAMES_TH, name);
}

// Event display names are "<name>" or "<name> - <place>".
export function translateEventName(lang, name) {
  if (lang !== "th" || typeof name !== "string") return name;
  return name
    .split(" - ")
    .map((part) => lookup(EVENT_NAMES_TH, part))
    .join(" - ");
}

export function getCountdownUnits(lang) {
  return lang === "th" ? { h: " ชม.", m: " นาที", s: " วิ." } : { h: "h", m: "m", s: "s" };
}
