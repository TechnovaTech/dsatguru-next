import { useState, useEffect } from "react";
import { FiPlus, FiX, FiCheck, FiAlertCircle, FiBook, FiTarget, FiImage } from "react-icons/fi";
import axios from 'axios';
import { createQuestion, updateQuestion } from "../../services/api/questions";
import { showToast } from "../../utils/toastUtils";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getQuestionById } from "../../services/api/questions/index.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const SingleQuestionUpload = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [questionBanks, setQuestionBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(editId);

  // Math subtopics hierarchy
  const mathSubtopics = {
    'algebra': {
      label: 'Algebra',
      subtopics: {
        'expression': 'Expression',
        'linear-equations': 'Linear Equations',
        'linear-system-equations': 'Linear System of Equations',
        'linear-functions': 'Linear Functions',
        'linear-inequalities': 'Linear Inequalities'
      }
    },
    'advance-math': {
      label: 'Advance Math',
      subtopics: {
        'polynomials': 'Polynomials',
        'exponents-radicals': 'Exponents & Radicals',
        'functions-notation': 'Functions & Function Notations',
        'exponential-functions': 'Exponential Functions',
        'quadratics': 'Quadratics'
      }
    },
    'word-problem-data-analysis': {
      label: 'Word Problem and Data Analysis',
      subtopics: {}
    },
    'geometry': {
      label: 'Geometry',
      subtopics: {}
    }
  };

  // Reading and Writing subtopics hierarchy
  const readingWritingTopics = {
    'reading': 'Reading',
    'writing': 'Writing'
  };

  // Single question form state
  const [singleQuestion, setSingleQuestion] = useState({
    questionBankId: '',
    subject: 'Math',
    moduleType: 'Base',
    difficulty: 'Easy',
    questionType: 'single',
    mathTopic: '',
    mathSubtopic: '',
    readingWritingTopic: '',
    questionParagraph: '',
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A',
    explanation: '',
    passageText: '',
    tags: '',
    title: '',
    estimatedTime: 60,
    questionImage: null,
    imagePreview: null
  });

  useEffect(() => {
    fetchQuestionBanks();
    if (editId) {
      loadQuestionForEdit(editId);
    }
  }, [editId]);

  useEffect(() => {
    console.log('QuestionBanks state updated:', questionBanks);
    console.log('QuestionBanks length:', questionBanks.length);
  }, [questionBanks]);

  const fetchQuestionBanks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      console.log('Auth token:', token ? 'Token exists' : 'No token found');
      console.log('API URL:', `${API_BASE_URL}/api/questionbankmanagement/question-banks`);
      
      const response = await axios.get(`${API_BASE_URL}/api/questionbankmanagement/question-banks`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "69420",
        },
      });
      
      const banks = response.data.data || [];
      console.log('Fetched question banks:', banks);
      console.log('Response structure:', response.data);
      setQuestionBanks(banks);
      
      if (banks.length === 0) {
        showToast('No question banks found. Please create question banks in Course Management first.', 'warning');
      }
    } catch (error) {
      console.error('Error fetching question banks:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      showToast('Failed to load question banks. Please check your connection and try again.', 'error');
      setQuestionBanks([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for data processing
  const safeParseArray = (val) => {
    try {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || trimmed.startsWith('{')) {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed : [];
        }
        return trimmed.split(',').map(t => t.replace(/^\[|\]$/g, '').replace(/^\"|\"$/g, '').trim()).filter(Boolean);
      }
      return [];
    } catch (e) {
      try {
        return String(val).split(',').map(t => t.replace(/^\[|\]$/g, '').replace(/^\"|\"$/g, '').trim()).filter(Boolean);
      } catch {
        return [];
      }
    }
  };

  const normalizeCorrectAnswer = (val) => {
    if (val === null || val === undefined) return 'A';
    const letterFromIndex = (i) => ['A','B','C','D'][i] || 'A';
    if (typeof val === 'number') return letterFromIndex(val);
    const s = String(val).trim();
    if (/^[0-3]$/.test(s)) return letterFromIndex(parseInt(s, 10));
    const upper = s.toUpperCase();
    if (["A","B","C","D"].includes(upper)) return upper;
    const match = upper.match(/([A-D])/);
    return match ? match[1] : 'A';
  };

  const parseContentBlocks = (content, isPassageBased) => {
    const result = { paragraph: '', passage: '', question: (content || '') };
    if (!content) return result;
    const blocks = String(content).split(/\n\s*\n+/).map(b => b.trim()).filter(Boolean);
    if (blocks.length === 0) return result;

    if (isPassageBased) {
      if (blocks.length >= 3) {
        result.paragraph = blocks[0];
        result.passage = blocks[1];
        result.question = blocks.slice(2).join('\n\n');
      } else if (blocks.length === 2) {
        result.passage = blocks[0];
        result.question = blocks[1];
      } else {
        result.question = blocks[0];
      }
    } else {
      if (blocks.length >= 2) {
        result.paragraph = blocks[0];
        result.question = blocks.slice(1).join('\n\n');
      } else {
        result.question = blocks[0];
      }
    }
    return result;
  };

  const inferMathFromTags = (tagsArr) => {
    if (!Array.isArray(tagsArr)) return { topic: '', subtopic: '' };
    for (const topicKey of Object.keys(mathSubtopics)) {
      if (tagsArr.includes(topicKey)) {
        const subKeys = Object.keys(mathSubtopics[topicKey]?.subtopics || {});
        const sub = subKeys.find(sk => tagsArr.includes(sk)) || '';
        return { topic: topicKey, subtopic: sub };
      }
    }
    return { topic: '', subtopic: '' };
  };

  const toDifficultyLabel = (val) => {
    if (typeof val === 'string') {
      const v = val.toLowerCase();
      if (v.includes('easy')) return 'Easy';
      if (v.includes('medium')) return 'Medium';
      if (v.includes('hard')) return 'Hard';
    }
    return ({1: 'Easy', 2: 'Medium', 3: 'Hard'})[val] || 'Easy';
  };

  const toTestTypeLabel = (val) => {
    if (typeof val === 'string') {
      const v = val.toLowerCase();
      if (v.includes('adaptive')) return 'Adaptive';
      if (v.includes('base')) return 'Base';
    }
    return ({1: 'Base', 2: 'Adaptive'})[val] || 'Base';
  };

  const loadQuestionForEdit = async (questionId) => {
    try {
      setLoading(true);
      console.log('Loading question for edit:', questionId);
      
      let data;
      try {
        console.log('Fetching detailed question data for ID:', questionId);
        const detail = await getQuestionById(questionId);
        console.log('API response structure:', detail);
        data = detail?.data || detail;
        console.log('Processed question data:', data);
        
        if (!data || Object.keys(data).length === 0) {
          console.warn('Empty data received from API');
          showToast('No question data found', 'error');
          return;
        }
      } catch (err) {
        console.error('getQuestionById API call failed:', err);
        showToast('Failed to load question data', 'error');
        return;
      }

      // Enhanced data extraction with better fallbacks
      const subjectRaw = data.subject ?? data.Subject ?? 'Math';
      const difficultyRaw = data.difficulty ?? data.Difficulty ?? 1;
      const testTypeRaw = data.testType ?? data.TestType ?? 1;
      const options = safeParseArray(data.options ?? data.Options ?? []);
      const tagsArr = safeParseArray(data.tags ?? data.Tags ?? []);
      const contentRaw = data.content ?? data.Content ?? data.title ?? data.Title ?? '';
      const titleRaw = data.title ?? data.Title ?? '';
      const correctAnswerRaw = data.correctAnswer ?? data.CorrectAnswer ?? 'A';
      const explanationRaw = data.explanation ?? data.Explanation ?? '';
      const questionParagraphRaw = data.questionParagraph ?? data.QuestionParagraph ?? '';
      const typeRaw = data.type ?? data.Type ?? data.questionType ?? data.QuestionType ?? 1;
      const imageUrlRaw = data.imageUrl ?? data.ImageUrl ?? null;

      console.log('Raw API response data:', data);
      console.log('Extracted data:', {
        subjectRaw, difficultyRaw, testTypeRaw, options, tagsArr, contentRaw, correctAnswerRaw,
        titleRaw, questionParagraphRaw, typeRaw, imageUrlRaw
      });

      // Enhanced subject normalization
      let subjectNormalized = 'Math';
      if (typeof subjectRaw === 'string') {
        const subjectLower = subjectRaw.toLowerCase();
        if (subjectLower.includes('reading') || subjectLower.includes('writing') || subjectLower.includes('english')) {
          subjectNormalized = 'Reading and Writing';
        }
      }

      const mathGuess = subjectNormalized === 'Math' ? inferMathFromTags(tagsArr) : { topic: '', subtopic: '' };
      const lowerTags = tagsArr.map(t => String(t).toLowerCase());
      
      // Enhanced passage detection
      let isPassageBased = false;
      if (typeof typeRaw === 'string') {
        isPassageBased = typeRaw.toLowerCase().includes('passage');
      } else if (typeof typeRaw === 'number') {
        isPassageBased = typeRaw === 2;
      }
      // Also check content length as a heuristic
      if (!isPassageBased && contentRaw && contentRaw.length > 500) {
        isPassageBased = true;
      }

      const parsed = parseContentBlocks(contentRaw, isPassageBased);
      const finalParagraph = questionParagraphRaw || parsed.paragraph || '';
      const finalPassage = isPassageBased ? (parsed.passage || '') : '';
      const finalQuestion = parsed.question || contentRaw || '';

      // Enhanced Reading/Writing topic detection
      let readingWritingTopic = '';
      if (subjectNormalized === 'Reading and Writing') {
        if (lowerTags.includes('reading') || lowerTags.some(tag => tag.includes('read'))) {
          readingWritingTopic = 'reading';
        } else if (lowerTags.includes('writing') || lowerTags.some(tag => tag.includes('writ'))) {
          readingWritingTopic = 'writing';
        }
      }

      const formData = {
        questionBankId: data.questionBankId || '',
        subject: subjectNormalized,
        moduleType: toTestTypeLabel(testTypeRaw),
        difficulty: toDifficultyLabel(difficultyRaw),
        questionType: isPassageBased ? 'passage-based' : 'single',
        questionParagraph: finalParagraph,
        questionText: finalQuestion,
        optionA: options[0] || '',
        optionB: options[1] || '',
        optionC: options[2] || '',
        optionD: options[3] || '',
        correctAnswer: normalizeCorrectAnswer(correctAnswerRaw),
        explanation: explanationRaw,
        passageText: finalPassage,
        tags: tagsArr.join(', '),
        questionImage: imageUrlRaw ? { url: imageUrlRaw } : null,
        imagePreview: imageUrlRaw,
        mathTopic: mathGuess.topic,
        mathSubtopic: mathGuess.subtopic,
        readingWritingTopic: readingWritingTopic,
        title: titleRaw,
        estimatedTime: 60
      };

      console.log('Final form data being set:', formData);
      console.log('Form field mapping check:', {
        'Question Bank ID': formData.questionBankId,
        'Subject': formData.subject,
        'Math Topic': formData.mathTopic,
        'Math Subtopic': formData.mathSubtopic,
        'Module Type': formData.moduleType,
        'Difficulty': formData.difficulty,
        'Question Type': formData.questionType,
        'Question Title': formData.title,
        'Question Paragraph': formData.questionParagraph,
        'Question Text': formData.questionText
      });
      
      setSingleQuestion(formData);
      setEditingQuestionId(questionId);
      showToast('Question loaded for editing successfully', 'success');
      
    } catch (error) {
      console.error('Failed to load question for editing:', error);
      showToast(`Failed to load question: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingQuestionId(null);
    navigate('/admin/single-question-upload');
    // Reset form to initial state
    setSingleQuestion({
      questionBankId: '',
      subject: 'Math',
      moduleType: 'Base',
      difficulty: 'Easy',
      questionType: 'single',
      mathTopic: '',
      mathSubtopic: '',
      readingWritingTopic: '',
      questionParagraph: '',
      questionText: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctAnswer: 'A',
      explanation: '',
      passageText: '',
      tags: '',
      title: '',
      estimatedTime: 60,
      questionImage: null,
      imagePreview: null
    });
    showToast('Edit cancelled', 'info');
  };

  const getDifficultyEnum = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 1;
      case 'Medium': return 2;
      case 'Hard': return 3;
      default: return 1;
    }
  };

  const getTestTypeEnum = (moduleType) => {
    return moduleType === 'Adaptive' ? 2 : 1;
  };

  const handleSingleQuestionSubmit = async (e) => {
    e.preventDefault();
    
    if (!singleQuestion.questionBankId) {
      showToast('Please select a question bank', 'error');
      return;
    }
    
    if (!singleQuestion.questionText.trim()) {
      showToast('Please enter the question text', 'error');
      return;
    }
    
    if (!singleQuestion.optionA.trim() || !singleQuestion.optionB.trim() || 
        !singleQuestion.optionC.trim() || !singleQuestion.optionD.trim()) {
      showToast('Please fill in all answer options', 'error');
      return;
    }
    
    if (singleQuestion.subject === 'Math' && !singleQuestion.mathTopic) {
      showToast('Please select a math topic', 'error');
      return;
    }
    
    if (singleQuestion.subject === 'Reading and Writing' && !singleQuestion.readingWritingTopic) {
      showToast('Please select a topic', 'error');
      return;
    }

    try {
      setLoading(true);
      
      let tagsArray = singleQuestion.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      if (singleQuestion.subject === 'Math') {
        if (singleQuestion.mathTopic) {
          tagsArray.push(singleQuestion.mathTopic);
        }
        if (singleQuestion.mathSubtopic) {
          tagsArray.push(singleQuestion.mathSubtopic);
        }
      }
      
      if (singleQuestion.subject === 'Reading and Writing') {
        if (singleQuestion.readingWritingTopic) {
          tagsArray.push(singleQuestion.readingWritingTopic);
        }
      }
      
      let content = '';
      if (singleQuestion.questionParagraph.trim()) {
        content += singleQuestion.questionParagraph + '\n\n';
      }
      
      if (singleQuestion.questionType === 'passage-based') {
        content += `${singleQuestion.passageText}\n\n${singleQuestion.questionText}`;
      } else {
        content += singleQuestion.questionText;
      }
      
      const questionData = {
        title: editingQuestionId && singleQuestion.title ? singleQuestion.title : `${singleQuestion.subject} - ${singleQuestion.moduleType} Question`,
        content: content,
        explanation: singleQuestion.explanation,
        subject: singleQuestion.subject,
        difficulty: getDifficultyEnum(singleQuestion.difficulty),
        type: 1,
        testType: getTestTypeEnum(singleQuestion.moduleType),
        correctAnswer: singleQuestion.correctAnswer,
        options: [
          singleQuestion.optionA,
          singleQuestion.optionB,
          singleQuestion.optionC,
          singleQuestion.optionD
        ],
        tags: tagsArray,
        points: 1,
        questionBankId: singleQuestion.questionBankId,
        questionParagraph: singleQuestion.questionParagraph,
        imageUrl: singleQuestion.imagePreview || null
      };
      
      if (editingQuestionId) {
        await updateQuestion(editingQuestionId, questionData);
        showToast('Question updated successfully!', 'success');
        navigate('/admin/manage-questions');
      } else {
        await createQuestion(questionData);
        setSingleQuestion({
          ...singleQuestion,
          mathTopic: '',
          mathSubtopic: '',
          readingWritingTopic: '',
          questionParagraph: '',
          questionText: '',
          optionA: '',
          optionB: '',
          optionC: '',
          optionD: '',
          explanation: '',
          passageText: '',
          tags: '',
          questionImage: null,
          imagePreview: null
        });
        showToast('Question uploaded successfully!', 'success');
      }
    } catch (error) {
      console.error('Error uploading question:', error);
      showToast('Failed to save question', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {editingQuestionId ? 'Edit Question' : 'Single Question Upload'}
          </h1>
          <p className="text-gray-600">
            {editingQuestionId ? 'Modify the question details below' : 'Upload individual SAT questions with detailed options and explanations'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          {editingQuestionId && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FiCheck className="text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-800">
                    Editing Question ID: {editingQuestionId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                >
                  <FiX className="mr-1" /> Cancel Edit
                </button>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSingleQuestionSubmit} className="space-y-6">
            {/* Question Bank Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Bank *
                </label>
                <select
                  value={singleQuestion.questionBankId}
                  onChange={(e) => setSingleQuestion({ ...singleQuestion, questionBankId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={loading || questionBanks.length === 0}
                >
                  <option value="">
                    {loading ? 'Loading question banks...' : 
                     questionBanks.length === 0 ? 'No question banks available' : 
                     'Select Question Bank'}
                  </option>
                  {questionBanks.map(bank => (
                    <option key={bank.Id} value={bank.Id}>{bank.Name}</option>
                  ))}
                </select>
                {questionBanks.length === 0 && !loading && (
                  <p className="text-sm text-amber-600 mt-1">
                    No question banks found. Please create question banks in Course Management first.
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <select
                  value={singleQuestion.subject}
                  onChange={(e) => setSingleQuestion({ ...singleQuestion, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Math">Math</option>
                  <option value="Reading and Writing">Reading and Writing</option>
                </select>
              </div>
            </div>

            {/* Math Topic Selection */}
            {singleQuestion.subject === 'Math' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Math Topic *
                  </label>
                  <select
                    value={singleQuestion.mathTopic}
                    onChange={(e) => {
                      setSingleQuestion({ 
                        ...singleQuestion, 
                        mathTopic: e.target.value,
                        mathSubtopic: ''
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={singleQuestion.subject === 'Math'}
                  >
                    <option value="">Select Math Topic</option>
                    {Object.entries(mathSubtopics).map(([key, topic]) => (
                      <option key={key} value={key}>{topic.label}</option>
                    ))}
                  </select>
                </div>
                
                {singleQuestion.mathTopic && Object.keys(mathSubtopics[singleQuestion.mathTopic]?.subtopics || {}).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Math Subtopic *
                    </label>
                    <select
                      value={singleQuestion.mathSubtopic}
                      onChange={(e) => setSingleQuestion({ ...singleQuestion, mathSubtopic: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={singleQuestion.subject === 'Math' && Object.keys(mathSubtopics[singleQuestion.mathTopic]?.subtopics || {}).length > 0}
                    >
                      <option value="">Select Math Subtopic</option>
                      {Object.entries(mathSubtopics[singleQuestion.mathTopic]?.subtopics || {}).map(([key, subtopic]) => (
                        <option key={key} value={key}>{subtopic}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Reading and Writing Topic Selection */}
            {singleQuestion.subject === 'Reading and Writing' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Topic *
                  </label>
                  <select
                    value={singleQuestion.readingWritingTopic}
                    onChange={(e) => {
                      setSingleQuestion({ 
                        ...singleQuestion, 
                        readingWritingTopic: e.target.value
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={singleQuestion.subject === 'Reading and Writing'}
                  >
                    <option value="">Select Topic</option>
                    {Object.entries(readingWritingTopics).map(([key, topic]) => (
                      <option key={key} value={key}>{topic}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Module Type and Difficulty */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Module Type *
                </label>
                <select
                  value={singleQuestion.moduleType}
                  onChange={(e) => setSingleQuestion({ ...singleQuestion, moduleType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Base">Base Module</option>
                  <option value="Adaptive">Adaptive Module</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty *
                </label>
                <select
                  value={singleQuestion.difficulty}
                  onChange={(e) => setSingleQuestion({ ...singleQuestion, difficulty: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Type *
                </label>
                <select
                  value={singleQuestion.questionType}
                  onChange={(e) => setSingleQuestion({ ...singleQuestion, questionType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="single">Single Question</option>
                  <option value="passage-based">Passage-based</option>
                </select>
              </div>
            </div>

            {/* Question Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Title {editingQuestionId ? '*' : '(Optional)'}
              </label>
              <input
                type="text"
                value={singleQuestion.title || ''}
                onChange={(e) => setSingleQuestion({ ...singleQuestion, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={editingQuestionId ? "Enter question title..." : "Auto-generated if left empty"}
              />
            </div>

            {/* Passage Text (if passage-based) */}
            {singleQuestion.questionType === 'passage-based' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiBook className="inline mr-1" />
                  Passage Text *
                </label>
                <textarea
                  value={singleQuestion.passageText}
                  onChange={(e) => setSingleQuestion({ ...singleQuestion, passageText: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter the reading passage here..."
                />
              </div>
            )}

            {/* Question Paragraph */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Paragraph (Optional)
              </label>
              <textarea
                value={singleQuestion.questionParagraph}
                onChange={(e) => setSingleQuestion({ ...singleQuestion, questionParagraph: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter optional paragraph or context for the question..."
              />
            </div>

            {/* Question Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Text *
              </label>
              <textarea
                value={singleQuestion.questionText}
                onChange={(e) => setSingleQuestion({ ...singleQuestion, questionText: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter the question text..."
                required
              />
            </div>

            {/* Answer Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Answer Options *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Option A</label>
                  <input
                    type="text"
                    value={singleQuestion.optionA}
                    onChange={(e) => setSingleQuestion({ ...singleQuestion, optionA: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Option A"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Option B</label>
                  <input
                    type="text"
                    value={singleQuestion.optionB}
                    onChange={(e) => setSingleQuestion({ ...singleQuestion, optionB: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Option B"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Option C</label>
                  <input
                    type="text"
                    value={singleQuestion.optionC}
                    onChange={(e) => setSingleQuestion({ ...singleQuestion, optionC: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Option C"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Option D</label>
                  <input
                    type="text"
                    value={singleQuestion.optionD}
                    onChange={(e) => setSingleQuestion({ ...singleQuestion, optionD: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Option D"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Correct Answer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiTarget className="inline mr-1" />
                  Correct Answer *
                </label>
                <select
                  value={singleQuestion.correctAnswer}
                  onChange={(e) => setSingleQuestion({ ...singleQuestion, correctAnswer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={singleQuestion.tags}
                  onChange={(e) => setSingleQuestion({ ...singleQuestion, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., algebra, equations, basic"
                />
              </div>
            </div>

            {/* Explanation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Explanation (Optional)
              </label>
              <textarea
                value={singleQuestion.explanation}
                onChange={(e) => setSingleQuestion({ ...singleQuestion, explanation: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Provide a detailed explanation for the correct answer..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline mr-2"></div>
                    {editingQuestionId ? 'Updating...' : 'Uploading...'}
                  </>
                ) : (
                  <>
                    {editingQuestionId ? (
                      <>
                        <FiCheck className="inline mr-2" />
                        Update Question
                      </>
                    ) : (
                      <>
                        <FiPlus className="inline mr-2" />
                        Upload Question
                      </>
                    )}
                  </>
                )}
              </button>
              {editingQuestionId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="ml-3 px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 border border-gray-300"
                  disabled={loading}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SingleQuestionUpload;