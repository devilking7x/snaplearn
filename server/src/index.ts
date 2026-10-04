import cors from 'cors';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeImage, generateFlashcards, generateQuiz } from './ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

const MOCK = process.env.VISION_MOCK !== '0';

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, backend: MOCK ? 'mock' : 'real', service: 'snaplearn' });
});

// POST /api/analyze — multipart form: image file, lang (en|hi), difficulty (eli5|class|advanced)
app.post('/api/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const lang = req.body.lang === 'hi' ? 'hi' : 'en';
    const difficulty = ['eli5', 'class', 'advanced'].includes(req.body.difficulty) ? req.body.difficulty : 'class';
    const result = await analyzeImage(req.file.buffer, req.file.originalname, lang, difficulty);
    res.json({ ...result, demo: MOCK });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Analysis failed' });
  }
});

// POST /api/quiz — { topic, lang }
app.post('/api/quiz', async (req, res) => {
  try {
    const lang = req.body.lang === 'hi' ? 'hi' : 'en';
    const topic = String(req.body.topic || 'general');
    const quiz = await generateQuiz(topic, lang);
    res.json({ quiz, demo: MOCK });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Quiz generation failed' });
  }
});

// POST /api/flashcards — { topic, lang }
app.post('/api/flashcards', async (req, res) => {
  try {
    const lang = req.body.lang === 'hi' ? 'hi' : 'en';
    const topic = String(req.body.topic || 'general');
    const cards = await generateFlashcards(topic, lang);
    res.json({ cards, demo: MOCK });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Flashcard generation failed' });
  }
});

// POST /api/ask — { question, topic, lang } — follow-up Q&A about the image
app.post('/api/ask', async (req, res) => {
  try {
    const lang = req.body.lang === 'hi' ? 'hi' : 'en';
    const question = String(req.body.question || '').slice(0, 500);
    const topic = String(req.body.topic || 'the diagram');
    if (!question) return res.status(400).json({ error: 'No question' });
    const answer = MOCK
      ? (lang === 'hi'
        ? `**${topic}** ke baare me aapka sawal: "${question}"\n\nDemo mode me main iska jawab de raha hun: Light reactions me prakash urja paani ko todti hai (photolysis), jisse ATP aur NADPH bante hain jo Calvin cycle me kaam aate hain. Real AI key lagne par main kisi bhi diagram ka vistaar se jawab dunga!`
        : `Your question about **${topic}**: "${question}"\n\nDemo mode answer: In the light reactions, light energy splits water (photolysis), producing ATP and NADPH which power the Calvin cycle. Connect a real AI key and I'll answer any question about any diagram in detail!`)
      : 'Real backend not implemented in this build';
    res.json({ answer, demo: MOCK });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Q&A failed' });
  }
});

const PORT = Number(process.env.PORT || 3001);

// Serve frontend static files in production (web/dist)
const distDir = path.resolve(__dirname, '../../web/dist');
app.use(express.static(distDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, () => console.log(`SnapLearn server on :${PORT} (mock=${MOCK})`));
