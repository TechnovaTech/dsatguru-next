import { FiUpload, FiPlus, FiSearch, FiEdit } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const SATQuestionUpload = () => {
  const navigate = useNavigate();

  const navigationCards = [
    {
      id: 'single',
      title: 'Single Question Upload',
      description: 'Upload individual SAT questions with detailed options and explanations',
      icon: FiPlus,
      route: '/admin/single-question-upload',
      color: 'blue',
      features: [
        'Individual question creation',
        'Rich text editor support',
        'Math and Reading/Writing topics',
        'Passage-based questions',
        'Image upload support'
      ]
    },
    {
      id: 'bulk',
      title: 'Bulk Upload',
      description: 'Upload multiple questions at once using CSV files with optional images',
      icon: FiUpload,
      route: '/admin/bulk-upload',
      color: 'green',
      features: [
        'CSV file upload',
        'Batch image processing',
        'Template download',
        'Upload progress tracking',
        'Error validation'
      ]
    },
    {
      id: 'manage',
      title: 'Manage Questions',
      description: 'View, edit, and delete existing questions from your question banks',
      icon: FiSearch,
      route: '/admin/manage-questions',
      color: 'purple',
      features: [
        'Search and filter questions',
        'Edit existing questions',
        'Delete questions',
        'Pagination support',
        'Question bank management'
      ]
    }
  ];

  const handleNavigate = (route) => {
    navigate(route);
  };

  const getColorClasses = (color) => {
    const colorMap = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        button: 'bg-blue-600 hover:bg-blue-700',
        accent: 'text-blue-600'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: 'text-green-600',
        button: 'bg-green-600 hover:bg-green-700',
        accent: 'text-green-600'
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        icon: 'text-purple-600',
        button: 'bg-purple-600 hover:bg-purple-700',
        accent: 'text-purple-600'
      }
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            SAT Question Management
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose how you'd like to work with SAT questions. Upload individual questions, 
            bulk upload from CSV files, or manage your existing question library.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {navigationCards.map((card) => {
            const Icon = card.icon;
            const colors = getColorClasses(card.color);
            
            return (
              <div
                key={card.id}
                className={`${colors.bg} ${colors.border} border-2 rounded-xl p-6 transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer`}
                onClick={() => handleNavigate(card.route)}
              >
                <div className="text-center mb-6">
                  <div className={`inline-flex items-center justify-center w-16 h-16 ${colors.bg} rounded-full mb-4`}>
                    <Icon className={`w-8 h-8 ${colors.icon}`} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {card.title}
                  </h3>
                  <p className="text-gray-600">
                    {card.description}
                  </p>
                </div>

                <div className="space-y-2 mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Features:</h4>
                  {card.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-600">
                      <div className={`w-1.5 h-1.5 ${colors.button.split(' ')[0]} rounded-full mr-2`}></div>
                      {feature}
                    </div>
                  ))}
                </div>

                <button
                  className={`w-full ${colors.button} text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigate(card.route);
                  }}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  Get Started
                </button>
              </div>
            );
          })}
        </div>

        {/* Quick Stats or Additional Info */}
        <div className="mt-12 bg-white rounded-xl shadow-sm p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Question Management Tips
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <FiPlus className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Single Upload</h3>
                <p className="text-sm text-gray-600">
                  Perfect for creating detailed questions with rich formatting and immediate preview.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <FiUpload className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Bulk Upload</h3>
                <p className="text-sm text-gray-600">
                  Ideal for importing large question sets from existing materials or databases.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <FiEdit className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Manage</h3>
                <p className="text-sm text-gray-600">
                  Organize, edit, and maintain your question library with powerful search and filtering.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SATQuestionUpload;