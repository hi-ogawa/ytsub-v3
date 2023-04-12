// See misc/youtube/README.md
const LANGUAGE_CODE_TO_NAME_YOUTUBE = {
  af: "Afrikaans",
  sq: "Albanian",
  am: "Amharic",
  ar: "Arabic",
  hy: "Armenian",
  az: "Azerbaijani",
  bn: "Bangla",
  eu: "Basque",
  be: "Belarusian",
  bs: "Bosnian",
  bg: "Bulgarian",
  my: "Burmese",
  ca: "Catalan",
  ceb: "Cebuano",
  "zh-Hans": "Chinese (Simplified)",
  "zh-Hant": "Chinese (Traditional)",
  co: "Corsican",
  hr: "Croatian",
  cs: "Czech",
  da: "Danish",
  nl: "Dutch",
  en: "English",
  eo: "Esperanto",
  et: "Estonian",
  fil: "Filipino",
  fi: "Finnish",
  fr: "French",
  gl: "Galician",
  ka: "Georgian",
  de: "German",
  el: "Greek",
  gu: "Gujarati",
  ht: "Haitian Creole",
  ha: "Hausa",
  haw: "Hawaiian",
  iw: "Hebrew",
  hi: "Hindi",
  hmn: "Hmong",
  hu: "Hungarian",
  is: "Icelandic",
  ig: "Igbo",
  id: "Indonesian",
  ga: "Irish",
  it: "Italian",
  ja: "Japanese",
  jv: "Javanese",
  kn: "Kannada",
  kk: "Kazakh",
  km: "Khmer",
  rw: "Kinyarwanda",
  ko: "Korean",
  ku: "Kurdish",
  ky: "Kyrgyz",
  lo: "Lao",
  la: "Latin",
  lv: "Latvian",
  lt: "Lithuanian",
  lb: "Luxembourgish",
  mk: "Macedonian",
  mg: "Malagasy",
  ms: "Malay",
  ml: "Malayalam",
  mt: "Maltese",
  mi: "Maori",
  mr: "Marathi",
  mn: "Mongolian",
  ne: "Nepali",
  no: "Norwegian",
  ny: "Nyanja",
  or: "Odia",
  ps: "Pashto",
  fa: "Persian",
  pl: "Polish",
  pt: "Portuguese",
  pa: "Punjabi",
  ro: "Romanian",
  ru: "Russian",
  sm: "Samoan",
  gd: "Scottish Gaelic",
  sr: "Serbian",
  sn: "Shona",
  sd: "Sindhi",
  si: "Sinhala",
  sk: "Slovak",
  sl: "Slovenian",
  so: "Somali",
  st: "Southern Sotho",
  es: "Spanish",
  su: "Sundanese",
  sw: "Swahili",
  sv: "Swedish",
  tg: "Tajik",
  ta: "Tamil",
  tt: "Tatar",
  te: "Telugu",
  th: "Thai",
  tr: "Turkish",
  tk: "Turkmen",
  uk: "Ukrainian",
  ur: "Urdu",
  ug: "Uyghur",
  uz: "Uzbek",
  vi: "Vietnamese",
  cy: "Welsh",
  fy: "Western Frisian",
  xh: "Xhosa",
  yi: "Yiddish",
  yo: "Yoruba",
  zu: "Zulu",
} as const;

// Some author uses additional language codes for their manual captions
const LANGUAGE_CODE_TO_NAME_ADHOC = {
  "fr-FR": "French (France)",
} as const;

const LANGUAGE_CODE_TO_NAME = {
  ...LANGUAGE_CODE_TO_NAME_YOUTUBE,
  ...LANGUAGE_CODE_TO_NAME_ADHOC,
};

export type LanguageCode = keyof typeof LANGUAGE_CODE_TO_NAME;

export function isLanguageCode(v: string): v is LanguageCode {
  return v in LANGUAGE_CODE_TO_NAME;
}

export function languageCodeToName(code: string, kind?: string): string {
  return (
    (LANGUAGE_CODE_TO_NAME[code as LanguageCode] ?? code) +
    (kind === "asr" ? " (machine)" : "")
  );
}

// Copied from "Popular Languages" on italki.com
//   English
//   Chinese (Mandarin)
//   French
//   Spanish
//   Portuguese
//   German
//   Japanese
//   Korean
//   Arabic
//   Hindi
//   Italian
//   Russian
export const FILTERED_LANGUAGE_CODES: LanguageCode[] = [
  "en",
  "zh-Hans",
  "fr",
  "es",
  "pt",
  "de",
  "ja",
  "ko",
  "ar",
  "hi",
  "it",
  "ru",
];
