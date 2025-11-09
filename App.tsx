
import React, { useState, FormEvent, useRef } from 'react';
import { AcademicLevel } from './types';
import { generateTopicsStream } from './services/geminiService';
import Spinner from './components/Spinner';
import markdownit from 'markdown-it'; // For rendering Markdown output

// Define the markdown-it instance outside the component to avoid recreation on re-renders
const md = markdownit();

function App() {
  const [keywords, setKeywords] = useState<string>('');
  const [fieldOfStudy, setFieldOfStudy] = useState<string>('');
  const [academicLevel, setAcademicLevel] = useState<AcademicLevel>(AcademicLevel.Masters);
  const [generatedTopics, setGeneratedTopics] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to accumulate streamed text without triggering excessive re-renders for intermediate updates
  const accumulatedTextRef = useRef<string>('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGeneratedTopics('');
    setError(null);
    setLoading(true);
    accumulatedTextRef.current = '';

    if (!keywords.trim() || !fieldOfStudy.trim()) {
      setError('لطفاً همه فیلدهای مورد نیاز را پر کنید.');
      setLoading(false);
      return;
    }

    try {
      const stream = generateTopicsStream({
        keywords,
        fieldOfStudy,
        academicLevel,
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          accumulatedTextRef.current += chunk.text;
          setGeneratedTopics(accumulatedTextRef.current); // Update state to trigger re-render
        }
        if (chunk.done) {
          break;
        }
      }
    } catch (err: unknown) {
      console.error('Error during topic generation:', err);
      if (err instanceof Error) {
        setError(`خطا: ${err.message}`);
      } else {
        setError('خطای ناشناخته‌ای رخ داد.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 md:p-8 lg:p-10 w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
      {/* Input Section */}
      <div className="flex-1 space-y-6">
        <h1 className="text-3xl font-extrabold text-blue-800 text-center md:text-right mb-6">
          مولد موضوع پژوهشی گمینای
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-2 text-right">
              کلمات کلیدی (جدا شده با کاما یا خط جدید):
            </label>
            <textarea
              id="keywords"
              rows={4}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-right"
              placeholder="مثال: هوش مصنوعی، یادگیری ماشین، پردازش زبان طبیعی"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              disabled={loading}
            ></textarea>
          </div>

          <div>
            <label htmlFor="fieldOfStudy" className="block text-sm font-medium text-gray-700 mb-2 text-right">
              رشته تحصیلی:
            </label>
            <input
              type="text"
              id="fieldOfStudy"
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-right"
              placeholder="مثال: علوم کامپیوتر"
              value={fieldOfStudy}
              onChange={(e) => setFieldOfStudy(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="academicLevel" className="block text-sm font-medium text-gray-700 mb-2 text-right">
              سطح مقطع:
            </label>
            <select
              id="academicLevel"
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white transition duration-200 text-right"
              value={academicLevel}
              onChange={(e) => setAcademicLevel(e.target.value as AcademicLevel)}
              disabled={loading}
            >
              <option value={AcademicLevel.Masters}>کارشناسی ارشد</option>
              <option value={AcademicLevel.PhD}>دکتری</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner />
                <span className="mr-2">در حال تولید...</span>
              </>
            ) : (
              'تولید موضوعات پژوهشی'
            )}
          </button>
        </form>
      </div>

      {/* Output Section */}
      <div className="flex-1 space-y-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 text-center md:text-right">موضوعات پیشنهادی:</h2>
        {error && <p className="text-red-600 text-center font-medium text-right">{error}</p>}
        {loading && !generatedTopics && (
          <div className="flex justify-center items-center h-40">
            <Spinner />
            <p className="mr-3 text-gray-600">هوش مصنوعی در حال فکر کردن است...</p>
          </div>
        )}
        {generatedTopics && (
          <div
            className="prose prose-blue max-w-none text-gray-800 leading-relaxed text-right rtl"
            dangerouslySetInnerHTML={{ __html: md.render(generatedTopics) }}
          />
        )}
        {!loading && !generatedTopics && !error && (
          <p className="text-gray-500 text-center md:text-right">
            کلمات کلیدی، رشته تحصیلی و سطح مقطع خود را وارد کنید تا موضوعات پژوهشی جذابی دریافت کنید.
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
    