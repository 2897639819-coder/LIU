import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  Square, 
  RotateCcw, 
  RefreshCw, 
  Volume2, 
  Info,
  ChevronLeft,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';
import { fetchAIPassage, evaluateAudio, type EvaluationResult } from './lib/gemini';

type ViewState = 'HOME' | 'RECORDER' | 'RESULT';

function BrandingRail() {
  return (
    <aside className="branding-rail hidden lg:flex">
      <h1>琅琅测评</h1>
      <div className="tagline">AI 汉语朗诵测评系统</div>
    </aside>
  );
}

export default function App() {
  const [view, setView] = useState<ViewState>('HOME');
  const [passage, setPassage] = useState<string>('');
  const [isPassageLoading, setIsPassageLoading] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);

  // Transition Helpers
  const goToRecorder = async (newPassageRequested = true) => {
    if (newPassageRequested || !passage) {
      setIsPassageLoading(true);
      const p = await fetchAIPassage();
      setPassage(p);
      setIsPassageLoading(false);
    }
    setView('RECORDER');
  };

  const goToResult = (base64: string) => {
    setAudioBase64(base64);
    setView('RESULT');
  };

  const restartWithNewPassage = () => {
    setAudioBase64(null);
    goToRecorder(true);
  };

  const restartWithSamePassage = () => {
    setAudioBase64(null);
    setView('RECORDER');
  };

  return (
    <div className="min-h-screen relative overflow-hidden selection:bg-vermilion/20 selection:text-vermilion">
      <BrandingRail />
      
      {/* Decorative Seal */}
      <div className="fixed top-10 right-10 w-20 h-20 border-[3px] border-vermilion/60 rounded flex items-center justify-center rotate-[15deg] pointer-events-none z-50">
        <div className="border border-vermilion/40 p-1">
          <span className="font-kaiti text-vermilion text-2xl font-bold leading-tight">优选</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'HOME' && <HomeView key="home" onStart={() => goToRecorder(true)} />}
        {view === 'RECORDER' && (
          <RecorderView 
            key="recorder"
            passage={passage} 
            isLoading={isPassageLoading}
            onNewPassage={async () => {
              setIsPassageLoading(true);
              const p = await fetchAIPassage();
              setPassage(p);
              setIsPassageLoading(false);
            }}
            onFinish={goToResult} 
            onBack={() => setView('HOME')}
          />
        )}
        {view === 'RESULT' && (
          <ResultView 
            key="result"
            passage={passage}
            audioBase64={audioBase64!}
            onRetry={restartWithSamePassage}
            onNewPassage={restartWithNewPassage}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Views ---

function HomeView({ onStart, key }: { onStart: () => void | Promise<void>; key?: string }) {
  const title = "欢迎来到汉语朗诵测试";
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-screen p-6 ml-0 lg:ml-[120px]"
    >
      <div className="flex flex-row items-center justify-center gap-8 h-[60vh]">
        {title.split('').map((char, i) => (
          <motion.span 
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: i * 0.15 }}
            className={`font-kaiti text-5xl md:text-7xl ${char === '汉' ? 'mt-8' : ''} leading-none`}
            style={{ writingMode: 'vertical-rl' }}
          >
            {char}
          </motion.span>
        ))}
      </div>

      <motion.button
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 2.2 }}
        onClick={onStart}
        className="mt-16 group relative px-14 py-5 border-2 border-vermilion text-vermilion rounded-sm overflow-hidden transition-all hover:text-white"
      >
        <div className="absolute inset-0 bg-vermilion translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        <span className="relative z-10 font-kaiti text-3xl tracking-[0.5em] font-bold">开启</span>
      </motion.button>
    </motion.div>
  );
}

