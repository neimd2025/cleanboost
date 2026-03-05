import { AnalysisResult, PhotoItem, SpacePhotoGroup, SpaceType } from '../types';

const ORDERED_SPACES: SpaceType[] = ['주방', '화장실', '거실', '방', '베란다', '현관', '방/거실', '기타'];

function pairBeforeAfter(indices: number[], photos: PhotoItem[]): [number, number][] {
  const befores = indices.filter((idx) => photos[idx]?.status === 'before');
  const afters = indices.filter((idx) => photos[idx]?.status === 'after');
  const pairCount = Math.min(befores.length, afters.length);
  const pairs: [number, number][] = [];

  for (let i = 0; i < pairCount; i += 1) {
    pairs.push([befores[i], afters[i]]);
  }

  return pairs;
}

export function buildGroups(photos: PhotoItem[], spacesByIndex: SpaceType[]): SpacePhotoGroup[] {
  const grouped = new Map<SpaceType, number[]>();

  spacesByIndex.forEach((space, idx) => {
    if (!grouped.has(space)) {
      grouped.set(space, []);
    }
    grouped.get(space)?.push(idx);
  });

  return ORDERED_SPACES
    .filter((space) => grouped.has(space))
    .map((space) => {
      const imageIndices = grouped.get(space) ?? [];
      const processIndices = imageIndices.filter((idx) => photos[idx]?.status === 'process');
      return {
        space,
        imageIndices,
        beforeAfterPairs: pairBeforeAfter(imageIndices, photos),
        processIndices,
      };
    });
}

export function mergeAnalysisWithPhotos(photos: PhotoItem[], analysis: AnalysisResult): PhotoItem[] {
  const byIndex = new Map<number, { space: SpaceType; confidence: number }>();
  analysis.photos.forEach((item) => {
    byIndex.set(item.index, { space: item.space, confidence: item.confidence });
  });

  return photos.map((photo, idx) => {
    const found = byIndex.get(idx);
    if (!found) {
      return photo;
    }

    return {
      ...photo,
      space: found.space,
      confidence: found.confidence,
    };
  });
}
