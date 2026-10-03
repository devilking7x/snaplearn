# 📸 SnapLearn — Multimodal AI Study Buddy

**Snap a textbook photo → AI explains it, quizzes you, makes flashcards.**

Built for the **Multimodal AI Hackathon 2026** (Education track) — organized by KamandPrompt (IIT Mandi), Augli.ai, PurpleRain Tech, LDV Labs.

## 🌟 What it does

Upload a photo of any textbook diagram or page. SnapLearn's multimodal AI:
1. 🖼️ **Analyzes the image** — identifies topic, subject, diagram labels
2. 📖 **Explains simply** — in English or Hindi, with voice readout
3. 📝 **Generates a quiz** — interactive MCQ test with explanations
4. 🃏 **Creates flashcards** — tap-to-flip revision cards
5. 💬 **Answers questions** — type or **speak** your question (voice input!)

## 🛠️ Tech

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Express + TypeScript (OpenAI-compatible vision API)
- **Multimodal:** Image in → text/voice out; voice in → text out
- **Voice:** Web Speech API (free, no key needed)
- **AI:** Mock engine for demo; plug any OpenAI-compatible vision model via `VISION_API_KEY`

## 🚀 Run locally

```bash
npm run install:all
# Terminal 1: backend
cd server && PORT=3001 npm start
# Terminal 2: frontend
cd web && VITE_API_URL=http://localhost:3001 npm run dev
```

## 🔑 Real AI mode

Set in `server` environment:
```
VISION_MOCK=0
VISION_API_KEY=your-key
VISION_API_BASE=https://api.studio.nebius.ai/v1   # or any OpenAI-compatible endpoint
VISION_MODEL=Qwen/Qwen2.5-VL-72B-Instruct
```

## 🤖 AI assistance disclosure

Per hackathon rules: this project was built with AI assistance (Muse). All code was reviewed and tested by the developer, who can explain every part.

## 📄 License

MIT
