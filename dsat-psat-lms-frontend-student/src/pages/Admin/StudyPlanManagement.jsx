import { useEffect, useState } from "react";
import { FiPlus, FiEdit, FiTrash2, FiSave, FiX, FiArrowRight, FiTarget } from "react-icons/fi";
import { 
  getAllModules, 
  getModule, 
  createModule, 
  updateModule, 
  deleteModule, 
  createRouting, 
  deleteRouting
} from "../../services/api/studyPlan";

const StudyPlanManagement = () => {
  const [modules, setModules] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [showRoutingForm, setShowRoutingForm] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    type: 'Base',
    description: '',
    orderIndex: 0
  });
  
  const [routingData, setRoutingData] = useState({
    fromModuleId: '',
    toModuleId: '',
    minScore: 0,
    maxScore: 100,
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const modulesResponse = await getAllModules();
      setModules(modulesResponse || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModule = async (e) => {
    e.preventDefault();
    try {
      // Convert difficulty type string to enum integer
      const difficultyTypeMap = {
        'Base': 0,
        'Easy': 1,
        'Medium': 2,
        'Hard': 3
      };
      
      await createModule({
        ...formData,
        type: difficultyTypeMap[formData.type],

        orderIndex: parseInt(formData.orderIndex)
      });
      await fetchData();
      setShowCreateForm(false);
      resetForm();
    } catch (error) {
      console.error('Error creating module:', error);
      setError('Failed to create module. Please try again.');
    }
  };

  const handleUpdateModule = async (e) => {
    e.preventDefault();
    try {
      // Convert difficulty type string to enum integer
      const difficultyTypeMap = {
        'Base': 0,
        'Easy': 1,
        'Medium': 2,
        'Hard': 3
      };
      
      await updateModule(editingModule.id, {
        ...formData,
        type: difficultyTypeMap[formData.type],

        orderIndex: parseInt(formData.orderIndex)
      });
      await fetchData();
      setEditingModule(null);
      resetForm();
    } catch (error) {
      console.error('Error updating module:', error);
      setError('Failed to update module. Please try again.');
    }
  };

  const handleDeleteModule = async (moduleId) => {
    if (!window.confirm('Are you sure you want to delete this module?')) {
      return;
    }
    
    try {
      await deleteModule(moduleId);
      await fetchData();
    } catch (error) {
      console.error('Error deleting module:', error);
      setError('Failed to delete module. Please try again.');
    }
  };

  const handleCreateRouting = async (e) => {
    e.preventDefault();
    try {
      await createRouting({
        ...routingData,
        minScore: parseFloat(routingData.minScore),
        maxScore: parseFloat(routingData.maxScore)
      });
      await fetchData();
      setShowRoutingForm(null);
      resetRoutingForm();
    } catch (error) {
      console.error('Error creating routing:', error);
      setError('Failed to create routing rule. Please try again.');
    }
  };

  const startEdit = (module) => {
    setEditingModule(module);
    setFormData({
      title: module.title,
      type: module.type,
      description: module.description || '',
      orderIndex: module.orderIndex
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'Base',
      description: '',
      orderIndex: 0
    });
  };

  const resetRoutingForm = () => {
    setRoutingData({
      fromModuleId: '',
      toModuleId: '',
      minScore: 0,
      maxScore: 100,
      description: ''
    });
  };

  const getDifficultyColor = (type) => {
    switch (type) {
      case 'Base':
        return 'bg-gray-100 text-gray-800';
      case 'Easy':
        return 'bg-green-100 text-green-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Study Plan Management</h1>
          <p className="text-gray-600">Create and manage study plan modules and routing logic</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <FiPlus className="w-4 h-4" />
          <span>Create Module</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create/Edit Module Form */}
      {(showCreateForm || editingModule) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingModule ? 'Edit Module' : 'Create New Module'}
            </h2>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setEditingModule(null);
                resetForm();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={editingModule ? handleUpdateModule : handleCreateModule} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Module Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="Base">Base</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              

              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order Index
                </label>
                <input
                  type="number"
                  value={formData.orderIndex}
                  onChange={(e) => setFormData({ ...formData, orderIndex: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingModule(null);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <FiSave className="w-4 h-4" />
                <span>{editingModule ? 'Update' : 'Create'} Module</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modules List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Study Plan Modules</h2>
        </div>
        
        {modules.length === 0 ? (
          <div className="p-12 text-center">
            <FiTarget className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Modules Created</h3>
            <p className="text-gray-600 mb-4">Create your first study plan module to get started.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Module
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {modules.map((module) => (
              <div key={module.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{module.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        getDifficultyColor(module.type)
                      }`}>
                        {module.type}
                      </span>
                      <span className="text-sm text-gray-500">Order: {module.orderIndex}</span>
                    </div>
                    
                    {module.description && (
                      <p className="text-gray-600 mb-2">{module.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Created: {new Date(module.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    {/* Routing Rules */}
                    {module.routingRules && module.routingRules.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Performance Routing:</h4>
                        <div className="space-y-1">
                          {module.routingRules.map((rule) => (
                            <div key={rule.id} className="text-sm text-gray-600 flex items-center space-x-2">
                              <span>Score {rule.minScore}%-{rule.maxScore}%</span>
                              <FiArrowRight className="w-3 h-3" />
                              <span>{modules.find(m => m.id === rule.toModuleId)?.title || 'Unknown Module'}</span>
                              <button
                                onClick={() => deleteRouting(rule.id).then(fetchData)}
                                className="text-red-500 hover:text-red-700 ml-2"
                              >
                                <FiTrash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setShowRoutingForm(module.id);
                        setRoutingData({ ...routingData, fromModuleId: module.id });
                      }}
                      className="text-blue-600 hover:text-blue-800 p-2"
                      title="Add Routing Rule"
                    >
                      <FiArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => startEdit(module)}
                      className="text-blue-600 hover:text-blue-800 p-2"
                      title="Edit Module"
                    >
                      <FiEdit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteModule(module.id)}
                      className="text-red-600 hover:text-red-800 p-2"
                      title="Delete Module"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Routing Form */}
                {showRoutingForm === module.id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Add Performance Routing Rule</h4>
                    <form onSubmit={handleCreateRouting} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Min Score %</label>
                          <input
                            type="number"
                            value={routingData.minScore}
                            onChange={(e) => setRoutingData({ ...routingData, minScore: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            min="0"
                            max="100"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Max Score %</label>
                          <input
                            type="number"
                            value={routingData.maxScore}
                            onChange={(e) => setRoutingData({ ...routingData, maxScore: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            min="0"
                            max="100"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Next Module</label>
                          <select
                            value={routingData.toModuleId}
                            onChange={(e) => setRoutingData({ ...routingData, toModuleId: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            required
                          >
                            <option value="">Select Module</option>
                            {modules.filter(m => m.id !== module.id).map((m) => (
                              <option key={m.id} value={m.id}>{m.title}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end space-x-2">
                          <button
                            type="submit"
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                          >
                            Add Rule
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowRoutingForm(null);
                              resetRoutingForm();
                            }}
                            className="text-gray-600 hover:text-gray-800 px-3 py-1 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                        <input
                          type="text"
                          value={routingData.description}
                          onChange={(e) => setRoutingData({ ...routingData, description: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Optional description for this routing rule"
                        />
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyPlanManagement;