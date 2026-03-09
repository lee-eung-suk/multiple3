/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dices, Sparkles, Check, X, Volume2, VolumeX } from 'lucide-react';

// --- Sound Utility using Web Audio API ---
const SoundManager = {
  ctx: null as AudioContext | null,
  
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  },

  playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0) {
    if (!this.ctx) this.init();
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration);
  },

  playRoll() {
    // Rapid clicking sound
    for (let i = 0; i < 5; i++) {
      this.playTone(200 + Math.random() * 100, 'square', 0.05, i * 0.08);
    }
  },

  playCorrect() {
    // Major arpeggio (C5, E5, G5)
    this.playTone(523.25, 'sine', 0.2, 0);
    this.playTone(659.25, 'sine', 0.2, 0.1);
    this.playTone(783.99, 'sine', 0.4, 0.2);
  },

  playWrong() {
    // Low buzz
    this.playTone(150, 'sawtooth', 0.3, 0);
    this.playTone(130, 'sawtooth', 0.3, 0.1);
  }
};

export default function App() {
  const [leftNum, setLeftNum] = useState<number>(123);
  const [rightNum, setRightNum] = useState<number>(20);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  
  // Answer checking state
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const generateProblem = () => {
    let A, B, C, D, E;
    let valid = false;
    let attempts = 0;
    
    while (!valid && attempts < 1000) {
      attempts++;
      // Bias towards smaller numbers to increase probability of no-carry
      // A, D must be at least 1
      A = Math.floor(Math.random() * 4) + 1; // 1-4
      B = Math.floor(Math.random() * 5);     // 0-4
      C = Math.floor(Math.random() * 5);     // 0-4
      
      D = Math.floor(Math.random() * 4) + 1; // 1-4
      E = Math.floor(Math.random() * 4) + 1; // 1-4 (Avoid 0 to ensure "몇십 몇")

      // Check partial products (digit-wise multiplication)
      if (A * D >= 10) continue;
      if (B * D >= 10) continue;
      if (C * D >= 10) continue;
      
      if (A * E >= 10) continue;
      if (B * E >= 10) continue;
      if (C * E >= 10) continue;

      // Check addition of partial products
      // Columns must sum to < 10
      
      // Tens column: (B*E) + (C*D)
      if ((B * E) + (C * D) >= 10) continue;
      
      // Hundreds column: (A*E) + (B*D)
      if ((A * E) + (B * D) >= 10) continue;
      
      valid = true;
    }
    
    // Fallback
    if (!valid) {
        A=1; B=2; C=1; D=1; E=2;
    }

    const newLeft = A! * 100 + B! * 10 + C!;
    const newRight = D! * 10 + E!;

    return { left: newLeft, right: newRight };
  };

  const handleRoll = (e?: React.MouseEvent) => {
    // Prevent roll if clicking input or button
    if ((e?.target as HTMLElement).closest('.interactive-area')) return;
    if (isRolling) return;
    
    if (soundEnabled) SoundManager.playRoll();
    
    setIsRolling(true);
    setFeedback('idle');
    setUserAnswer('');
    
    // Animation duration: 0.6s
    setTimeout(() => {
      const { left, right } = generateProblem();
      setLeftNum(left);
      setRightNum(right);
      setIsRolling(false);
      // Focus input after roll
      setTimeout(() => inputRef.current?.focus(), 100);
    }, 600);
  };

  const checkAnswer = () => {
    if (!userAnswer) return;
    
    const correctAnswer = leftNum * rightNum;
    const userVal = parseInt(userAnswer, 10);

    if (userVal === correctAnswer) {
      setFeedback('correct');
      if (soundEnabled) SoundManager.playCorrect();
    } else {
      setFeedback('wrong');
      if (soundEnabled) SoundManager.playWrong();
      // Shake animation trigger could go here
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      checkAnswer();
    }
  };

  // Initial roll on mount
  useEffect(() => {
    const { left, right } = generateProblem();
    setLeftNum(left);
    setRightNum(right);
  }, []);

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex flex-col items-center py-6 px-4 cursor-pointer select-none overflow-x-hidden overflow-y-auto"
      onClick={handleRoll}
    >
      {/* Sound Toggle */}
      <button 
        className="fixed top-4 right-4 p-2 bg-white/50 rounded-full hover:bg-white/80 transition-colors interactive-area z-50"
        onClick={() => setSoundEnabled(!soundEnabled)}
      >
        {soundEnabled ? <Volume2 className="w-6 h-6 text-gray-600" /> : <VolumeX className="w-6 h-6 text-gray-400" />}
      </button>

      {/* Header */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center w-full max-w-2xl z-10 mb-8"
      >
        <div className="flex flex-col items-center gap-3 mb-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-indigo-600 flex items-center justify-center gap-2">
            <Dices className="w-6 h-6 md:w-8 md:h-8" />
            초등 4학년 수학
          </h1>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-indigo-500 bg-white/60 px-4 py-2 rounded-xl shadow-sm backdrop-blur-sm break-keep">
            세 자리 수 × 몇십몇 (받아올림 없는 곱셈)
          </h2>
        </div>
        <p className="text-sm sm:text-base md:text-lg text-gray-600 font-medium bg-white/50 px-4 py-1.5 rounded-full shadow-sm inline-block">
          바탕을 클릭해 주사위를 굴려보세요!
        </p>
      </motion.div>

      {/* Main Content Wrapper - Centers vertically if space allows */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl gap-8 md:gap-12">
        
        {/* Main Dice Container - Always Row */}
        <div className="flex flex-row items-center justify-center gap-2 sm:gap-6 md:gap-16 w-full px-2">
          
          {/* Left Die (3-digit number) */}
          <DiceBox 
            value={leftNum} 
            label="세 자리 수" 
            isRolling={isRolling} 
            borderColor="border-blue-300"
            textColor="text-blue-600"
            bgColor="bg-white"
            shadowColor="shadow-blue-200"
          />

          {/* Multiplication Sign */}
          <motion.div 
            animate={isRolling ? { rotate: 180, scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.6 }}
            className="text-2xl sm:text-4xl md:text-6xl font-bold text-gray-400 shrink-0"
          >
            ×
          </motion.div>

          {/* Right Die (Tens) */}
          <DiceBox 
            value={rightNum} 
            label="몇십몇" 
            isRolling={isRolling} 
            borderColor="border-pink-300"
            textColor="text-pink-600"
            bgColor="bg-white"
            shadowColor="shadow-pink-200"
          />

        </div>

        {/* Answer Section */}
        <div className="w-full max-w-md interactive-area flex flex-col items-center gap-4 z-10 mb-8 px-4">
          <div className="relative w-full flex items-center justify-center gap-2">
            <input
              ref={inputRef}
              type="number"
              value={userAnswer}
              onChange={(e) => {
                setUserAnswer(e.target.value);
                setFeedback('idle');
              }}
              onKeyDown={handleKeyDown}
              placeholder="?"
              className={`w-full max-w-[160px] md:max-w-[200px] h-12 md:h-16 text-center text-xl md:text-3xl font-bold rounded-xl md:rounded-2xl border-4 outline-none transition-all shadow-sm
                ${feedback === 'correct' ? 'border-green-400 bg-green-50 text-green-700' : 
                  feedback === 'wrong' ? 'border-red-400 bg-red-50 text-red-700' : 
                  'border-indigo-200 focus:border-indigo-400 text-gray-700 bg-white'}`}
            />
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={checkAnswer}
              className="h-12 md:h-16 px-4 md:px-6 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl md:rounded-2xl shadow-md text-base md:text-xl flex items-center justify-center whitespace-nowrap"
            >
              확인
            </motion.button>
          </div>

          {/* Feedback Message */}
          <div className="h-8 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {feedback === 'correct' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 text-green-600 font-bold text-base md:text-xl"
                >
                  <Check className="w-5 h-5 md:w-6 md:h-6" />
                  정답입니다! 참 잘했어요!
                </motion.div>
              )}
              {feedback === 'wrong' && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: [0, -10, 10, -10, 10, 0] }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-red-500 font-bold text-base md:text-xl"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6" />
                  다시 한 번 생각해보세요!
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Footer / Decorative Elements */}
      <div className="text-gray-400 text-xs md:text-sm font-medium mt-auto pt-4">
        Click anywhere to roll • Multiplication without carrying
      </div>

      {/* Floating Sparkles for fun */}
      <AnimatePresence>
        {(!isRolling && feedback === 'correct') && (
          <>
            <FloatingSparkle x="20%" y="30%" delay={0} />
            <FloatingSparkle x="80%" y="20%" delay={0.2} />
            <FloatingSparkle x="50%" y="70%" delay={0.4} />
            <FloatingSparkle x="30%" y="60%" delay={0.6} />
            <FloatingSparkle x="70%" y="40%" delay={0.8} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function DiceBox({ value, label, isRolling, borderColor, textColor, bgColor, shadowColor }: { 
  value: number, 
  label: string, 
  isRolling: boolean, 
  borderColor: string,
  textColor: string,
  bgColor: string,
  shadowColor: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 md:gap-4">
      <motion.div
        className={`relative w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 rounded-xl md:rounded-2xl flex items-center justify-center border-4 border-b-[8px] md:border-b-[12px] ${borderColor} ${bgColor} ${textColor} shadow-lg md:shadow-xl`}
        animate={isRolling ? {
          rotateX: [0, 180, 360],
          rotateY: [0, 180, 360],
          scale: [1, 0.9, 1],
          y: [0, -20, 0]
        } : {
          rotateX: 0,
          rotateY: 0,
          scale: 1,
          y: 0
        }}
        transition={{ 
          duration: 0.6, 
          ease: "easeInOut"
        }}
        style={{ perspective: 1000 }}
      >
        {/* Inner Content */}
        <motion.span 
          className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter"
          animate={isRolling ? { opacity: 0.5, filter: "blur(2px)" } : { opacity: 1, filter: "blur(0px)" }}
        >
          {value}
        </motion.span>
        
        {/* Shine effect */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/60 to-transparent pointer-events-none" />
      </motion.div>
      
      <span className="text-gray-500 font-bold text-sm md:text-lg uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function FloatingSparkle({ x, y, delay }: { x: string, y: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5], y: -20 }}
      transition={{ duration: 2, repeat: Infinity, delay, ease: "easeInOut" }}
      className="absolute text-yellow-400"
      style={{ left: x, top: y }}
    >
      <Sparkles className="w-8 h-8" />
    </motion.div>
  );
}

