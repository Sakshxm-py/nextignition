import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, CheckCircle, Sparkles } from 'lucide-react';
import { brandColors } from '../utils/colors';

interface StageAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStage: (stage: 'ideation' | 'mvp' | 'growth' | 'scaling') => void;
}

interface Question {
  id: number;
  question: string;
  options: {
    text: string;
    stage: 'ideation' | 'mvp' | 'growth' | 'scaling';
    score: { ideation: number; mvp: number; growth: number; scaling: number };
  }[];
}

const questions: Question[] = [
  {
    id: 1,
    question: "What best describes your current situation?",
    options: [
      {
        text: "I have an idea but haven't started building yet",
        stage: 'ideation',
        score: { ideation: 4, mvp: 0, growth: 0, scaling: 0 }
      },
      {
        text: "I'm currently building my first version",
        stage: 'mvp',
        score: { ideation: 1, mvp: 4, growth: 0, scaling: 0 }
      },
      {
        text: "I have a working product and some users",
        stage: 'growth',
        score: { ideation: 0, mvp: 1, growth: 4, scaling: 0 }
      },
      {
        text: "I have raised funding and need to scale operations",
        stage: 'scaling',
        score: { ideation: 0, mvp: 0, growth: 1, scaling: 4 }
      }
    ]
  },
  {
    id: 2,
    question: "What is your primary need right now?",
    options: [
      {
        text: "Validating my idea and finding co-founders",
        stage: 'ideation',
        score: { ideation: 4, mvp: 0, growth: 0, scaling: 0 }
      },
      {
        text: "Building the first version of my product",
        stage: 'mvp',
        score: { ideation: 0, mvp: 4, growth: 0, scaling: 0 }
      },
      {
        text: "Getting funding and growing my user base",
        stage: 'growth',
        score: { ideation: 0, mvp: 0, growth: 4, scaling: 0 }
      },
      {
        text: "Hiring team and expanding operations",
        stage: 'scaling',
        score: { ideation: 0, mvp: 0, growth: 0, scaling: 4 }
      }
    ]
  },
  {
    id: 3,
    question: "How many paying customers do you have?",
    options: [
      {
        text: "None yet, still validating the idea",
        stage: 'ideation',
        score: { ideation: 4, mvp: 1, growth: 0, scaling: 0 }
      },
      {
        text: "0-10 beta users or early adopters",
        stage: 'mvp',
        score: { ideation: 1, mvp: 4, growth: 1, scaling: 0 }
      },
      {
        text: "10-100 paying customers",
        stage: 'growth',
        score: { ideation: 0, mvp: 1, growth: 4, scaling: 1 }
      },
      {
        text: "100+ paying customers",
        stage: 'scaling',
        score: { ideation: 0, mvp: 0, growth: 1, scaling: 4 }
      }
    ]
  },
  {
    id: 4,
    question: "Have you raised any funding?",
    options: [
      {
        text: "No, I'm bootstrapping or pre-funding",
        stage: 'ideation',
        score: { ideation: 3, mvp: 2, growth: 0, scaling: 0 }
      },
      {
        text: "Friends & Family or Pre-seed (<$100k)",
        stage: 'mvp',
        score: { ideation: 1, mvp: 3, growth: 2, scaling: 0 }
      },
      {
        text: "Seed funding ($100k-$2M)",
        stage: 'growth',
        score: { ideation: 0, mvp: 1, growth: 3, scaling: 2 }
      },
      {
        text: "Series A or beyond (>$2M)",
        stage: 'scaling',
        score: { ideation: 0, mvp: 0, growth: 1, scaling: 4 }
      }
    ]
  },
  {
    id: 5,
    question: "What's your biggest challenge right now?",
    options: [
      {
        text: "Turning my idea into a concrete business plan",
        stage: 'ideation',
        score: { ideation: 4, mvp: 0, growth: 0, scaling: 0 }
      },
      {
        text: "Finding technical talent to build my MVP",
        stage: 'mvp',
        score: { ideation: 0, mvp: 4, growth: 0, scaling: 0 }
      },
      {
        text: "Acquiring customers and raising capital",
        stage: 'growth',
        score: { ideation: 0, mvp: 0, growth: 4, scaling: 0 }
      },
      {
        text: "Managing rapid growth and team expansion",
        stage: 'scaling',
        score: { ideation: 0, mvp: 0, growth: 0, scaling: 4 }
      }
    ]
  }
];

