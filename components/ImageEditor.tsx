
import React, { useRef, useEffect, useState } from 'react';

interface ImageEditorProps {
  before: string | null;
  after: string | null;
  companyName: string;
  onExport: (dataUrl: string) => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ before, after, companyName, onExport }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!before || !after) return;
    drawCanvas();
  }, [before, after, companyName]);

  const drawCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsProcessing(true);
    
    const imgBefore = new Image();
    const imgAfter = new Image();
    
    imgBefore.src = before!;
    imgAfter.src = after!;

    await Promise.all([
      new Promise(res => imgBefore.onload = res),
      new Promise(res => imgAfter.onload = res)
    ]);

    // Set canvas size (1200x600 for side by side)
    canvas.width = 1200;
    canvas.height = 600;

    // Draw images
    ctx.drawImage(imgBefore, 0, 0, 600, 600);
    ctx.drawImage(imgAfter, 600, 0, 600, 600);

    // Draw overlay bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(598, 0, 4, 600);

    // Labels
    ctx.font = 'bold 32px Pretendard';
    ctx.textAlign = 'center';
    
    // Label backgrounds
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(20, 20, 150, 50);
    ctx.fillRect(620, 20, 150, 50);

    ctx.fillStyle = 'white';
    ctx.fillText('BEFORE', 95, 55);
    ctx.fillText('AFTER', 695, 55);

    // Watermark
    ctx.font = '24px Pretendard';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`CleanBoost | ${companyName}`, 1180, 580);

    onExport(canvas.toDataURL('image/jpeg', 0.9));
    setIsProcessing(false);
  };

  if (!before || !after) {
    return (
      <div className="aspect-video bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 italic">
        두 장의 사진을 모두 업로드하면 합성이 시작됩니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
        <canvas ref={canvasRef} className="w-full h-auto" />
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
            이미지 처리 중...
          </div>
        )}
      </div>
      <div className="flex justify-center">
        <button 
          onClick={() => {
            const link = document.createElement('a');
            link.download = `CleanBoost_${companyName}_BA.jpg`;
            link.href = canvasRef.current?.toDataURL('image/jpeg') || '';
            link.click();
          }}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          합성 이미지 다운로드
        </button>
      </div>
    </div>
  );
};
