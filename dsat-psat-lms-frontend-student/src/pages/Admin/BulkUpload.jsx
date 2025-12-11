import { useState, useEffect } from "react";
import { FiUpload, FiX, FiCheck, FiAlertCircle, FiImage, FiDownload } from "react-icons/fi";
import axios from 'axios';
import { bulkUploadQuestions } from "../../services/api/questions";
import { showToast } from "../../utils/toastUtils";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const BulkUpload = () => {
  const navigate = useNavigate();
  const [questionBanks, setQuestionBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Bulk upload state
  const [bulkUpload, setBulkUpload] = useState({
    questionBankId: '',
    file: null,
    images: [],
    imagePreviews: [],
    csvRecords: null,
    mapping: null
  });

  useEffect(() => {
    fetchQuestionBanks();
  }, []);

  const fetchQuestionBanks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/questions/question-banks`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          "ngrok-skip-browser-warning": "69420",
        },
      });
      
      const banks = response.data.data || [];
      setQuestionBanks(banks);
      
      if (banks.length === 0) {
        showToast('No question banks found. Please create question banks in Course Management first.', 'warning');
      }
    } catch (error) {
      console.error('Error fetching question banks:', error);
      showToast('Failed to load question banks. Please check your connection and try again.', 'error');
      setQuestionBanks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkUpload.questionBankId) {
      showToast('Please select a question bank', 'error');
      return;
    }
    
    if (!bulkUpload.file) {
      showToast('Please select a CSV file', 'error');
      return;
    }

    try {
      setLoading(true);
      setUploadProgress(0);
      
      const formData = new FormData();
      formData.append('file', bulkUpload.file);
      formData.append('questionBankId', bulkUpload.questionBankId);
      
      // Append image files
      bulkUpload.images.forEach((image, index) => {
        formData.append(`images`, image);
      });
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      // Store selected bank id for navigation after reset
      const selectedBankId = bulkUpload.questionBankId;

      await bulkUploadQuestions(formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Reset form
      bulkUpload.imagePreviews.forEach(preview => {
        URL.revokeObjectURL(preview.url);
      });
      
      setBulkUpload({
        questionBankId: selectedBankId,
        file: null,
        images: [],
        imagePreviews: [],
        csvRecords: null,
        mapping: null
      });
      
      showToast('Questions uploaded successfully!', 'success');
      
      // Navigate to manage questions after successful upload
      setTimeout(() => {
        navigate('/admin/manage-questions');
      }, 2000);
      
    } catch (error) {
      console.error('Error uploading questions:', error);
      showToast('Failed to upload questions', 'error');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        showToast('Please select a valid CSV file', 'error');
        return;
      }
      
      setBulkUpload({ ...bulkUpload, file });
      
      // Parse CSV for preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const csvText = event.target.result;
        const records = parseCsvForPreview(csvText);
        const mapping = computeImageMapping(records, bulkUpload.images);
        setBulkUpload(prev => ({ ...prev, csvRecords: records, mapping }));
      };
      reader.readAsText(file);
    }
  };

  const handleImageFilesChange = (e) => {
    const files = Array.from(e.target.files);
    const validImages = files.filter(file => file.type.startsWith('image/'));
    
    if (validImages.length !== files.length) {
      showToast('Some files were skipped as they are not valid images', 'warning');
    }
    
    // Create preview URLs
    const previews = validImages.map(file => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name
    }));
    
    // Clean up old previews
    bulkUpload.imagePreviews.forEach(preview => {
      URL.revokeObjectURL(preview.url);
    });
    
    const mapping = computeImageMapping(bulkUpload.csvRecords, validImages);
    setBulkUpload({ 
      ...bulkUpload, 
      images: validImages, 
      imagePreviews: previews,
      mapping 
    });
  };

  const parseCsvForPreview = (text) => {
    const rows = [];
    let i = 0;
    while (i < text.length) {
      const row = [];
      while (i < text.length) {
        let field = '';
        let inQuotes = false;
        
        // Skip leading whitespace
        while (i < text.length && (text[i] === ' ' || text[i] === '\t')) i++;
        
        // Check if field starts with quote
        if (i < text.length && text[i] === '"') {
          inQuotes = true;
          i++; // Skip opening quote
        }
        
        while (i < text.length) {
          const char = text[i];
          
          if (inQuotes) {
            if (char === '"') {
              // Check for escaped quote
              if (i + 1 < text.length && text[i + 1] === '"') {
                field += '"';
                i += 2;
                continue;
              } else {
                // End of quoted field
                inQuotes = false;
                i++;
                break;
              }
            } else {
              field += char;
              i++;
            }
          } else {
            if (char === ',') {
              i++; // Skip comma
              break;
            } else if (char === '\n' || char === '\r') {
              break;
            } else {
              field += char;
              i++;
            }
          }
        }
        
        row.push(field.trim());
        
        // Skip comma if we're at one
        if (i < text.length && text[i] === ',') {
          i++;
        } else {
          break;
        }
      }
      
      if (row.length > 0) {
        rows.push(row);
      }
      
      // Skip to next line
      while (i < text.length && (text[i] === '\n' || text[i] === '\r')) {
        i++;
      }
    }

    if (rows.length === 0) return [];

    const header = rows[0].map(h => (h || '').trim());
    const idxImage = header.findIndex(h => h.toLowerCase() === 'imagefilename');
    const idxTitle = header.findIndex(h => h.toLowerCase() === 'title');
    const idxContent = header.findIndex(h => h.toLowerCase() === 'content');

    const records = [];
    for (let r = 1; r < rows.length; r++) {
      const cols = rows[r];
      if (!cols || cols.length === 0) continue;
      const imageName = (cols[idxImage] || '').trim();
      const title = (idxTitle >= 0 ? (cols[idxTitle] || '').trim() : '');
      const content = (idxContent >= 0 ? (cols[idxContent] || '').trim() : '');
      const labelSource = title || content;
      const label = labelSource ? (labelSource.length > 80 ? labelSource.slice(0, 77) + '...' : labelSource) : `Row ${r + 1}`;
      records.push({ row: r + 1, imageFileName: imageName, label });
    }
    return records;
  };

  const computeImageMapping = (records, images) => {
    if (!records || records.length === 0) {
      return null;
    }
    const fileMap = new Map();
    (images || []).forEach(f => fileMap.set(f.name.toLowerCase(), f.name));

    const entries = records
      .filter(rec => rec.imageFileName !== '')
      .map(rec => {
        const key = rec.imageFileName.toLowerCase();
        const found = fileMap.get(key);
        return {
          csvRow: rec.row,
          csvImageName: rec.imageFileName,
          label: rec.label,
          foundImage: found || null,
          status: found ? 'matched' : 'missing'
        };
      });

    const totalWithImages = entries.length;
    const matched = entries.filter(e => e.status === 'matched').length;
    const missing = totalWithImages - matched;

    return {
      entries,
      summary: { totalWithImages, matched, missing }
    };
  };

  const downloadTemplate = () => {
    window.open(`${API_BASE_URL}/api/questions/template`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bulk Question Upload
          </h1>
          <p className="text-gray-600">
            Upload multiple SAT questions at once using a CSV file with optional images
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="space-y-6">
            {/* Question Bank Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Bank *
              </label>
              <select
                value={bulkUpload.questionBankId}
                onChange={(e) => setBulkUpload({ ...bulkUpload, questionBankId: e.target.value })}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading || questionBanks.length === 0}
              >
                <option value="">
                  {loading ? 'Loading question banks...' : 
                   questionBanks.length === 0 ? 'No question banks available' : 
                   'Select Question Bank'}
                </option>
                {questionBanks.map(bank => (
                  <option key={bank.id} value={bank.id}>{bank.title}</option>
                ))}
              </select>
              {questionBanks.length === 0 && !loading && (
                <p className="text-sm text-amber-600 mt-1">
                  No question banks found. Please create question banks in Course Management first.
                </p>
              )}
            </div>

            {/* Template Download */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-start">
                <FiDownload className="text-blue-600 mt-0.5 mr-3" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-blue-800 mb-1">
                    Download CSV Template
                  </h3>
                  <p className="text-sm text-blue-600 mb-3">
                    Use our template to ensure your CSV file has the correct format and required columns.
                  </p>
                  <button
                    onClick={downloadTemplate}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    <FiDownload className="mr-1" />
                    Download Template
                  </button>
                </div>
              </div>
            </div>

            {/* CSV File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSV File *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <FiUpload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-2">
                    {bulkUpload.file ? bulkUpload.file.name : 'Click to upload CSV file or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-500">
                    CSV files only. Maximum file size: 10MB
                  </p>
                </label>
              </div>
              
              {bulkUpload.file && (
                <div className="mt-2 text-sm text-green-600">
                  ✓ File selected: {bulkUpload.file.name} ({(bulkUpload.file.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            {/* Image Files Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Images (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageFilesChange}
                  className="hidden"
                  id="images-upload"
                />
                <label htmlFor="images-upload" className="cursor-pointer">
                  <FiImage className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-2">
                    {bulkUpload.images.length > 0 
                      ? `${bulkUpload.images.length} image(s) selected` 
                      : 'Click to upload images or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 5MB each. Select multiple files.
                  </p>
                </label>
              </div>
              
              {bulkUpload.images.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Images:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {bulkUpload.imagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview.url}
                          alt={preview.name}
                          className="w-full h-20 object-cover rounded-md border"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 rounded-b-md truncate">
                          {preview.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CSV Preview and Image Mapping */}
            {bulkUpload.csvRecords && bulkUpload.csvRecords.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">CSV Preview</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Found {bulkUpload.csvRecords.length} question(s) in your CSV file.
                </p>
                
                {bulkUpload.mapping && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Image Mapping Summary:</h4>
                    <div className="bg-white rounded border p-3">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Total with Images:</span>
                          <span className="ml-2">{bulkUpload.mapping.summary.totalWithImages}</span>
                        </div>
                        <div className="text-green-600">
                          <span className="font-medium">Matched:</span>
                          <span className="ml-2">{bulkUpload.mapping.summary.matched}</span>
                        </div>
                        <div className="text-red-600">
                          <span className="font-medium">Missing:</span>
                          <span className="ml-2">{bulkUpload.mapping.summary.missing}</span>
                        </div>
                      </div>
                      
                      {bulkUpload.mapping.summary.missing > 0 && (
                        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded">
                          <p className="text-sm text-amber-800">
                            ⚠️ Some questions reference images that weren't found in your uploaded files. 
                            These questions will be created without images.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="max-h-64 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Question Preview</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bulkUpload.csvRecords.slice(0, 10).map((record, index) => {
                        const mappingEntry = bulkUpload.mapping?.entries.find(e => e.csvRow === record.row);
                        return (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{record.row}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{record.label}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {record.imageFileName || '-'}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {mappingEntry ? (
                                <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                  mappingEntry.status === 'matched' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {mappingEntry.status === 'matched' ? '✓ Matched' : '✗ Missing'}
                                </span>
                              ) : (
                                <span className="text-gray-400">No image</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {bulkUpload.csvRecords.length > 10 && (
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      ... and {bulkUpload.csvRecords.length - 10} more questions
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {uploadProgress > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-center mb-2">
                  <FiUpload className="text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-800">Uploading Questions...</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-blue-600 mt-1">{uploadProgress}% complete</p>
              </div>
            )}

            {/* Upload Instructions */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Upload Instructions:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Download the CSV template and fill in your question data</li>
                <li>• Required columns: Title, Content, Subject, Difficulty, TestType, CorrectAnswer, OptionA-D</li>
                <li>• Optional columns: QuestionParagraph, Explanation, Tags, ImageFileName</li>
                <li>• If using images, upload them separately and reference by filename in the CSV</li>
                <li>• Supported subjects: "Math", "Reading and Writing"</li>
                <li>• Difficulty levels: "Easy", "Medium", "Hard"</li>
                <li>• Test types: "Base", "Adaptive"</li>
              </ul>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                onClick={handleBulkUpload}
                disabled={loading || !bulkUpload.questionBankId || !bulkUpload.file}
                className={`px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  (loading || !bulkUpload.questionBankId || !bulkUpload.file) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <FiUpload className="inline mr-2" />
                    Upload Questions
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkUpload;