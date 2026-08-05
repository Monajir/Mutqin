export interface HadithCollection {
  id: string;
  nameArabic: string;
  nameEnglish: string;
  source: string;
  license: string;
  hadithCount: number;
  bookCount: number;
}

export interface Hadith {
  id: string;
  collectionId: string;
  bookNumber: string | null;
  bookTitle: string | null;
  hadithNumber: string;
  reference: string;
  textArabic: string;
  textTranslation: string;
  narrator: string | null;
  grade: string | null;
  grader: string | null;
}

export interface DailyHadith {
  excerpt: string;
  source: string;
}

export interface DuaCategory {
  id: string;
  nameEnglish: string;
  nameArabic: string | null;
  duaCount: number;
}

export interface Dua {
  id: string;
  categoryId: string;
  categoryName: string;
  title: string;
  textArabic: string;
  transliteration: string | null;
  textTranslation: string;
  reference: string;
  repetitions: number;
}

export interface NameOfAllah {
  id: number;
  nameArabic: string;
  nameTransliteration: string;
  nameTranslation: string;
  explanation: string;
  evidenceJson: string | null;
}
