import api from './index';

// User Study Plan APIs
export const getUserStudyPlan = async () => {
  try {
    const response = await api.get('/api/StudyPlan/user/study-plan');
    return response.data;
  } catch (error) {
    console.error('Error fetching user study plan:', error);
    throw error;
  }
};

export const startModule = async (moduleId) => {
  try {
    const response = await api.post(`/api/StudyPlan/user/modules/${moduleId}/start`);
    return response.data;
  } catch (error) {
    console.error('Error starting module:', error);
    throw error;
  }
};

export const completeModule = async (moduleId, score) => {
  try {
    const response = await api.post(`/api/StudyPlan/user/modules/${moduleId}/complete`, {
      score
    });
    return response.data;
  } catch (error) {
    console.error('Error completing module:', error);
    throw error;
  }
};

// Admin Study Plan APIs
export const getAllModules = async () => {
  try {
    const response = await api.get('/api/StudyPlan/modules');
    return response.data;
  } catch (error) {
    console.error('Error fetching all modules:', error);
    throw error;
  }
};

export const getModule = async (moduleId) => {
  try {
    const response = await api.get(`/api/StudyPlan/modules/${moduleId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching module:', error);
    throw error;
  }
};

export const createModule = async (moduleData) => {
  try {
    const response = await api.post('/api/StudyPlan/modules', moduleData);
    return response.data;
  } catch (error) {
    console.error('Error creating module:', error);
    throw error;
  }
};

export const updateModule = async (moduleId, moduleData) => {
  try {
    const response = await api.put(`/api/StudyPlan/modules/${moduleId}`, moduleData);
    return response.data;
  } catch (error) {
    console.error('Error updating module:', error);
    throw error;
  }
};

export const deleteModule = async (moduleId) => {
  try {
    const response = await api.delete(`/api/StudyPlan/modules/${moduleId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting module:', error);
    throw error;
  }
};

export const createRouting = async (routingData) => {
  try {
    const response = await api.post('/api/StudyPlan/routing', routingData);
    return response.data;
  } catch (error) {
    console.error('Error creating routing:', error);
    throw error;
  }
};

export const deleteRouting = async (routingId) => {
  try {
    const response = await api.delete(`/api/StudyPlan/routing/${routingId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting routing:', error);
    throw error;
  }
};