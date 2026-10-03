// SnapLearn AI Engine — multimodal analysis with mock + real vision API support
// Set VISION_MOCK=0 and VISION_API_KEY to use a real vision model (OpenAI-compatible)

const MOCK = process.env.VISION_MOCK !== '0';

export interface AnalysisResult {
  topic: string;
  subject: string;
  explanation: { en: string; hi: string };
  keyPoints: string[];
  diagramLabels: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  backend: 'mock' | 'real';
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

// Realistic mock analysis — used when no API key (demo mode)
export function mockAnalyze(imageName: string, lang: string): AnalysisResult {
  const isHindi = lang === 'hi';
  return {
    topic: 'Photosynthesis — Light Reactions',
    subject: 'Biology (Class 10)',
    explanation: {
      en: 'This diagram shows the light-dependent reactions of photosynthesis taking place in the thylakoid membranes of chloroplasts. Light energy splits water molecules (photolysis), releasing oxygen as a byproduct. The energized electrons travel through an electron transport chain, pumping protons to create a gradient that powers ATP synthase — producing ATP and NADPH for the Calvin cycle.',
      hi: 'Ye diagram prakash-sanshleshan ki light reactions dikhata hai jo harit-lavak (chloroplast) ki thylakoid jhilli me hoti hain. Prakash urja paani ke anuon ko todti hai (photolysis), jisse oxygen nikalti hai. Urjavan electron, electron transport chain se guzarte hain aur proton gradient banate hain jo ATP synthase ko chalakar ATP aur NADPH banata hai.'
    },
    keyPoints: isHindi
      ? ['Photolysis: paani tootkar O2, H+ aur electron deta hai', 'Electron transport chain se ATP banta hai', 'NADPH Calvin cycle ke liye zaroori hai', 'Ye prakriya thylakoid jhilli me hoti hai']
      : ['Photolysis splits water into O2, H+ and electrons', 'Electron transport chain drives ATP synthesis', 'NADPH is produced for the Calvin cycle', 'Occurs in thylakoid membranes'],
    diagramLabels: ['Chloroplast', 'Thylakoid membrane', 'Photosystem II', 'Electron transport chain', 'ATP synthase', 'O2 released'],
    difficulty: 'medium',
    backend: 'mock'
  };
}

export function mockQuiz(lang: string): QuizQuestion[] {
  const isHindi = lang === 'hi';
  return [
    {
      question: isHindi ? 'Photolysis me paani tootne par kya-kya milta hai?' : 'What are the products of photolysis of water?',
      options: isHindi
        ? ['O2, H+ aur electron', 'CO2 aur glucose', 'ATP aur NADPH', 'Sirf oxygen']
        : ['O2, H+ and electrons', 'CO2 and glucose', 'ATP and NADPH', 'Oxygen only'],
      answer: 0,
      explanation: isHindi ? 'Photolysis me H2O tootkar O2, H+ ions aur electrons deta hai.' : 'Photolysis splits H2O into O2, H+ ions and electrons.'
    },
    {
      question: isHindi ? 'Light reactions kahan hoti hain?' : 'Where do the light reactions occur?',
      options: isHindi
        ? ['Thylakoid jhilli me', 'Stroma me', 'Mitochondria me', 'Nucleus me']
        : ['In thylakoid membranes', 'In the stroma', 'In mitochondria', 'In the nucleus'],
      answer: 0,
      explanation: isHindi ? 'Light reactions chloroplast ki thylakoid jhilli me hoti hain.' : 'Light reactions occur in the thylakoid membranes of chloroplasts.'
    },
    {
      question: isHindi ? 'ATP synthase ka kaam kya hai?' : 'What is the role of ATP synthase?',
      options: isHindi
        ? ['Proton gradient se ATP banana', 'Paani ko todna', 'CO2 ko fix karna', 'Oxygen chhodna']
        : ['Make ATP from proton gradient', 'Split water', 'Fix CO2', 'Release oxygen'],
      answer: 0,
      explanation: isHindi ? 'ATP synthase proton gradient ki urja se ADP + Pi se ATP banata hai.' : 'ATP synthase uses proton gradient energy to make ATP from ADP + Pi.'
    }
  ];
}

export function mockFlashcards(lang: string): Flashcard[] {
  const isHindi = lang === 'hi';
  return [
    { front: isHindi ? 'Photolysis kya hai?' : 'What is photolysis?', back: isHindi ? 'Prakash urja se paani ka tootna — O2, H+ aur electron milte hain' : 'Splitting of water by light energy — yields O2, H+ and electrons' },
    { front: 'ATP = ?', back: isHindi ? 'Adenosine Triphosphate — koshika ki urja mudra' : 'Adenosine Triphosphate — the energy currency of the cell' },
    { front: isHindi ? 'NADPH kahan kaam aata hai?' : 'Where is NADPH used?', back: isHindi ? 'Calvin cycle (dark reaction) me CO2 fix karne me' : 'In the Calvin cycle (dark reaction) to fix CO2' },
    { front: isHindi ? 'Chlorophyll ka rang?' : 'Color of chlorophyll?', back: isHindi ? 'Hara — laal aur neele prakash ko soakhta hai' : 'Green — absorbs red and blue light' }
  ];
}

export async function analyzeImage(imageBuffer: Buffer, fileName: string, lang: string): Promise<AnalysisResult> {
  if (MOCK) return mockAnalyze(fileName, lang);
  // Real vision API path (OpenAI-compatible, e.g. Nebius)
  const apiKey = process.env.VISION_API_KEY;
  const baseUrl = process.env.VISION_API_BASE || 'https://api.studio.nebius.ai/v1';
  const model = process.env.VISION_MODEL || 'Qwen/Qwen2.5-VL-72B-Instruct';
  const base64 = imageBuffer.toString('base64');
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: [
        { type: 'text', text: `Analyze this textbook image. Respond in JSON: {topic, subject, explanation_en, explanation_hi, keyPoints[4], diagramLabels[], difficulty}. Language preference: ${lang}` },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
      ]}],
      response_format: { type: 'json_object' }
    })
  });
  if (!resp.ok) throw new Error(`Vision API ${resp.status}`);
  const data = await resp.json() as any;
  const j = JSON.parse(data.choices[0].message.content);
  return {
    topic: j.topic, subject: j.subject,
    explanation: { en: j.explanation_en, hi: j.explanation_hi },
    keyPoints: j.keyPoints, diagramLabels: j.diagramLabels,
    difficulty: j.difficulty || 'medium', backend: 'real'
  };
}

export async function generateQuiz(topic: string, lang: string): Promise<QuizQuestion[]> {
  if (MOCK) return mockQuiz(lang);
  // Real path would call LLM — mock is the honest fallback
  return mockQuiz(lang);
}

export async function generateFlashcards(topic: string, lang: string): Promise<Flashcard[]> {
  if (MOCK) return mockFlashcards(lang);
  return mockFlashcards(lang);
}