export function StageAssessmentModal({ isOpen, onClose, onSelectStage }: StageAssessmentModalProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [recommendedStage, setRecommendedStage] = useState<'ideation' | 'mvp' | 'growth' | 'scaling'>('ideation');

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers, optionIndex];
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate result
      calculateRecommendation(newAnswers);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setAnswers(answers.slice(0, -1));
    }
  };

  const calculateRecommendation = (userAnswers: number[]) => {
    const scores = {
      ideation: 0,
      mvp: 0,
      growth: 0,
      scaling: 0
    };

    userAnswers.forEach((answerIndex, questionIndex) => {
      const option = questions[questionIndex].options[answerIndex];
      scores.ideation += option.score.ideation;
      scores.mvp += option.score.mvp;
      scores.growth += option.score.growth;
      scores.scaling += option.score.scaling;
    });

    // Find the stage with the highest score
    const maxScore = Math.max(scores.ideation, scores.mvp, scores.growth, scores.scaling);
    let stage: 'ideation' | 'mvp' | 'growth' | 'scaling' = 'ideation';
    
    if (scores.scaling === maxScore) stage = 'scaling';
    else if (scores.growth === maxScore) stage = 'growth';
    else if (scores.mvp === maxScore) stage = 'mvp';
    else stage = 'ideation';

    setRecommendedStage(stage);
    setShowResult(true);
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setShowResult(false);
  };

  const handleSelectRecommendedStage = () => {
    onSelectStage(recommendedStage);
    onClose();
    handleRestart();
  };

  const handleCloseModal = () => {
    onClose();
    // Reset immediately to avoid stale result screen on reopen
    handleRestart();
  };

  if (!isOpen) return null;

  const stageInfo = {
    ideation: {
      title: 'Ideation Stage',
      emoji: '💡',
      color: brandColors.electricBlue,
      description: 'You\'re in the idea validation phase. Focus on validating your concept, building your business model, and finding the right co-founders.',
      nextSteps: [
        'Validate your idea with potential customers',
        'Build a business model canvas',
        'Find co-founders with complementary skills',
        'Research your target market'
      ]
    },
    mvp: {
      title: 'MVP Development',
      emoji: '🛠️',
      color: brandColors.atomicOrange,
      description: 'You\'re ready to build your Minimum Viable Product. Get expert technical support to bring your idea to life.',
      nextSteps: [
        'Define your MVP scope and features',
        'Connect with technical experts/CTOs',
        'Start product development',
        'Plan your launch strategy'
      ]
    },
    growth: {
      title: 'Growth & Fundraising',
      emoji: '📈',
      color: brandColors.navyBlue,
      description: 'You have a working product and need to grow. Focus on customer acquisition, revenue growth, and raising capital.',
      nextSteps: [
        'Optimize your pitch deck',
        'Connect with investors',
        'Focus on customer acquisition',
        'Track and improve key metrics'
      ]
    },
    scaling: {
      title: 'Scaling & Operations',
      emoji: '🚀',
      color: '#10b981',
      description: 'You\'ve raised funding and need to scale. Focus on building your team, optimizing operations, and expanding your market reach.',
      nextSteps: [
        'Build and scale your team',
        'Optimize operational processes',
        'Expand to new markets',
        'Strengthen your position'
      ]
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            {!showResult ? (
              <div className="p-6 lg:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Startup Stage Assessment</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Question {currentQuestion + 1} of {questions.length}
                    </p>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                  <div className="bg-gray-200 rounded-full h-2">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Question */}
                <motion.div
                  key={currentQuestion}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="mb-6"
                >
                  <h3 className="text-xl font-bold mb-6">{questions[currentQuestion].question}</h3>

                  <div className="space-y-3">
                    {questions[currentQuestion].options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleAnswer(index)}
                        className="w-full text-left p-4 lg:p-5 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm lg:text-base font-medium text-gray-900 group-hover:text-blue-700">
                            {option.text}
                          </span>
                          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleBack}
                    disabled={currentQuestion === 0}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      currentQuestion === 0
                        ? 'opacity-50 cursor-not-allowed text-gray-400'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>

                  <p className="text-sm text-gray-500">
                    Select an option to continue
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 lg:p-8">
                {/* Result Header */}
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.1 }}
                    className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-orange-100 flex items-center justify-center text-4xl"
                  >
                    {stageInfo[recommendedStage].emoji}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-orange-500" />
                      <h3 className="text-2xl font-bold">Your Recommended Stage</h3>
                    </div>
                    <h2 
                      className="text-3xl lg:text-4xl font-bold mb-3"
                      style={{ fontFamily: 'Funnel Display, sans-serif', color: stageInfo[recommendedStage].color }}
                    >
                      {stageInfo[recommendedStage].title}
                    </h2>
                    <p className="text-gray-600 max-w-xl mx-auto">
                      {stageInfo[recommendedStage].description}
                    </p>
                  </motion.div>
                </div>

                {/* Next Steps */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gray-50 rounded-xl p-6 mb-6"
                >
                  <h4 className="font-bold text-lg mb-4">Recommended Next Steps:</h4>
                  <div className="space-y-3">
                    {stageInfo[recommendedStage].nextSteps.map((step, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <CheckCircle 
                          className="w-5 h-5 flex-shrink-0 mt-0.5" 
                          style={{ color: stageInfo[recommendedStage].color }}
                        />
                        <span className="text-gray-700">{step}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <button
                    onClick={handleSelectRecommendedStage}
                    className="flex-1 py-4 rounded-xl font-bold text-white transition-all hover:shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${stageInfo[recommendedStage].color}, ${brandColors.atomicOrange})` }}
                  >
                    Continue with {stageInfo[recommendedStage].title}
                  </button>
                  <button
                    onClick={handleRestart}
                    className="px-6 py-4 rounded-xl font-medium border-2 border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Retake Assessment
                  </button>
                </motion.div>

                {/* Manual Selection */}
                <p className="text-center text-sm text-gray-500 mt-4">
                  Not the right fit?{' '}
                  <button onClick={handleCloseModal} className="text-blue-600 hover:underline font-medium">
                    Choose manually
                  </button>
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
