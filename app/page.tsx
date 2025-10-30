"use client";

import React, { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import logo from '@/public/LogoAssets/konnichiwowlogonew.png';

type Question = { _id: string; text: string; options: string[] };

const MASCOT_PATH = "/Mascot - Task Assets/";
const MASCOTS = [
  "tenkun_bowing.png",
  "tenkun_heroic_straight_pose.png",
  "tenkun_kanji_calligraphy.png",
  "tenkun_kanji_icon.png",
  "tenkun_meditating.png",
  "tenkun_peeping_out_from_above.png",
  "tenkun_pointing (1).png",
  "tenkun_pointing (2).png",
  "tenkun_pointing (3).png",
  "tenkun_pointing (4).png",
  "tenkun_pointing (5).png",
  "tenkun_recording.png",
  "tenkun_salaryman_office.png",
  "tenkun_vocab.png",
  "tenkun_vocab_icon.png",
];

export default function Home() {
  const [phase, setPhase] = useState<"welcome" | "quiz" | "result">("welcome");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Array<{ qId: string; selectedIndex: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWrongModal, setShowWrongModal] = useState<null | { correctIndex: number; reasoning: string }>(null);
  const [score, setScore] = useState<number | null>(null);
  const [resultDetails, setResultDetails] = useState<Array<{
    qId: string;
    question?: Question;
    selectedIndex: number;
    correctIndex?: number;
    reasoning?: string;
  }>>([]);
  const [resultLoading, setResultLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // assign a random mascot image per question
  const mascots = useMemo(() => {
    return Array.from({ length: 5 }).map(() => MASCOTS[Math.floor(Math.random() * MASCOTS.length)]);
  }, []);

  useEffect(() => {
    if (phase === "quiz") {
      setSelectedIdx(null);
    }
  }, [phase, current]);

  useEffect(() => {
    if (phase !== "quiz" || questions.length === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showWrongModal) return;
      // Arrow navigation
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        setSelectedIdx((prev) => {
          if (prev === null) return 0;
          return (prev + 1) % questions[current].options.length;
        });
        e.preventDefault();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        setSelectedIdx((prev) => {
          if (prev === null) return questions[current].options.length - 1;
          return (prev - 1 + questions[current].options.length) % questions[current].options.length;
        });
        e.preventDefault();
      } else if (/^[1-4]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < questions[current].options.length) {
          handleOption(idx);
        }
        e.preventDefault();
      } else if (e.key === "Enter" && selectedIdx !== null) {
        handleOption(selectedIdx);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, questions, current, selectedIdx, showWrongModal]);

  const beginQuiz = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/questions");
      if (!res.ok) throw new Error("Failed to fetch questions");
      const data = await res.json();
      setQuestions(data.questions || []);
      setCurrent(0);
      setAnswers([]);
      setScore(null);
      setPhase("quiz");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleOption = async (idx: number) => {
    const q = questions[current];
    // record locally
    const nextAnswers = [...answers, { qId: q._id, selectedIndex: idx }];
    setAnswers(nextAnswers);

    // fetch correct answer
    try {
      const res = await fetch(`/api/answers/${q._id}`);
      if (!res.ok) throw new Error("Failed to get answer");
      const data = await res.json();
      const correctIndex = data.correctOptionIndex;
      const reasoning = data.reasoning || "";

      if (typeof correctIndex === "number" && correctIndex === idx) {
        // correct -> advance
        if (current + 1 < questions.length) {
          setCurrent((c) => c + 1);
        } else {
          // finish and score
          await scoreQuiz(nextAnswers);
        }
      } else {
        // wrong -> show modal with reasoning, then on close advance
        setShowWrongModal({ correctIndex, reasoning });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Submit failed");
    }
  };

  const scoreQuiz = async (answersToScore: Array<{ qId: string; selectedIndex: number }>) => {
    setLoading(true);
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersToScore }),
      });
      if (!res.ok) throw new Error("Failed to score");
      const data = await res.json();
      setScore(data.percentage ?? 0);
      setPhase("result");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Scoring failed");
    } finally {
      setLoading(false);
    }
  };

  // when we land on the result phase, fetch per-question details (correct index + reasoning)
  useEffect(() => {
    if (phase !== "result" || answers.length === 0) return;
    let mounted = true;
    (async () => {
      setResultLoading(true);
      try {
        const details = await Promise.all(
          answers.map(async (a) => {
            const q = questions.find((qq) => String(qq._id) === String(a.qId));
            try {
              const res = await fetch(`/api/answers/${a.qId}`);
              if (!res.ok) throw new Error('fetch answer failed');
              const data = await res.json();
              return {
                qId: a.qId,
                question: q,
                selectedIndex: a.selectedIndex,
                correctIndex: data.correctOptionIndex as number | undefined,
                reasoning: data.reasoning as string | undefined,
              };
            } catch {
              return {
                qId: a.qId,
                question: q,
                selectedIndex: a.selectedIndex,
              };
            }
          })
        );
        if (!mounted) return;
        setResultDetails(details);
      } finally {
        if (mounted) setResultLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [phase, answers, questions]);

  const closeWrongModal = () => {
    setShowWrongModal(null);
    if (current + 1 < questions.length) setCurrent((c) => c + 1);
    else scoreQuiz(answers);
  };

  const retake = () => {
    setPhase("welcome");
    setQuestions([]);
    setCurrent(0);
    setAnswers([]);
    setScore(null);
  };

  return (
  <div className="min-h-screen w-screen bg-[#F8FFFE] flex items-center justify-center">
      {phase === "welcome" && (
  <div className="max-w-2xl w-full p-12 rounded-3xl bg-white shadow-2xl text-center border border-[#26ECB4]">
          <h1 className="text-4xl font-extrabold mb-4 text-[#EC265F]">Welcome to the Quiz</h1>
          <p className="text-lg text-gray-700 mb-6">Answer 5 random questions. Immediate feedback is provided — if you miss one you&apos;ll see the correct answer and an explanation.</p>
          <button
            onClick={beginQuiz}
            disabled={loading}
            className="px-8 py-4 rounded-full font-semibold transition-colors bg-[#26ECB4] text-white border-2 border-[#26ECB4] hover:bg-[#EC265F] hover:border-[#EC265F] hover:text-white disabled:opacity-50"
          >
            {loading ? "Loading..." : "Begin Quiz"}
          </button>
          {error && <div className="mt-4 text-[#EC265F]">{error}</div>}
        </div>
      )}

      {phase === "quiz" && questions.length > 0 && (
  <div className="fixed inset-0 bg-[#F8FFFE] flex flex-col">
          <div className="flex items-center justify-between px-8 py-4 border-b border-[#26ECB4]">
            <div className="flex items-center gap-4">
              <Image src={logo} alt="mascot" width={48} height={48} />
            </div>
          </div>

          <div className="w-full px-6 md:px-8 py-4">
            <div className="max-w-5xl mx-auto">
              <div className="h-3 bg-[#E0FDF7] rounded overflow-hidden border border-[#26ECB4]">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.round(((current) / questions.length) * 100)}%`,
                    background: 'linear-gradient(90deg,#26ECB4,#EC265F)',
                  }}
                />
              </div>
              <div className="mt-2 flex items-center">
                <div className="text-sm text-[#26ECB4] font-medium">{current + 1} / {questions.length}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center p-6 md:p-8">
            <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
              <div className="flex items-center justify-center md:justify-center">
                <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-xl bg-white flex items-center justify-center border-2 border-[#26ECB4] relative"
                  style={{ marginTop: '8px' }}
                >
                  <Image src={MASCOT_PATH + mascots[current]} alt="mascot" width={160} height={160} className="object-contain" />
                </div>
              </div>

                  <div className="flex flex-col gap-3 md:gap-6 max-h-[70vh] md:max-h-none overflow-y-auto md:overflow-visible touch-pan-y">
                    <div className="text-lg md:text-2xl font-bold pt-2 text-[#EC265F]">{questions[current].text}</div>
                    <div className="grid grid-cols-1 gap-2 py-1 max-h-[44vh] md:max-h-none overflow-y-auto md:overflow-visible">
                      {questions[current].options.map((opt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleOption(idx)}
                          className={`w-full text-left rounded-lg shadow border-2 border-[#26ECB4] transition-colors flex items-center justify-between
                            bg-white hover:bg-[#26ECB4] hover:text-white disabled:opacity-50 touch-manipulation
                            px-3 py-3 md:px-5 md:py-5
                            text-sm md:text-lg font-semibold
                            ${selectedIdx === idx ? 'ring-2 ring-[#EC265F] ring-offset-2 bg-[#EC265F] text-white' : ''}
                            ${selectedIdx === idx ? 'font-extrabold' : ''}
                          `}
                          tabIndex={0}
                          onFocus={() => setSelectedIdx(idx)}
                          onMouseEnter={() => setSelectedIdx(idx)}
                          aria-label={`Option ${idx + 1}`}
                          style={{
                            color: selectedIdx === idx ? '#fff' : '#222',
                            backgroundColor: selectedIdx === idx ? '#EC265F' : '#fff',
                            borderColor: selectedIdx === idx ? '#EC265F' : '#26ECB4',
                            fontWeight: selectedIdx === idx ? 'bold' : 'normal',
                            letterSpacing: '0.02em',
                          }}
                        >
                          <span className="text-base md:text-lg">{opt}</span>
                          <span className="hidden md:inline text-xs text-[#26ECB4]">{`(${idx + 1})`}</span>
                        </button>
                      ))}
                    </div>
              </div>
            </div>
          </div>

          {/* wrong answer modal */}
          {showWrongModal && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 max-w-lg w-full border-2 border-[#26ECB4]">
                <h3 className="text-xl font-bold text-[#EC265F] mb-2">Incorrect</h3>
                <p className="mb-4">Correct answer: <span className="font-semibold text-[#26ECB4]">{questions[current].options[showWrongModal.correctIndex]}</span></p>
                <div className="mb-4 text-sm text-gray-700">{showWrongModal.reasoning}</div>
                <div className="text-right">
                  <button onClick={closeWrongModal} className="px-4 py-2 rounded-full font-semibold transition-colors bg-[#26ECB4] text-white border-2 border-[#26ECB4] hover:bg-[#EC265F] hover:border-[#EC265F]">Continue</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === "result" && (
  <div className="max-w-4xl w-full p-8 md:p-12 rounded-3xl bg-white shadow-2xl border border-[#26ECB4]">
          <h2 className="text-4xl font-extrabold mb-2 text-[#EC265F]">Quiz Complete</h2>
          <p className="text-lg text-gray-700 mb-4">Your score: <span className="font-mono text-[#26ECB4] text-2xl ml-2">{score}%</span></p>

          <div className="space-y-4 mt-4">
            {resultLoading && <div className="text-sm text-gray-500">Loading details...</div>}
            {!resultLoading && resultDetails.length === 0 && <div className="text-sm text-gray-600">No question details available.</div>}

            {resultDetails.map((r, i) => {
              const q = r.question || questions.find((qq) => String(qq._id) === String(r.qId));
              const userChoice = typeof r.selectedIndex === 'number' ? (q ? q.options[r.selectedIndex] : `Option ${r.selectedIndex + 1}`) : 'No answer';
              const correctChoice = typeof r.correctIndex === 'number' && q ? q.options[r.correctIndex] : (typeof r.correctIndex === 'number' ? `Option ${r.correctIndex + 1}` : 'Unknown');
              const isCorrect = typeof r.correctIndex === 'number' && r.correctIndex === r.selectedIndex;
              return (
                <div key={r.qId} className={`p-4 rounded-lg border ${isCorrect ? 'border-green-300 bg-green-50' : 'border-[#26ECB4] bg-white'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-left">
                      <div className="text-sm text-gray-600">Question {i + 1}</div>
                      <div className="font-semibold text-[#EC265F] mt-1">{q ? q.text : 'Question text unavailable'}</div>
                      <div className="mt-2 text-sm">
                        <div><span className="font-semibold text-black">Your answer:</span> <span className={isCorrect ? 'text-green-700 font-medium' : 'text-[#EC265F]'}>{userChoice}</span></div>
                        <div className="mt-1"><span className="font-semibold text-black">Correct answer:</span> <span className="text-[#26ECB4]">{correctChoice}</span></div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className={`px-3 py-1 rounded-full ${isCorrect ? 'bg-green-200 text-green-800' : 'bg-[#FFEFF3] text-[#EC265F]'}`}>{isCorrect ? 'Correct' : 'Incorrect'}</div>
                    </div>
                  </div>
                  {r.reasoning && (
                    <div className="mt-3 text-sm text-gray-700 bg-gray-50 p-3 rounded">{r.reasoning}</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-center gap-4 mt-6">
            <button onClick={retake} className="px-6 py-3 rounded-full font-semibold transition-colors bg-[#26ECB4] text-white border-2 border-[#26ECB4] hover:bg-[#EC265F] hover:border-[#EC265F]">Retake Quiz</button>
          </div>
        </div>
      )}
    </div>
  );
}