function RecorderView({ 
  passage, 
  isLoading, 
  onNewPassage, 
  onFinish, 
  onBack,
  key
}: { 
  passage: string;
  isLoading: boolean;
  onNewPassage: () => void;
  onFinish: (base64: string) => void;
  onBack: () => void;
  key?: string;
}) {
  const [status, setStatus] = useState<'idle' | 'countdown' | 'recording' | 'finished'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [permError, setPermError] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .catch((err) => {
        setPermError("无法访问麦克风，请检查浏览器权限。");
        console.error(err);
      });
  }, []);

  const startCountdown = () => {
    if (permError) return;
    setStatus('countdown');
    setCountdown(3);
    const interval = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          startRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorder.current = recorder;
      audioChunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        
        if (audioBlob.size < 1000) {
          alert("录音时长过短，请重新录制。");
          setStatus('idle');
          return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          onFinish(base64data);
        };
      };

      recorder.start();
      setStatus('recording');
    } catch (err) {
      setPermError("启动录音失败。");
      setStatus('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && status === 'recording') {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(t => t.stop());
      setStatus('finished');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="lg:ml-[120px] max-w-5xl mx-auto px-10 py-16 flex flex-col min-h-screen"
    >
      <div className="flex justify-between items-center mb-10">
        <button onClick={onBack} className="flex items-center gap-2 font-kaiti text-ink-muted hover:text-ink transition-colors">
          <ChevronLeft className="w-6 h-6" />
          <span>返回</span>
        </button>
        <button 
          onClick={onNewPassage} 
          disabled={isLoading || status !== 'idle'}
          className="btn-art flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? '寻觅中...' : '换一换'}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center">
        <motion.div 
          layout
          className="artistic-card w-full min-h-[350px] flex items-center justify-center"
        >
          <div className="absolute top-0 bottom-0 left-4 w-1 border-l-2 border-black/10" />
          <div className="absolute top-0 bottom-0 right-4 w-1 border-r-2 border-black/10" />
          
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center p-12"
              >
                <div className="flex flex-col items-center gap-4 text-ink-muted">
                  <Loader2 className="w-12 h-12 animate-spin" />
                  <p className="font-kaiti tracking-widest text-xl">正在研读经典...</p>
                </div>
              </motion.div>
            ) : (
              <motion.p 
                key="content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl md:text-3xl font-kaiti leading-[2] text-justify px-8"
              >
                {passage}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="w-full flex flex-col items-center gap-10 bg-white/20 p-12 backdrop-blur-sm rounded-lg border border-ink/5">
          {permError && (
            <div className="w-full bg-vermilion/10 text-vermilion p-4 rounded-sm flex items-center gap-3 animate-pulse border border-vermilion/20">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{permError}</p>
            </div>
          )}

          <div className="relative group">
            {status === 'idle' && (
              <button 
                onClick={startCountdown}
                disabled={isLoading || !!permError}
                className="w-24 h-24 bg-vermilion text-white rounded-full shadow-lg shadow-vermilion/20 flex items-center justify-center hover:scale-110 active:scale-95 transition-all disabled:grayscale disabled:opacity-50"
              >
                <Mic className="w-10 h-10" />
                <div className="absolute -inset-2 rounded-full border-2 border-vermilion opacity-0 group-hover:opacity-40 animate-ping" />
              </button>
            )}

            {status === 'recording' && (
              <button 
                onClick={stopRecording}
                className="w-24 h-24 bg-vermilion text-white rounded-full shadow-lg shadow-vermilion/20 flex items-center justify-center animate-pulse-red"
              >
                <Square className="w-10 h-10" />
              </button>
            )}

            {status === 'finished' && (
              <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-emerald-200">
                <Loader2 className="w-10 h-10 animate-spin" />
              </div>
            )}
          </div>

          <p className="font-kaiti text-2xl tracking-[0.3em] text-ink-muted transition-all">
            {status === 'idle' && '点击话筒 · 开启评测'}
            {status === 'recording' && '正在聆听 · 诵读中'}
            {status === 'finished' && '墨迹沉淀 · 评分中'}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {status === 'countdown' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-paper/95 backdrop-blur-xl flex items-center justify-center"
          >
            <motion.span 
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.8, opacity: 1 }}
              exit={{ scale: 2.5, opacity: 0 }}
              className="text-[160px] font-serif font-black text-vermilion"
            >
              {countdown}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ResultView({ 
  passage, 
  audioBase64, 
  onRetry, 
  onNewPassage,
  key
}: { 
  passage: string;
  audioBase64: string;
  onRetry: () => void;
  onNewPassage: () => void;
  key?: string;
}) {
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdvice, setShowAdvice] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  useEffect(() => {
    const evaluate = async () => {
      try {
        setError(null);
        const res = await evaluateAudio(audioBase64, passage);
        setEvaluation(res);
      } catch (err) {
        setError("AI 评测暂时开小差了，请重试。");
      }
    };
    evaluate();
  }, [audioBase64, passage]);

  const handleTTS = () => {
    if (isSynthesizing) return;
    
    setIsSynthesizing(true);
    const utterance = new SpeechSynthesisUtterance(passage);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => v.lang.startsWith('zh') && (v.name.includes('Female') || v.name.includes('XiaoXiao')));
    if (femaleVoice) utterance.voice = femaleVoice;

    utterance.onend = () => setIsSynthesizing(false);
    utterance.onerror = () => setIsSynthesizing(false);

    window.speechSynthesis.speak(utterance);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <AlertCircle className="w-16 h-16 text-vermilion mb-4" />
        <h2 className="text-2xl font-kaiti mb-4">{error}</h2>
        <button onClick={onRetry} className="px-8 py-3 bg-vermilion text-white rounded-full font-kaiti flex items-center gap-2">
          <RotateCcw className="w-5 h-5" /> 重新录制
        </button>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
          <div className="w-[500px] h-[500px] bg-ink rounded-full blur-[100px] animate-pulse" />
        </div>
        <div className="z-10 flex flex-col items-center gap-6">
          <Loader2 className="w-12 h-12 text-ink animate-spin" />
          <p className="font-kaiti text-2xl tracking-[0.2em] text-ink animate-pulse">AI 先生正在聆听...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="lg:ml-[120px] max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-16 p-10 py-16 min-h-screen"
    >
      {/* Main Content */}
      <div className="flex flex-col gap-12">
        <div className="artistic-card">
          <p className="text-2xl font-kaiti leading-loose text-justify text-ink/80">
            {passage}
          </p>
        </div>

        <div className="score-hero">
          <span className="val">{Math.round(evaluation.overall)}</span>
          <span className="label">分</span>
        </div>

        <div className="text-center font-kaiti text-ink-muted text-lg tracking-[0.2em]">
          评测完毕：情真意切 · 诵读有方
        </div>
      </div>

      {/* Sidebar Content */}
      <aside className="flex flex-col gap-12 border-l border-ink/10 pl-10 h-full">
        <div className="flex flex-col gap-8">
          {[
            { label: '流畅程度', value: evaluation.fluency },
            { label: '发音标准', value: evaluation.accuracy },
            { label: '吐字清晰', value: evaluation.clarity },
            { label: '情感饱满', value: evaluation.emotion },
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col gap-2">
              <div className="flex justify-between font-kaiti text-ink-muted text-sm tracking-widest uppercase">
                <span>{item.label}</span>
                <span className="font-serif font-bold text-ink">{item.value}</span>
              </div>
              <div className="h-[4px] bg-ink/10 w-full relative">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${item.value}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-vermilion absolute left-0 top-0"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="advice-card mt-4 flex-1">
          <h3 className="text-vermilion text-sm font-bold tracking-[0.2em] mb-4 uppercase">AI 专家建议</h3>
          <p className="font-kaiti text-base leading-relaxed text-[#4A443C]">
            {evaluation.advice}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-auto">
          <button onClick={handleTTS} className={`btn-art ${isSynthesizing ? 'bg-vermilion text-white' : ''}`}>听AI读</button>
          <button onClick={onRetry} className="btn-art">再试一次</button>
          <button onClick={onNewPassage} className="btn-art">换个段落</button>
          <button className="btn-art btn-art-primary">分享成绩</button>
        </div>
      </aside>
    </motion.div>
  );
}

function ActionButton({ icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="btn-art flex items-center gap-2"
    >
      <div className="text-xl">{icon}</div>
      <span className="font-kaiti">{label}</span>
    </button>
  );
}
