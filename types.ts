
export interface BossProfile {
  companyName: string;
  experience: string;
  values: string;
  contact: string;
}

export interface PhotoEntry {
  id: string;
  url: string;
  status: '전' | '후' | '과정';
}

export interface CleaningData {
  location: string;
  buildingName: string;
  serviceType: string;
  notes: string;
  photos: PhotoEntry[];
}

export interface BlogSection {
  subtitle: string;
  imageIndices: number[]; // AI가 선택한 사진들의 인덱스 (1개면 단독, 2개면 B/A 매칭)
  body: string;
  sectionType: 'diagnosis' | 'process' | 'result'; // 백서 단계 구분
}

export interface GeneratedContent {
  blog: {
    title: string;
    intro: string;
    sections: BlogSection[];
    outro: string;
    tags: string[];
  };
}
