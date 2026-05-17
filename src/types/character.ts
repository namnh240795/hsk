export interface Stroke {
  path: string;
  duration?: number;
}

export interface CharacterData {
  character: string;
  pinyin: string;
  meaning: string;
  vietnamese?: string;
  strokes: Stroke[];
}