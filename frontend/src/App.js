// App.js - React Frontend for the Exam Application
// This is a complete, self-contained React application.

import React, { useState, useEffect, useCallback } from 'react';

// Main application component
export default function App() {
  // --- State Management ---
  // Store user information and JWT token
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  // State for exam flow
  const [examStarted, setExamStarted] = useState(false);
  const [viewResult, setViewResult] = useState(false);
  // State for the exam itself
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timer, setTimer] = useState(1800); // 30 minutes in seconds
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Base URL for the backend API
  const API_BASE_URL = "http://localhost:5000";

  // --- API Interaction Functions ---
  const handleAuth = async (endpoint, data) => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.msg || 'Authentication failed.');
      }
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (username, password) => {
    const result = await handleAuth('register', { username, password });
    if (result) {
      setSuccessMessage("Registration successful! You can now log in.");
    }
  };

  const handleLogin = async (username, password) => {
    const result = await handleAuth('login', { username, password });
    if (result && result.access_token) {
      localStorage.setItem('token', result.access_token);
      setToken(result.access_token);
      setUser({ username });
    }
  };

  const fetchQuestions = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/questions`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.msg || 'Failed to fetch questions.');
      }

      const data = await response.json();
      setQuestions(data);
      setExamStarted(true);
    } catch (err) {
      setError(err.message);
      setExamStarted(false);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // --- Exam Logic ---
  const handleStartExam = () => {
    fetchQuestions();
    setTimer(1800); // Reset timer to 30 minutes
  };

  const handleNext = () => {
    setCurrentQuestionIndex(prev => Math.min(prev + 1, questions.length - 1));
  };

  const handlePrevious = () => {
    setCurrentQuestionIndex(prev => Math.max(prev - 1, 0));
  };
  
  const handleOptionSelect = (questionId, selectedOption) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: selectedOption
    }));
  };

  const handleSubmit = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      // Format answers for backend submission
      const formattedAnswers = Object.keys(answers).map(id => ({
        id: parseInt(id),
        selected_option: answers[id],
      }));

      const response = await fetch(`${API_BASE_URL}/api/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formattedAnswers),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.msg || 'Failed to submit exam.');
      }

      const result = await response.json();
      setScore(result);
      setViewResult(true);
      setExamStarted(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, answers]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setExamStarted(false);
    setViewResult(false);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setScore(null);
  };
  
  // --- Timer Hook ---
  useEffect(() => {
    // Timer only runs when the exam has started
    if (!examStarted) return;
    
    // Decrement the timer every second
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          // If timer runs out, automatically submit the exam
          handleSubmit();
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Clean up the interval when the component unmounts or exam ends
    return () => clearInterval(interval);
  }, [examStarted, handleSubmit]);

  // --- Helper Functions for UI ---
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Conditional rendering for different app views
  if (viewResult) {
    return <ResultDisplay score={score} handleLogout={handleLogout} />;
  }
  
  if (examStarted) {
    return (
      <Exam
        questions={questions}
        currentQuestionIndex={currentQuestionIndex}
        answers={answers}
        handleOptionSelect={handleOptionSelect}
        handleNext={handleNext}
        handlePrevious={handlePrevious}
        handleSubmit={handleSubmit}
        timer={timer}
      />
    );
  }

  // Initial view: Auth or Start Exam
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      {token ? (
        <StartExam handleStartExam={handleStartExam} handleLogout={handleLogout} />
      ) : (
        <AuthForm handleRegister={handleRegister} handleLogin={handleLogin} loading={loading} error={error} successMessage={successMessage} />
      )}
    </div>
  );
}

// --- Component Definitions ---

const AuthForm = ({ handleRegister, handleLogin, loading, error, successMessage }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      handleLogin(username, password);
    } else {
      handleRegister(username, password);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">{isLogin ? 'Log In' : 'Register'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 font-medium mb-1">Username</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 font-medium mb-1">Password</label>
          <input
            type="password"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        {successMessage && <p className="text-green-500 text-sm text-center">{successMessage}</p>}
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition duration-200 disabled:bg-indigo-400"
          disabled={loading}
        >
          {loading ? 'Loading...' : (isLogin ? 'Log In' : 'Register')}
        </button>
      </form>
      <p className="mt-4 text-center text-gray-600">
        {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-indigo-600 font-bold hover:underline"
        >
          {isLogin ? 'Register' : 'Log In'}
        </button>
      </p>
    </div>
  );
};

const StartExam = ({ handleStartExam, handleLogout }) => (
  <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md text-center space-y-6">
    <h2 className="text-3xl font-bold text-gray-800">Welcome to the Exam</h2>
    <p className="text-gray-600">You have 30 minutes to complete the exam. Good luck!</p>
    <button
      onClick={handleStartExam}
      className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition duration-200"
    >
      Start Exam
    </button>
    <button
      onClick={handleLogout}
      className="w-full bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-gray-400 transition duration-200"
    >
      Logout
    </button>
  </div>
);

const Exam = ({ questions, currentQuestionIndex, answers, handleOptionSelect, handleNext, handlePrevious, handleSubmit, timer }) => {
  const currentQuestion = questions[currentQuestionIndex];
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Question {currentQuestionIndex + 1} of {questions.length}</h2>
          <div className="bg-red-500 text-white text-lg font-bold px-4 py-2 rounded-lg">
            Timer: {formatTime(timer)}
          </div>
        </div>

        {currentQuestion && (
          <div>
            <p className="text-lg font-medium text-gray-700 mb-4">{currentQuestion.question}</p>
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <div key={index} className="flex items-center">
                  <input
                    type="radio"
                    id={`option-${index}`}
                    name={`question-${currentQuestion.id}`}
                    value={option}
                    checked={answers[currentQuestion.id] === option}
                    onChange={() => handleOptionSelect(currentQuestion.id, option)}
                    className="h-5 w-5 text-indigo-600 cursor-pointer"
                  />
                  <label htmlFor={`option-${index}`} className="ml-3 text-gray-700 cursor-pointer">
                    {option}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8">
          <button
            onClick={handlePrevious}
            disabled={isFirstQuestion}
            className="bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-400 transition duration-200 disabled:opacity-50"
          >
            Previous
          </button>
          {isLastQuestion ? (
            <button
              onClick={handleSubmit}
              className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 transition duration-200"
            >
              Submit Exam
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 transition duration-200"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ResultDisplay = ({ score, handleLogout }) => (
  <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
    <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md text-center space-y-6">
      <h2 className="text-3xl font-bold text-gray-800">Exam Results</h2>
      <p className="text-5xl font-extrabold text-indigo-600">
        {score.score} / {score.total}
      </p>
      <p className="text-xl font-semibold text-gray-700">You scored {Math.round((score.score / score.total) * 100)}%!</p>
      
      <div className="border-t border-gray-200 pt-4 text-left">
        <h3 className="text-lg font-bold mb-2">Correct Answers</h3>
        <ul className="space-y-1 text-gray-600">
          {Object.entries(score.correct_answers).map(([id, answer]) => (
            <li key={id}>
              **Q{id}:** {answer}
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={handleLogout}
        className="w-full bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-gray-400 transition duration-200 mt-4"
      >
        Return to Login
      </button>
    </div>
  </div>
);
