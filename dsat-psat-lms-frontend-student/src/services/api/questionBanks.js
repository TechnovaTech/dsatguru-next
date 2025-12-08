import api from './index';

// Subject mapping for enum conversion
const SUBJECT_MAP = {
  Math: 1,
  'Reading & Writing': 2,
  Verbal: 2, // Legacy mapping
  Reading: 3,
  Writing: 4,
  Science: 5
};

const REVERSE_SUBJECT_MAP = {
  1: 'Math',
  2: 'Reading & Writing',
  3: 'Reading',
  4: 'Writing',
  5: 'Science'
};

// Get all question banks with filtering and pagination
export const getQuestionBanks = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.subject && SUBJECT_MAP[filters.subject]) {
      params.append('subject', SUBJECT_MAP[filters.subject]);
    }
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive);
    if (filters.page) params.append('page', filters.page);
    if (filters.pageSize) params.append('pageSize', filters.pageSize);

    const response = await api.get(`/QuestionBank?${params.toString()}`);
    
    if (response.data.success) {
      // Convert subject enum back to string for frontend
      const questionBanks = response.data.questionBanks.map(bank => ({
        ...bank,
        subject: REVERSE_SUBJECT_MAP[bank.subject] || bank.subject,
        status: bank.isActive ? 'Active' : 'Draft' // Convert isActive to status
      }));
      
      return {
        data: questionBanks, // Frontend expects data property
        pagination: {
          totalCount: response.data.totalCount,
          totalPages: response.data.totalPages,
          currentPage: response.data.currentPage,
          pageSize: response.data.pageSize
        }
      };
    }
    
    throw new Error(response.data.message || 'Failed to fetch question banks');
  } catch (error) {
    console.error('Error fetching question banks:', error);
    throw error;
  }
};

// Get a single question bank by ID
export const getQuestionBank = async (id) => {
  try {
    const response = await api.get(`/QuestionBank/${id}`);
    
    if (response.data.success) {
      const questionBank = {
        ...response.data.questionBank,
        subject: REVERSE_SUBJECT_MAP[response.data.questionBank.subject] || response.data.questionBank.subject
      };
      
      return {
        ...response.data,
        questionBank
      };
    }
    
    throw new Error(response.data.message || 'Failed to fetch question bank');
  } catch (error) {
    console.error('Error fetching question bank:', error);
    throw error;
  }
};

// Create a new question bank
export const createQuestionBank = async (questionBankData) => {
  try {
    const payload = {
      ...questionBankData,
      subject: SUBJECT_MAP[questionBankData.subject] || questionBankData.subject
    };
    
    const response = await api.post('/QuestionBank', payload);
    
    if (response.data.success) {
      return response.data;
    }
    
    throw new Error(response.data.message || 'Failed to create question bank');
  } catch (error) {
    console.error('Error creating question bank:', error);
    throw error;
  }
};

// Update an existing question bank
export const updateQuestionBank = async (id, questionBankData) => {
  try {
    const payload = {
      ...questionBankData,
      subject: SUBJECT_MAP[questionBankData.subject] || questionBankData.subject
    };
    
    const response = await api.put(`/QuestionBank/${id}`, payload);
    
    if (response.data.success) {
      return response.data;
    }
    
    throw new Error(response.data.message || 'Failed to update question bank');
  } catch (error) {
    console.error('Error updating question bank:', error);
    throw error;
  }
};

// Delete a question bank
export const deleteQuestionBank = async (id) => {
  try {
    const response = await api.delete(`/QuestionBank/${id}`);
    
    if (response.data.success) {
      return response.data;
    }
    
    throw new Error(response.data.message || 'Failed to delete question bank');
  } catch (error) {
    console.error('Error deleting question bank:', error);
    throw error;
  }
};

// Get practice options from question banks (subjects, topics, subtopics)
export const getPracticeOptionsFromQuestionBanks = async (questionBankId = null) => {
  try {
    const qs = questionBankId ? `?questionBankId=${encodeURIComponent(questionBankId)}` : '';
    const response = await api.get(`/QuestionBank/practice-options${qs}`);
    
    if (response.data.success) {
      // Convert subject enums back to strings for frontend
      const subjects = response.data.subjects?.map(subjectId => 
        REVERSE_SUBJECT_MAP[subjectId] || subjectId
      ) || [];
      
      return {
        success: true,
        data: {
          subjects,
          topics: response.data.topics || [],
          subtopics: response.data.subtopics || [],
          domains: response.data.topics || [], // Use topics as domains for compatibility
          totalQuestions: response.data.totalQuestions || 0,
          difficultyDistribution: response.data.difficultyDistribution || {},
          statusCounts: response.data.statusCounts || {}
        }
      };
    } else {
      throw new Error(response.data.message || 'Failed to fetch practice options from question banks');
    }
  } catch (error) {
    console.warn('Question banks API not available, using mock data:', error.message);
    // Return mock data matching admin question upload structure
    const mathSubtopics = {
      'Algebra': [
        'Linear equations in one variable',
        'Linear equations in two variables',
        'Linear functions',
        'Systems of two linear equations in two variables',
        'Linear inequalities in one or two variables'
      ],
      'Advanced Math': [
        'Equivalent expressions',
        'Nonlinear equations in one variable',
        'Systems of equations in two variables',
        'Nonlinear functions'
      ],
      'Problem-Solving and Data Analysis': [
        'Ratios, rates, proportional relationships, and units',
        'Percentages',
        'One-variable data: distributions and measures of center and spread',
        'Two-variable data: models and scatterplots',
        'Probability and conditional probability',
        'Inference from sample statistics and margin of error',
        'Evaluating statistical claims: observational studies and experiments'
      ],
      'Geometry and Trigonometry': [
        'Area and volume',
        'Lines, angles, and triangles',
        'Right triangles and trigonometry',
        'Circles'
      ]
    };

    const readingWritingTopics = {
      'Reading': [
        'Information and Ideas',
        'Craft and Structure',
        'Expression of Ideas',
        'Standard English Conventions'
      ],
      'Writing': [
        'Expression of Ideas',
        'Standard English Conventions'
      ]
    };

    // Flatten all topics and subtopics for domains compatibility
    const allTopics = [...Object.keys(mathSubtopics), ...Object.keys(readingWritingTopics)];
    const allSubtopics = [
      ...Object.values(mathSubtopics).flat(),
      ...Object.values(readingWritingTopics).flat()
    ];
    
    return {
      success: true,
      data: {
        subjects: ['All', 'Math', 'Reading & Writing'],
        mathSubtopics,
        readingWritingTopics,
        topics: allTopics,
        subtopics: allSubtopics,
        domains: allTopics, // Use topics as domains for compatibility
        totalQuestions: 1000,
        difficultyDistribution: {
          Easy: 300,
          Medium: 400,
          Hard: 300
        },
        statusCounts: {
          unused: 800,
          incorrect: 100,
          correct: 80,
          mastered: 20
        }
      },
      message: 'Using mock practice options for development'
    };
  }
};

export default {
  getQuestionBanks,
  getQuestionBank,
  createQuestionBank,
  updateQuestionBank,
  deleteQuestionBank,
  getPracticeOptionsFromQuestionBanks
};