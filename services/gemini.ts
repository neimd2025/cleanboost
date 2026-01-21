
import { GoogleGenAI, Type } from "@google/genai";
import { CleaningData, BossProfile, GeneratedContent } from "../types";

/**
 * 이미지를 1024px 이하로 리사이징하고 압축하여 API 페이로드 크기를 줄입니다.
 * 20장의 고해상도 사진이 전송될 때 발생하는 500 에러를 방지합니다.
 */
async function resizeImage(base64Str: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const MAX_WIDTH = 1024;
      const MAX_HEIGHT = 1024;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      // JPEG 0.7 품질로 압축하여 전송량 최소화
      resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
    };
  });
}

export const generateMarketingContent = async (data: CleaningData, profile: BossProfile): Promise<GeneratedContent> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
    throw new Error('API 키가 설정되지 않았습니다. .env.local 파일에 GEMINI_API_KEY를 설정해주세요.');
  }
  const ai = new GoogleGenAI({ apiKey });

  // 병렬로 모든 이미지 리사이징 처리
  const resizedImages = await Promise.all(
    data.photos.map(async (p, index) => {
      const base64Data = await resizeImage(p.url);
      return {
        text: `[사진 ${index}] 상태: ${p.status}`,
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg'
        }
      };
    })
  );

  const prompt = `
    당신은 청소 업체 사장님의 마음을 가장 잘 아는 전문 마케터입니다.
    사장님이 주신 ${data.photos.length}장의 사진을 분석해서, '현장의 생동감'이 살아있는 블로그 글을 쓰세요.

    [절대 규칙: 말투는 쉽게, 내용은 정직하게]
    1. 어려운 전문 용어는 최소화하고, 사장님이 옆에서 고객에게 설명해주듯 친근하게 쓰세요.
    2. "유기물 오염 고착" (X) -> "주방에 끈적하게 달라붙은 기름때" (O)
    3. "비누화 반응 유도" (X) -> "세제를 바르고 때가 충분히 녹을 때까지 기다렸어요" (O)
    4. 너무 과한 수식어보다는 "사진을 보세요, 진짜 깨끗해졌죠?" 같은 신뢰 위주로 쓰세요.

    [비포/애프터 자동 매칭 미션]
    - 사진들 중에서 같은 장소의 '전'과 '후' 사진을 찾아내어 반드시 '한 섹션'에 묶으세요.
    - 'imageIndices' 배열에 [전_사진번호, 후_사진번호] 순서로 넣으세요.
    - 고객이 보자마자 "우와!" 소리가 나오도록 전/후 비교 섹션을 3개 이상 만드세요.

    [본문 구성 가이드]
    - 도입: "오늘 이 집, 진짜 심각했습니다" 식의 생생한 현장 첫인상으로 시작.
    - 본론: 사진별로 어떤 부위를 어떻게 닦았는지, 사장님만의 꼼꼼함을 자랑하세요.
    - 결론: AS 보장과 함께 "언제든 편하게 물어보세요"라는 따뜻한 인사로 마무리.

    [현장 정보]
    - 위치: ${data.location} ${data.buildingName}
    - 서비스: ${data.serviceType}
    - 사장님 메모: ${data.notes}
    - 업체명: ${profile.companyName}

    반드시 JSON 형식으로만 응답하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { text: prompt },
            ...resizedImages.flatMap(img => [ { text: img.text }, { inlineData: img.inlineData } ])
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
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
                      sectionType: { type: Type.STRING, enum: ['diagnosis', 'process', 'result'] }
                    },
                    required: ["subtitle", "imageIndices", "body", "sectionType"]
                  }
                },
                outro: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["title", "intro", "sections", "outro", "tags"]
            }
          },
          required: ["blog"]
        }
      }
    });

    if (!response.text) throw new Error("AI 응답이 비어있습니다.");
    const parsed = JSON.parse(response.text.trim());
    
    // 사진 번호가 유효 범위를 벗어나지 않도록 보정
    if (parsed.blog && parsed.blog.sections) {
      parsed.blog.sections = parsed.blog.sections.map((s: any) => ({
        ...s,
        imageIndices: s.imageIndices
          .filter((idx: number) => idx >= 0 && idx < data.photos.length)
          .slice(0, 2) // 최대 2장(B/A)까지만 매칭
      }));
    }

    return parsed as GeneratedContent;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message?.includes('xhr error') || error.message?.includes('500')) {
      throw new Error("사진 데이터가 너무 커서 분석에 실패했습니다. 사진 크기를 줄이거나 개수를 조절해 보세요.");
    }
    throw new Error("AI 원고 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }
};
