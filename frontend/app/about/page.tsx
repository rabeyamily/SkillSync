import Logo from "@/components/Logo";

export default function About() {
  return (
    <div className="mx-auto max-w-7xl px-2 sm:px-3 py-16 lg:px-4">
      <div className="mx-auto max-w-6xl">
        {/* Header Section with Gradient */}
        <div className="text-center mb-16">
          <h1 className="mb-6 flex items-center justify-center gap-4 flex-wrap">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight bg-clip-text text-transparent" style={{ background: 'linear-gradient(to right, #0077b5, #00a0dc, #0077b5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>About</span> 
            <Logo className="text-4xl sm:text-5xl" />
          </h1>
          <div className="h-1 w-24 mx-auto rounded-full" style={{ background: 'linear-gradient(to right, #0077b5, #00a0dc)' }}></div>
        </div>

        {/* Main Description Card */}
        <div className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-950/20 rounded-2xl shadow-xl p-8 mb-12 border border-blue-100 dark:border-blue-900/30">
          <p className="text-lg leading-8 text-gray-700 dark:text-gray-300 mb-6">
            SkillSync is an AI-powered tool that helps students and professionals identify how their current skills align with industry job requirements. Using advanced natural language processing, it analyzes both your resume and job descriptions to extract key competencies — from technical and soft skills to certifications and education.
          </p>
          <p className="text-lg leading-8 text-gray-700 dark:text-gray-300">
            The system then compares both profiles to calculate a Fit Score, highlight missing or extra skills, and offer personalized upskilling recommendations. Interactive charts make it easy to visualize where you stand and what to improve. SkillSync is designed for accuracy, privacy, and simplicity — no login required.
          </p>
        </div>

        {/* Call to Action Section */}
        <div className="rounded-lg shadow-lg p-4 text-center text-white mb-12 mx-auto max-w-2xl" style={{ background: 'linear-gradient(to right, #0077b5, #00a0dc)' }}>
          <p className="text-base font-semibold leading-snug">
            Bridge the gap between education and industry — one skill at a time.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-l-4 border-slate-800 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mr-4" style={{ background: 'linear-gradient(to bottom right, #0077b5, #00a0dc)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AI-Powered Analysis</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Advanced NLP extracts skills from resumes and job descriptions with precision
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-l-4 border-slate-800 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mr-4" style={{ background: 'linear-gradient(to bottom right, #0077b5, #00a0dc)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Fit Score Calculation</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Get a comprehensive score showing how well your skills match job requirements
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-l-4 border-slate-800 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mr-4" style={{ background: 'linear-gradient(to bottom right, #0077b5, #00a0dc)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Visual Analytics</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Interactive charts and breakdowns help you understand your skill profile
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-l-4 border-slate-800 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mr-4" style={{ background: 'linear-gradient(to bottom right, #0077b5, #00a0dc)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Personalized Recommendations</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Receive targeted suggestions to close skill gaps and improve your fit
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fit Score Calculation Section */}
        <div id="fit-score-calculation" className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-950/20 rounded-2xl shadow-xl p-8 mb-12 border border-blue-100 dark:border-blue-900/30">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <span className="w-1 h-8 rounded-full mr-3" style={{ background: 'linear-gradient(to bottom, #0077b5, #00a0dc)' }}></span>
            How Fit Score is Calculated
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Technical Skills Score
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-7">
                Calculated as the percentage of technical skills from the job description that match your resume. 
                Formula: <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">(Matched Technical Skills ÷ Total Required Technical Skills) × 100</span>
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Soft Skills Score
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-7">
                Calculated as the percentage of soft skills (communication, leadership, problem-solving, etc.) from the job description that match your resume. 
                Formula: <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">(Matched Soft Skills ÷ Total Required Soft Skills) × 100</span>
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Overall Fit Score
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-7 mb-2">
                The overall fit score is calculated as a simple, transparent ratio:
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-7">
                <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Overall Score = (Matched Skills / Total JD Skills) × 100</span>
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 italic">
                This straightforward approach directly shows what percentage of required skills the candidate possesses. For example, if a job requires 10 skills and the candidate has 7 of them, the fit score is 70%.
              </p>
            </div>

            <div className="pt-4 border-t border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v9M12 14l-9-5M12 14l9-5M12 14v9" />
                </svg>
                Additional Factors
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-7 mb-4">
                Education and certification matches are also analyzed separately. These factors are displayed in your report but don&apos;t directly impact the overall fit score, as they serve as supplementary indicators of qualification alignment.
              </p>
              <div className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500 dark:border-blue-400 p-4 rounded-r">
                <p className="text-gray-800 dark:text-gray-200 font-semibold mb-2">
                  Important Note:
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-7 mb-2">
                  The overall fit score is based only on skill matching. Education and certifications are:
                </p>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 leading-7 space-y-1 ml-2">
                  <li>Extracted and displayed separately</li>
                  <li>Not included in the overall score calculation</li>
                  <li>Shown as supplementary information</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


