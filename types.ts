export type PhotoStatus = 'before' | 'after' | 'process';
export type LegacyPhotoStatus = '전' | '후' | '과정';

export type SpaceType = '주방' | '화장실' | '거실' | '방' | '베란다' | '현관' | '방/거실' | '기타';

export interface SiteInfo {
  location: string;
  buildingName: string;
  serviceType: string;
  notes: string;
}

export interface PhotoItem {
  id: string;
  name: string;
  dataUrl: string;
  status: PhotoStatus;
  space?: SpaceType;
  confidence?: number;
}

export interface SpacePhotoGroup {
  space: SpaceType;
  imageIndices: number[];
  beforeAfterPairs: [number, number][];
  processIndices: number[];
}

export interface PhotoClassification {
  index: number;
  space: SpaceType;
  confidence: number;
}

export interface AnalysisResult {
  photos: PhotoClassification[];
  groups: SpacePhotoGroup[];
}

export interface BlogSection {
  subtitle: string;
  imageIndices: number[];
  body: string;
  sectionType: 'diagnosis' | 'process' | 'result';
}

export interface BlogContent {
  title: string;
  intro: string;
  sections: BlogSection[];
  outro: string;
  tags: string[];
}

export interface BlogResult {
  blog: BlogContent;
}

// Legacy types kept for compatibility with existing files.
export interface BossProfile {
  companyName: string;
  experience: string;
  values: string;
  contact: string;
}

export interface PhotoEntry {
  id: string;
  url: string;
  status: LegacyPhotoStatus;
}

export interface CleaningData {
  location: string;
  buildingName: string;
  serviceType: string;
  notes: string;
  photos: PhotoEntry[];
}

export interface GeneratedContent {
  blog: BlogContent;
}
