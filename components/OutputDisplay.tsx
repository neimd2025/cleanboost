
import React from 'react';
import { GeneratedContent, PhotoEntry } from '../types';

interface OutputDisplayProps {
  content: GeneratedContent;
  photos: PhotoEntry[];
}

export const OutputDisplay: React.FC<OutputDisplayProps> = ({ content, photos }) => {
  const copyToClipboard = () => {
    let text = `제목: ${content.blog.title}\n\n`;
    text += `${content.blog.intro}\n\n`;
    content.blog.sections.forEach((s) => {
      text += `[${s.subtitle}]\n${s.body}\n\n`;
    });
    text += `${content.blog.outro}\n\n`;
    text += `태그: ${content.blog.tags.map(t => `#${t}`).join(' ')}`;
    navigator.clipboard.writeText(text);
    alert('원고가 복사되었습니다!');
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
      <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white">
        <h3 className="text-sm font-bold tracking-tight">✨ AI가 작성한 블로그 원고</h3>
        <button onClick={copyToClipboard} className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md">
          원고 복사하기
        </button>
      </div>

      <div className="p-4 sm:p-8 bg-slate-50">
        <article className="max-w-2xl mx-auto bg-white p-6 sm:p-10 rounded-3xl shadow-sm border border-slate-100">
          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight text-center mb-8 border-b pb-6">
            {content.blog.title}
          </h2>

          {/* Intro */}
          <div className="text-lg font-medium text-slate-700 leading-relaxed mb-12 italic text-center">
            "{content.blog.intro}"
          </div>

          {/* Sections */}
          <div className="space-y-16">
            {content.blog.sections.map((section, idx) => (
              <div key={idx} className="space-y-6">
                <div className="flex items-center gap-2 border-l-4 border-blue-500 pl-3">
                  <h3 className="text-xl font-bold text-slate-900">
                    {section.subtitle}
                  </h3>
                </div>

                {/* Image Layout: Before/After Side by Side */}
                {section.imageIndices.length > 0 && (
                  <div className={`grid gap-2 ${section.imageIndices.length >= 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {section.imageIndices.map((imgIdx, i) => {
                      const photo = photos[imgIdx];
                      if (!photo) return null;
                      return (
                        <div key={imgIdx} className="relative rounded-xl overflow-hidden border border-slate-200 group">
                          <img src={photo.url} className="w-full h-40 sm:h-56 object-cover" alt="현장사진" />
                          <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-black uppercase text-white ${
                            photo.status === '전' ? 'bg-red-500' : photo.status === '후' ? 'bg-blue-500' : 'bg-slate-500'
                          }`}>
                            {photo.status === '전' ? 'BEFORE' : photo.status === '후' ? 'AFTER' : 'PROCESS'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-md">
                  {section.body}
                </p>
              </div>
            ))}
          </div>

          {/* Outro */}
          <div className="mt-16 p-8 bg-slate-50 border border-slate-100 rounded-3xl">
            <p className="leading-relaxed text-slate-800 font-medium mb-6">{content.blog.outro}</p>
            <div className="flex flex-wrap gap-2">
              {content.blog.tags.map(tag => (
                <span key={tag} className="text-blue-600 text-sm font-bold bg-blue-50 px-3 py-1 rounded-full">#{tag}</span>
              ))}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};
