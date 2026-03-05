import { GoogleGenAI, Type } from '@google/genai';
import { AnalysisResult, BlogResult, PhotoItem, SiteInfo } from '../types';

function parseJsonBody(body: unknown): { siteInfo: SiteInfo; photos: PhotoItem[]; analysis: AnalysisResult } {
  if (!body || typeof body !== 'object') {
    throw new Error('잘못된 요청 형식입니다.');
  }

  const casted = body as { siteInfo?: SiteInfo; photos?: PhotoItem[]; analysis?: AnalysisResult };
  if (!casted.siteInfo || !Array.isArray(casted.photos) || !casted.analysis) {
    throw new Error('siteInfo, photos, analysis가 필요합니다.');
  }

  return {
    siteInfo: casted.siteInfo,
    photos: casted.photos,
    analysis: casted.analysis,
  };
}

function sanitizeBlogResult(raw: any, photoCount: number): BlogResult {
  const blog = raw?.blog ?? {};
  const sections = Array.isArray(blog.sections) ? blog.sections : [];

  return {
    blog: {
      title: typeof blog.title === 'string' ? blog.title : '청소 현장 후기',
      intro: typeof blog.intro === 'string' ? blog.intro : '',
      sections: sections.map((section: any) => ({
        subtitle: typeof section?.subtitle === 'string' ? section.subtitle : '현장 기록',
        imageIndices: Array.isArray(section?.imageIndices)
          ? section.imageIndices.filter((idx: number) => Number.isInteger(idx) && idx >= 0 && idx < photoCount)
          : [],
        body: typeof section?.body === 'string' ? section.body : '',
        sectionType: section?.sectionType === 'diagnosis' || section?.sectionType === 'process' || section?.sectionType === 'result'
          ? section.sectionType
          : 'result',
      })),
      outro: typeof blog.outro === 'string' ? blog.outro : '',
      tags: Array.isArray(blog.tags) ? blog.tags.filter((tag: any) => typeof tag === 'string') : [],
    },
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' });
      return;
    }

    const { siteInfo, photos, analysis } = parseJsonBody(typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
너는 한국 청소 업체의 네이버 블로그 전문 마케터다.
아래 정보를 기반으로 SEO 친화적인 블로그 JSON을 생성해라.

[현장 정보]
- 지역: ${siteInfo.location}
- 건물명: ${siteInfo.buildingName}
- 서비스: ${siteInfo.serviceType}
- 메모: ${siteInfo.notes || '없음'}

[분석 결과]
${JSON.stringify(analysis, null, 2)}

[필수 규칙]
1) title, intro, sections, outro, tags 구조를 반드시 지켜라.
2) sections는 subtitle, imageIndices, body, sectionType을 포함한다.
3) sectionType은 diagnosis / process / result 중 하나만 사용한다.
4) imageIndices는 반드시 숫자 배열이고 전달된 사진 인덱스 범위 내에서만 사용한다.
5) SEO 키워드를 본문에 자연스럽게 녹여라: 지역명 + 서비스명 + 청소업체/아파트입주청소 계열.
6) 해시태그는 # 없이 단어만 배열로 출력한다.
7) 허위/과장 문구는 피하고 실제 현장 톤으로 작성한다.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            blog: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                intro: { type: Type.STRING },
                sections: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      subtitle: { type: Type.STRING },
                      imageIndices: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                      body: { type: Type.STRING },
                      sectionType: { type: Type.STRING, enum: ['diagnosis', 'process', 'result'] },
                    },
                    required: ['subtitle', 'imageIndices', 'body', 'sectionType'],
                  },
                },
                outro: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['title', 'intro', 'sections', 'outro', 'tags'],
            },
          },
          required: ['blog'],
        },
      },
    });

    if (!response.text) {
      throw new Error('AI 응답이 비어 있습니다.');
    }

    const parsed = JSON.parse(response.text);
    const sanitized = sanitizeBlogResult(parsed, photos.length);
    res.status(200).json(sanitized);
  } catch (error) {
    const message = error instanceof Error ? error.message : '블로그 생성에 실패했습니다.';
    res.status(500).json({ error: message });
  }
}
