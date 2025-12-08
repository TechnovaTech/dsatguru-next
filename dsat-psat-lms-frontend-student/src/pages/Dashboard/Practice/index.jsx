import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiBook, FiClock, FiPlay, FiAlertTriangle, FiCheckCircle, FiInfo } from "react-icons/fi";
import { getAllEnrolledQuestionBanks } from "../../../services/api/questionBankEnrollments/index.js";
import { showToast } from "../../../utils/toastUtils";

const slugify = (str = "") =>
  str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const Practice = () => {
  const navigate = useNavigate();
  const { qbSlug } = useParams();
  const [loading, setLoading] = useState(true);
  const [questionBank, setQuestionBank] = useState(null);

  const subject = useMemo(() => (questionBank?.subject || "General").toString(), [questionBank]);

  useEffect(() => {
    const verifyEnrollment = async () => {
      try {
        setLoading(true);
        const response = await getAllEnrolledQuestionBanks();
        const banks = Array.isArray(response) ? response : (response?.data || []);
        const matched = banks.find((b) => {
          const questionBankId = b?.id || b?.questionBankId;
          const expectedSlug = `qb-${questionBankId}`;
          return expectedSlug === qbSlug;
        });

        if (!matched) {
          showToast("You must be enrolled in this question bank to access practice.", "error");
          navigate("/dashboard/question-banks", { replace: true });
          return;
        }

        setQuestionBank(matched);
      } catch (err) {
        console.error("Practice page enrollment check failed:", err);
        showToast("Failed to verify enrollment. Please try again.", "error");
        navigate("/dashboard/question-banks", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    verifyEnrollment();
  }, [qbSlug, navigate]);

  const startBase = (targetSubject) => {
    // targetSubject should be 'math' or 'reading-writing'
    const questionBankId = questionBank?.id || questionBank?.questionBankId;
    if (questionBankId) {
      navigate(`/dashboard/sat-test/base/${targetSubject}/${questionBankId}`);
    } else {
      navigate(`/dashboard/sat-test/base/${targetSubject}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading practice details...</p>
        </div>
      </div>
    );
  }

  if (!questionBank) return null;

  const qbName = questionBank?.questionBankName || questionBank?.name || questionBank?.title || "Practice";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-semibold text-gray-900">{qbName} - Practice</h1>
          <p className="text-gray-600 mt-1">Subject: {subject}</p>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Diagnostic Assessment Intro */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Diagnostic Assessment</h2>
          <p className="text-gray-600 mb-6">
            Take our comprehensive diagnostic test to identify your strengths and weaknesses. This will help us create a personalized study plan just for you.
          </p>

          {/* What to Expect */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border p-4 flex items-start gap-3">
              <FiClock className="text-blue-600 mt-1" size={20} />
              <div>
                <p className="font-medium text-gray-900">90 Minutes</p>
                <p className="text-sm text-gray-600">Complete assessment duration</p>
              </div>
            </div>
            <div className="rounded-lg border p-4 flex items-start gap-3">
              <FiBook className="text-green-600 mt-1" size={20} />
              <div>
                <p className="font-medium text-gray-900">Math Section</p>
                <p className="text-sm text-gray-600">27 questions, 45 minutes</p>
              </div>
            </div>
            <div className="rounded-lg border p-4 flex items-start gap-3">
              <FiBook className="text-purple-600 mt-1" size={20} />
              <div>
                <p className="font-medium text-gray-900">Reading & Writing</p>
                <p className="text-sm text-gray-600">27 questions, 45 minutes</p>
              </div>
            </div>
            <div className="rounded-lg border p-4 flex items-start gap-3">
              <FiCheckCircle className="text-emerald-600 mt-1" size={20} />
              <div>
                <p className="font-medium text-gray-900">Detailed Analysis</p>
                <p className="text-sm text-gray-600">Comprehensive performance report</p>
              </div>
            </div>
          </div>
        </div>

        {/* SAT Test Structure */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">SAT Test Structure</h2>

          {/* Base Module */}
          <div className="rounded-lg border p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Base Module (Required)</h3>
              <span className="text-xs text-gray-500">Complete both sections</span>
            </div>

            <div className="space-y-3">
              {/* RW */}
              <div className="flex items-center justify-between bg-gray-50 rounded-md p-3 border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-md">
                    <FiBook className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Reading & Writing</p>
                    <p className="text-xs text-gray-600">32 minutes • 27 questions</p>
                  </div>
                </div>
                <button
                  onClick={() => startBase("reading-writing")}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <FiPlay /> Start Base
                </button>
              </div>

              {/* Math */}
              <div className="flex items-center justify-between bg-gray-50 rounded-md p-3 border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-md">
                    <FiBook className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Math</p>
                    <p className="text-xs text-gray-600">32 minutes • 27 questions</p>
                  </div>
                </div>
                <button
                  onClick={() => startBase("math")}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <FiPlay /> Start Base
                </button>
              </div>
            </div>
          </div>

          {/* Adaptive Module */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Adaptive Module (Based on Performance)</h3>
              <span className="text-xs text-gray-500 flex items-center gap-1"><FiInfo /> auto-determined</span>
            </div>

            <div className="space-y-3">
              {/* RW adaptive info */}
              <div className="flex items-center justify-between bg-gray-50 rounded-md p-3 border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-md">
                    <FiBook className="text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Reading & Writing</p>
                    <p className="text-xs text-gray-600">Easy/Hard Level (auto-determined)</p>
                  </div>
                </div>
                <button disabled className="inline-flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-500 rounded-md cursor-not-allowed">
                  <FiPlay /> Start After Base
                </button>
              </div>

              {/* Math adaptive info */}
              <div className="flex items-center justify-between bg-gray-50 rounded-md p-3 border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-md">
                    <FiBook className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Math</p>
                    <p className="text-xs text-gray-600">Easy/Hard Level (auto-determined)</p>
                  </div>
                </div>
                <button disabled className="inline-flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-500 rounded-md cursor-not-allowed">
                  <FiPlay /> Start After Base
                </button>
              </div>

              <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-2">
                Note: The adaptive module difficulty is determined by your performance in the base module. High performance leads to harder questions, while lower performance leads to easier questions.
              </p>
            </div>
          </div>

          {/* Bottom CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <button onClick={() => startBase("math")} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
              <FiPlay /> Start Math Base Test
            </button>
            <button onClick={() => startBase("reading-writing")} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              <FiPlay /> Start Reading & Writing Base Test
            </button>
          </div>

          {/* Test Flow */}
          <div className="mt-6 bg-blue-50 border border-blue-100 rounded-md p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Test Flow:</h4>
            <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
              <li>Complete Reading & Writing Base Module (32 min)</li>
              <li>Complete Math Base Module (32 min)</li>
              <li>System determines adaptive level based on performance</li>
              <li>Complete Reading & Writing Adaptive Module (32 min)</li>
              <li>Complete Math Adaptive Module (32 min)</li>
              <li>View comprehensive results and recommendations</li>
            </ol>
          </div>
        </div>

        {/* Not enrolled warning - hidden because we guard, but keep for safety */}
        {questionBank ? null : (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start gap-3 text-red-700">
              <FiAlertTriangle className="mt-0.5" />
              <p>You are not enrolled in this question bank.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Practice;