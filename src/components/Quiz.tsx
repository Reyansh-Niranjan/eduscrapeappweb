import { useState, useEffect } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Clock, CheckCircle, XCircle, ArrowLeft, ArrowRight, Send } from "lucide-react";

interface Question {
  questionId: Id<"quizQuestions">;
  question: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  options?: string[];
}

interface QuizAttempt {
  attemptId: Id<"quizAttempts">;
  attemptNumber: number;
  questions: Question[];
}

interface QuizCompletionResult {
  score: number;
  passed: boolean;
  xpEarned: number;
  totalPoints: number;
  earnedPoints: number;
  chapterId: Id<"chapters">;
}

interface QuizProps {
  quizId: Id<"quizzes">;
  onComplete?: (result: QuizCompletionResult) => void;
  onClose?: () => void;
}

export default function Quiz({ quizId, onComplete, onClose }: QuizProps) {
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<Set<string>>(new Set());
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({});
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [results, setResults] = useState<QuizCompletionResult | null>(null);

  const startQuizAttempt = useMutation(api.quizzes.startQuizAttempt);
  const submitQuizAnswer = useMutation(api.quizzes.submitQuizAnswer);
  const completeQuizAttempt = useAction(api.quizzes.completeQuizAttempt);
  const markChapterCompleted = useMutation(api.progress.markChapterCompleted);

  // Start quiz attempt on mount
  useEffect(() => {
    const startQuiz = async () => {
      try {
        setLoading(true);
        const result = await startQuizAttempt({ quizId });
        setAttempt(result);
        setStartTime(Date.now());
        setQuestionStartTime(Date.now());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start quiz");
      } finally {
        setLoading(false);
      }
    };

    startQuiz();
  }, [quizId, startQuizAttempt]);

  // Track time spent on current question
  useEffect(() => {
    if (!attempt) return;

    const interval = setInterval(() => {
      const currentTime = Date.now();
      const questionTime = Math.floor((currentTime - questionStartTime) / 1000);
      const questionKey = String(attempt.questions[currentQuestionIndex].questionId);
      setTimeSpent(prev => ({
        ...prev,
        [questionKey]: questionTime
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [attempt, currentQuestionIndex, questionStartTime]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitAnswer = async () => {
    if (!attempt) return;

    const question = attempt.questions[currentQuestionIndex];
    const questionKey = String(question.questionId);
    const answer = answers[questionKey];

    if (!answer) {
      setError("Please provide an answer before submitting");
      return;
    }

    try {
      setError(null);
      const timeSpentOnQuestion = timeSpent[questionKey] || 0;

      await submitQuizAnswer({
        attemptId: attempt.attemptId,
        questionId: question.questionId,
        answer,
        timeSpent: timeSpentOnQuestion
      });

      setSubmittedAnswers(prev => new Set([...prev, questionKey]));

      // Auto-advance to next question after 2 seconds
      setTimeout(() => {
        if (currentQuestionIndex < attempt.questions.length - 1) {
          handleNext();
        }
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit answer");
    }
  };

  const handleSkipQuestion = async () => {
    if (!attempt) return;

    const question = attempt.questions[currentQuestionIndex];
    const questionKey = String(question.questionId);

    if (submittedAnswers.has(questionKey)) {
      handleNext();
      return;
    }

    try {
      setError(null);
      const timeSpentOnQuestion = timeSpent[questionKey] || 0;

      await submitQuizAnswer({
        attemptId: attempt.attemptId,
        questionId: question.questionId,
        answer: "__SKIPPED__",
        timeSpent: timeSpentOnQuestion,
      });

      setSubmittedAnswers((prev) => new Set([...prev, questionKey]));
      handleNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to skip question");
    }
  };

  const handleNext = () => {
    if (!attempt) return;

    if (currentQuestionIndex < attempt.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handleCompleteQuiz = async () => {
    if (!attempt) return;

    // Check if all questions are answered
    const unanswered = attempt.questions.filter(q => !submittedAnswers.has(String(q.questionId)));
    if (unanswered.length > 0) {
      setError(`Please answer all questions before completing the quiz. ${unanswered.length} remaining.`);
      return;
    }

    try {
      setLoading(true);
      const result = await completeQuizAttempt({ attemptId: attempt.attemptId });
      setResults(result as QuizCompletionResult);
      setShowConfirmationModal(true);
      onComplete?.(result as QuizCompletionResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete quiz");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--theme-bg)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error && !attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--theme-bg)' }}>
        <div className="max-w-md mx-auto text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--theme-text)' }}>Error</h2>
          <p style={{ color: 'var(--theme-text-secondary)' }}>{error}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!attempt) return null;

  const currentQuestion = attempt.questions[currentQuestionIndex];
  const isAnswered = submittedAnswers.has(String(currentQuestion.questionId));
  const progress = ((currentQuestionIndex + 1) / attempt.questions.length) * 100;

  if (showConfirmationModal && results) {
    const handleConfirmChapterCompleted = async () => {
      try {
        setLoading(true);
        const totalTimeSpent = Math.floor((Date.now() - startTime) / 1000);
        const completion = await markChapterCompleted({
          chapterId: results.chapterId,
          timeSpent: totalTimeSpent,
          pagesRead: 1,
          totalPages: 1,
        });

        if (completion?.success && typeof completion.xpEarned === "number") {
          setResults((prev) => (prev ? { ...prev, xpEarned: prev.xpEarned + completion.xpEarned } : prev));
        }
        setShowConfirmationModal(false);
        setShowResults(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to mark chapter completed";
        // If the chapter was already completed elsewhere (e.g., user skipped quiz after reaching last page),
        // treat it as success and move on.
        if (typeof msg === "string" && msg.toLowerCase().includes("already completed")) {
          setShowConfirmationModal(false);
          setShowResults(true);
          return;
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    const handleDecline = () => {
      setShowConfirmationModal(false);
      setShowResults(true);
    };

    return (
      <div className="min-h-screen p-6" style={{ background: 'var(--theme-bg)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="rounded-xl shadow-sm p-8 text-center" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-border)' }}>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--theme-text)' }}>Quiz Completed!</h2>
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-lg" style={{ color: 'var(--theme-text-secondary)' }}>Score</p>
                <p className="text-3xl font-bold text-green-600">{results.score.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-lg" style={{ color: 'var(--theme-text-secondary)' }}>XP Earned</p>
                <p className="text-3xl font-bold text-purple-600">+{results.xpEarned}</p>
              </div>
              {results.passed ? (
                <p className="text-green-600 font-medium">✅ Passed</p>
              ) : (
                <p className="text-red-600 font-medium">❌ Not Passed</p>
              )}
            </div>
            <div className="mb-6">
              <p className="text-lg mb-4" style={{ color: 'var(--theme-text)' }}>
                Are you sure you have completed this chapter fully and won't require to do it again?
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleConfirmChapterCompleted}
                  disabled={loading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                >
                  {loading ? "Marking..." : "Yes, Mark Chapter Completed"}
                </button>
                <button
                  onClick={handleDecline}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                >
                  No, Just Finish Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showResults && results) {
    const handleRetake = () => {
      setAttempt(null);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setSubmittedAnswers(new Set());
      setShowResults(false);
      setShowConfirmationModal(false);
      setResults(null);
      setError(null);
      // Restart quiz attempt
      const startQuiz = async () => {
        try {
          setLoading(true);
          const result = await startQuizAttempt({ quizId });
          setAttempt(result);
          setStartTime(Date.now());
          setQuestionStartTime(Date.now());
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to start quiz");
        } finally {
          setLoading(false);
        }
      };
      startQuiz();
    };

    return (
      <div className="min-h-screen p-6" style={{ background: 'var(--theme-bg)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="rounded-xl shadow-sm p-8 text-center" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-border)' }}>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--theme-text)' }}>Quiz Completed!</h2>
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-lg" style={{ color: 'var(--theme-text-secondary)' }}>Score</p>
                <p className="text-3xl font-bold text-green-600">{results.score.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-lg" style={{ color: 'var(--theme-text-secondary)' }}>XP Earned</p>
                <p className="text-3xl font-bold text-purple-600">+{results.xpEarned}</p>
              </div>
              {results.passed ? (
                <p className="text-green-600 font-medium">✅ Passed</p>
              ) : (
                <p className="text-red-600 font-medium">❌ Not Passed</p>
              )}
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleRetake}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Retake Quiz
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
              >
                Return to Library
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--theme-bg)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="rounded-xl shadow-sm p-6 mb-6" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Exit Quiz
            </button>
            <div className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
              Question {currentQuestionIndex + 1} of {attempt.questions.length}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Timer - Optional */}
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
            <Clock className="h-4 w-4" />
            Time spent: {Math.floor((Date.now() - startTime) / 1000 / 60)}:{String(Math.floor((Date.now() - startTime) / 1000) % 60).padStart(2, '0')}
          </div>
        </div>

        {/* Question */}
        <div className="rounded-xl shadow-sm p-8 mb-6" style={{ background: 'var(--theme-card-bg)', border: '1px solid var(--theme-border)' }}>
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--theme-text)' }}>
            {currentQuestion.question}
          </h2>

          {/* Answer Input */}
          <div className="space-y-4">
            {currentQuestion.type === "multiple_choice" && currentQuestion.options && (
              <div className="space-y-2">
                {currentQuestion.options.map((option, index) => (
                  <label key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name={`question-${currentQuestion.questionId}`}
                      value={option}
                      checked={answers[currentQuestion.questionId] === option}
                      onChange={(e) => handleAnswerChange(currentQuestion.questionId, e.target.value)}
                      disabled={isAnswered}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span style={{ color: 'var(--theme-text)' }}>{option}</span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.type === "true_false" && (
              <div className="space-y-2">
                {["True", "False"].map((option) => (
                  <label key={option} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name={`question-${currentQuestion.questionId}`}
                      value={option}
                      checked={answers[currentQuestion.questionId] === option}
                      onChange={(e) => handleAnswerChange(currentQuestion.questionId, e.target.value)}
                      disabled={isAnswered}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span style={{ color: 'var(--theme-text)' }}>{option}</span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.type === "short_answer" && (
              <textarea
                value={answers[currentQuestion.questionId] || ""}
                onChange={(e) => handleAnswerChange(currentQuestion.questionId, e.target.value)}
                disabled={isAnswered}
                placeholder="Type your answer here..."
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                style={{ background: 'var(--theme-input-bg)', border: '1px solid var(--theme-border)', color: 'var(--theme-text)' }}
                rows={4}
              />
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleSkipQuestion}
              disabled={isAnswered}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Skip
            </button>
            {!isAnswered ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={!answers[currentQuestion.questionId]}
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
                Submit Answer
              </button>
            ) : (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Answered
              </div>
            )}

            {currentQuestionIndex === attempt.questions.length - 1 && submittedAnswers.size === attempt.questions.length ? (
              <button
                onClick={handleCompleteQuiz}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Complete Quiz
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={currentQuestionIndex === attempt.questions.length - 1}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}