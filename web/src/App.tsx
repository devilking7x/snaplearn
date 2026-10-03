import { useEffect, useRef, useState } from 'react';

const API = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';

interface Analysis {
  topic: string; subject: string;
  explanation: { en: string; hi: string };
  keyPoints: string[]; diagramLabels: string[];
  difficulty: string; demo: boolean;
}
interface QuizQ { question: string; options: string[]; answer: number; explanation: string; }
interface Card { front: string; back: string; }

type View = 'home' | 'result' | 'quiz' | 'flash' | 'progress';

interface Progress { quizzes: number; totalScore: number; totalQ: number; topics: string[]; streak: number; lastDay: string; }

function loadProgress(): Progress {
  try { return JSON.parse(localStorage.getItem('snaplearn-progress') || '') as Progress; }
  catch { return { quizzes: 0, totalScore: 0, totalQ: 0, topics: [], streak: 0, lastDay: '' }; }
}
function saveProgress(p: Progress) { localStorage.setItem('snaplearn-progress', JSON.stringify(p)); }

export default function App() {
  const [view, setView] = useState<View>('home');
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [quiz, setQuiz] = useState<QuizQ[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [qi, setQi] = useState(0); const [picked, setPicked] = useState<number | null>(null); const [score, setScore] = useState(0);
  const [ci, setCi] = useState(0); const [flipped, setFlipped] = useState(false);
  const [question, setQuestion] = useState(''); const [answer, setAnswer] = useState(''); const [asking, setAsking] = useState(false);
  const [listening, setListening] = useState(false);
  const [difficulty, setDifficulty] = useState<'eli5' | 'class' | 'advanced'>('class');
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const t = (en: string, hi: string) => (lang === 'hi' ? hi : en);

  async function handleFile(f: File) {
    setLoading(true);
    setPreview(URL.createObjectURL(f));
    const fd = new FormData();
    fd.append('image', f); fd.append('lang', lang); fd.append('difficulty', difficulty);
    try {
      const r = await fetch(`${API}/api/analyze`, { method: 'POST', body: fd });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      setAnalysis(data); setView('result');
    } catch (e: any) {
      alert(t('Analysis failed: ', 'Analysis fail hua: ') + e.message);
    } finally { setLoading(false); }
  }

  async function startQuiz() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/quiz`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: analysis?.topic, lang }) });
      const d = await r.json(); setQuiz(d.quiz); setQi(0); setPicked(null); setScore(0); setView('quiz');
    } catch { alert(t('Quiz failed', 'Quiz fail hua')); }
    finally { setLoading(false); }
  }

  async function startFlash() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/flashcards`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: analysis?.topic, lang }) });
      const d = await r.json(); setCards(d.cards); setCi(0); setFlipped(false); setView('flash');
    } catch { alert(t('Flashcards failed', 'Flashcards fail hue')); }
    finally { setLoading(false); }
  }

  async function askQ(q?: string) {
    const qq = (q ?? question).trim();
    if (!qq) return;
    setAsking(true);
    try {
      const r = await fetch(`${API}/api/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: qq, topic: analysis?.topic, lang }) });
      const d = await r.json(); setAnswer(d.answer); setQuestion('');
    } catch { setAnswer(t('Sorry, Q&A failed.', 'Maaf karo, jawab nahi mil paya.')); }
    finally { setAsking(false); }
  }

  function startVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert(t('Voice not supported in this browser. Try Chrome.', 'Is browser me voice support nahi hai. Chrome try karo.')); return; }
    const rec = new SR();
    rec.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    rec.onresult = (e: any) => { const txt = e.results[0][0].transcript; setQuestion(txt); askQ(txt); };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true); rec.start();
  }

  function speak(text: string) {
    const u = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ''));
    u.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    speechSynthesis.speak(u);
  }

  function recordQuizResult(finalScore: number, total: number) {
    const p = loadProgress();
    const today = new Date().toDateString();
    p.quizzes += 1; p.totalScore += finalScore; p.totalQ += total;
    if (analysis && !p.topics.includes(analysis.topic)) p.topics.push(analysis.topic);
    p.streak = p.lastDay === today ? p.streak : (p.lastDay === new Date(Date.now() - 864e5).toDateString() ? p.streak + 1 : 1);
    p.lastDay = today;
    saveProgress(p); setProgress(p);
  }

  function exportNotes() {
    if (!analysis) return;
    const md = `# ${analysis.topic}\n\n**${analysis.subject}** | Difficulty: ${analysis.difficulty}\n\n## Explanation\n${lang === 'hi' ? analysis.explanation.hi : analysis.explanation.en}\n\n## Key Points\n${analysis.keyPoints.map(k => `- ${k}`).join('\n')}\n\n## Diagram Labels\n${analysis.diagramLabels.map(l => `- ${l}`).join('\n')}\n\n---\n_Generated by SnapLearn 📸_\n`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `snaplearn-${analysis.topic.replace(/\W+/g, '-').toLowerCase()}.md`;
    a.click();
  }

  function difficultyLabel(d: string) {
    return d === 'eli5' ? t('🧒 Simple', '🧒 Saral') : d === 'advanced' ? t('🎓 Advanced', '🎓 Advanced') : t('📚 Class level', '📚 Class level');
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-plum/20">
        <button onClick={() => setView('home')} className="text-2xl font-bold bg-gradient-to-r from-plum to-blush bg-clip-text text-transparent">📸 SnapLearn</button>
        <div className="flex gap-2 items-center">
          <button onClick={() => setView('progress')} className="chip" title={t('My progress', 'Meri progress')}>📊 {progress.streak > 0 ? `🔥${progress.streak}` : ''}</button>
          <button onClick={() => setLang('en')} className={lang === 'en' ? 'chip !bg-plum !text-white' : 'chip'}>English</button>
          <button onClick={() => setLang('hi')} className={lang === 'hi' ? 'chip !bg-plum !text-white' : 'chip'}>हिंदी</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {view === 'home' && (
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4">{t('Snap a textbook. Learn it instantly.', 'Textbook ki photo lo. Turant seekho.')}</h1>
            <p className="text-white/60 text-lg mb-8 max-w-2xl mx-auto">{t('Upload a photo of any diagram or page — SnapLearn explains it, quizzes you, and makes flashcards. In English or Hindi. With your voice.', 'Kisi bhi diagram ya page ki photo upload karo — SnapLearn samjhayega, quiz lega, flashcards banayega. English ya Hindi me. Aapki awaaz ke saath.')}</p>
            <div className="flex gap-2 justify-center mb-8 flex-wrap">
              <span className="chip">🖼️ Image AI</span><span className="chip">🗣️ Voice Q&A</span><span className="chip">📝 Quiz Agent</span><span className="chip">🃏 Flashcards</span><span className="chip">🇮🇳 Hindi + English</span>
            </div>
            <div className="flex gap-3 justify-center mb-6 flex-wrap">
              <span className="text-white/50 text-sm self-center">{t('Level:', 'Level:')}</span>
              {(['eli5', 'class', 'advanced'] as const).map(d => (
                <button key={d} onClick={() => setDifficulty(d)} className={difficulty === d ? 'chip !bg-plum !text-white' : 'chip'}>{difficultyLabel(d)}</button>
              ))}
            </div>
            <div className="flex gap-4 justify-center flex-wrap max-w-xl mx-auto">
              <div onClick={() => fileRef.current?.click()}
                className="card border-dashed !border-plum/50 cursor-pointer hover:bg-plum/10 transition flex-1 min-w-60">
                {loading ? <p className="text-xl">⏳ {t('Analyzing...', 'Analyze ho raha hai...')}</p> :
                  <><p className="text-5xl mb-3">📁</p>
                  <p className="font-semibold">{t('Upload photo', 'Photo upload karo')}</p>
                  <p className="text-white/50 mt-1 text-sm">JPG / PNG</p></>}
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>
              <div onClick={() => cameraRef.current?.click()}
                className="card border-dashed !border-blush/50 cursor-pointer hover:bg-blush/10 transition flex-1 min-w-60">
                <p className="text-5xl mb-3">📷</p>
                <p className="font-semibold">{t('Snap with camera', 'Camera se lo')}</p>
                <p className="text-white/50 mt-1 text-sm">{t('Mobile friendly', 'Mobile pe best')}</p>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>
            </div>
          </div>
        )}

        {view === 'result' && analysis && (
          <div>
            <button onClick={() => setView('home')} className="btn-ghost mb-6 text-sm">← {t('New photo', 'Nayi photo')}</button>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <img src={preview} alt="uploaded" className="rounded-2xl border border-plum/20 max-h-80 object-contain w-full bg-black/30" />
              <div className="card">
                <div className="flex gap-2 mb-3 flex-wrap">
                  <span className="chip">{analysis.subject}</span>
                  <span className="chip">{analysis.difficulty}</span>
                  {analysis.demo && <span className="chip !bg-amber-500/20 !text-amber-200">DEMO MODE</span>}
                </div>
                <h2 className="text-2xl font-bold mb-3">{analysis.topic}</h2>
                <p className="text-white/80 leading-relaxed">{lang === 'hi' ? analysis.explanation.hi : analysis.explanation.en}</p>
                <button onClick={() => speak(lang === 'hi' ? analysis.explanation.hi : analysis.explanation.en)} className="btn-ghost mt-4 text-sm">🔊 {t('Listen', 'Suno')}</button>
              </div>
            </div>

            <div className="card mb-6">
              <h3 className="font-bold text-lg mb-3">⭐ {t('Key points', 'Mukhya baatein')}</h3>
              <ul className="space-y-2">{analysis.keyPoints.map((k, i) => <li key={i} className="text-white/80">• {k}</li>)}</ul>
            </div>

            <div className="card mb-6">
              <h3 className="font-bold text-lg mb-3">🏷️ {t('Diagram labels spotted', 'Diagram me pehchane gaye parts')}</h3>
              <div className="flex flex-wrap gap-2">{analysis.diagramLabels.map((l, i) => <span key={i} className="chip">{l}</span>)}</div>
            </div>

            <div className="flex gap-4 mb-8 flex-wrap">
              <button onClick={startQuiz} className="btn-primary" disabled={loading}>{t('📝 Take Quiz', '📝 Quiz do')}</button>
              <button onClick={startFlash} className="btn-ghost" disabled={loading}>{t('🃏 Flashcards', '🃏 Flashcards')}</button>
              <button onClick={exportNotes} className="btn-ghost">📥 {t('Export notes', 'Notes download')}</button>
            </div>

            <div className="card">
              <h3 className="font-bold text-lg mb-3">💬 {t('Ask about this image', 'Is image ke baare me pucho')}</h3>
              <div className="flex gap-2 mb-4">
                <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && askQ()}
                  placeholder={t('Type your question...', 'Apna sawal likho...')}
                  className="flex-1 bg-black/40 border border-plum/30 rounded-xl px-4 py-3 outline-none focus:border-plum" />
                <button onClick={() => startVoice()} className={`btn-ghost ${listening ? '!bg-red-500/30' : ''}`} title="Voice input">{listening ? '🔴' : '🎤'}</button>
                <button onClick={() => askQ()} className="btn-primary" disabled={asking}>{asking ? '...' : t('Ask', 'Pucho')}</button>
              </div>
              {answer && <div className="bg-black/30 rounded-xl p-4 text-white/85 whitespace-pre-wrap">{answer}</div>}
            </div>
          </div>
        )}

        {view === 'quiz' && quiz.length > 0 && (
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <span className="chip">Q {qi + 1} / {quiz.length}</span>
              <span className="chip">⭐ {score}</span>
            </div>
            {qi < quiz.length ? (
              <div className="card">
                <h3 className="text-xl font-semibold mb-6">{quiz[qi].question}</h3>
                <div className="space-y-3">
                  {quiz[qi].options.map((o, i) => (
                    <button key={i} disabled={picked !== null} onClick={() => { setPicked(i); if (i === quiz[qi].answer) setScore(s => s + 1); }}
                      className={`w-full text-left px-5 py-4 rounded-xl border transition ${picked === null ? 'border-plum/30 hover:bg-plum/10' : i === quiz[qi].answer ? '!border-green-400 bg-green-400/10' : i === picked ? '!border-red-400 bg-red-400/10' : 'border-plum/20 opacity-60'}`}>
                      {o}
                    </button>
                  ))}
                </div>
                {picked !== null && (
                  <div className="mt-6">
                    <p className="text-white/70 mb-4">💡 {quiz[qi].explanation}</p>
                    <button onClick={() => { setQi(q => q + 1); setPicked(null); }} className="btn-primary">{t('Next', 'Aage')}</button>
                  </div>
                )}
              </div>
            ) : (
              <QuizResult score={score} total={quiz.length} t={t}
                onDone={() => recordQuizResult(score, quiz.length)}
                onBack={() => setView('result')} onFlash={startFlash} />
            )}
          </div>
        )}

        {view === 'flash' && cards.length > 0 && (
          <div className="max-w-xl mx-auto text-center">
            <p className="chip mb-6 inline-block">{ci + 1} / {cards.length}</p>
            <div onClick={() => setFlipped(f => !f)} className="card min-h-64 flex items-center justify-center cursor-pointer hover:bg-plum/10 transition mb-6">
              <p className="text-2xl font-semibold">{flipped ? cards[ci].back : cards[ci].front}</p>
            </div>
            <p className="text-white/40 text-sm mb-6">{t('Tap card to flip', 'Palatne ke liye tap karo')}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setCi(c => Math.max(0, c - 1)); setFlipped(false); }} className="btn-ghost" disabled={ci === 0}>←</button>
              <button onClick={() => speak(flipped ? cards[ci].back : cards[ci].front)} className="btn-ghost">🔊</button>
              <button onClick={() => { setCi(c => Math.min(cards.length - 1, c + 1)); setFlipped(false); }} className="btn-ghost" disabled={ci === cards.length - 1}>→</button>
            </div>
            <button onClick={() => setView('result')} className="btn-ghost mt-8 text-sm">{t('Back to analysis', 'Analysis pe wapas')}</button>
          </div>
        )}
        {view === 'progress' && (
          <div className="max-w-2xl mx-auto">
            <button onClick={() => setView('home')} className="btn-ghost mb-6 text-sm">← {t('Home', 'Home')}</button>
            <h2 className="text-3xl font-bold mb-6">📊 {t('My Progress', 'Meri Progress')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="card text-center"><p className="text-3xl font-bold text-blush">🔥{progress.streak}</p><p className="text-white/60 text-sm">{t('Day streak', 'Din ki streak')}</p></div>
              <div className="card text-center"><p className="text-3xl font-bold text-plum">{progress.quizzes}</p><p className="text-white/60 text-sm">{t('Quizzes', 'Quiz')}</p></div>
              <div className="card text-center"><p className="text-3xl font-bold text-green-400">{progress.totalQ ? Math.round(progress.totalScore / progress.totalQ * 100) : 0}%</p><p className="text-white/60 text-sm">{t('Avg score', 'Avg score')}</p></div>
              <div className="card text-center"><p className="text-3xl font-bold text-amber-300">{progress.topics.length}</p><p className="text-white/60 text-sm">{t('Topics', 'Topics')}</p></div>
            </div>
            {progress.topics.length > 0 && (
              <div className="card">
                <h3 className="font-bold mb-3">{t('Topics mastered', 'Seekhe hue topics')}</h3>
                <div className="flex flex-wrap gap-2">{progress.topics.map((tp, i) => <span key={i} className="chip">{tp}</span>)}</div>
              </div>
            )}
            {progress.quizzes === 0 && <p className="text-white/50 text-center">{t('Take your first quiz to start tracking!', 'Pehla quiz do aur tracking shuru karo!')}</p>}
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-white/30 text-sm border-t border-plum/10">
        SnapLearn — Multimodal AI Hackathon 2026 • Built with ❤️ by Raza7x
      </footer>
    </div>
  );
}

function QuizResult({ score, total, t, onDone, onBack, onFlash }: any) {
  const done = useRef(false);
  useEffect(() => { if (!done.current) { done.current = true; onDone(); } }, []);
  return (
    <div className="card text-center">
      <p className="text-6xl mb-4">{score === total ? '🏆' : score >= total / 2 ? '🎉' : '📚'}</p>
      <h3 className="text-2xl font-bold mb-2">{t('Score', 'Score')}: {score}/{total}</h3>
      <p className="text-white/60 mb-6">{score === total ? t('Perfect! You mastered this topic.', 'Perfect! Ye topic pakka ho gaya.') : t('Good effort! Review the flashcards and try again.', 'Achhi koshish! Flashcards dekho aur phir try karo.')}</p>
      <div className="flex gap-3 justify-center">
        <button onClick={onBack} className="btn-ghost">{t('Back to analysis', 'Analysis pe wapas')}</button>
        <button onClick={onFlash} className="btn-primary">{t('Revise flashcards', 'Flashcards revise karo')}</button>
      </div>
    </div>
  );
}
