import { Upload, Sparkles, CheckCircle, ArrowRight, AlertCircle, MessageCircle, FileSearch } from "lucide-react";
import { Link } from "react-router";
import { Navbar } from "../components/Navbar";

export function Landing() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d9488] via-[#0d9488] to-[#7c3aed] opacity-100" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 px-4 py-2 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-medium">AI Powered Health Intelligence</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Understand Your Lab Report
            <br />
            in Seconds
          </h1>

          <p className="text-xl text-white/95 mb-10 max-w-3xl mx-auto leading-relaxed">
            AI that reads your blood work, explains what's wrong, and tells you what to do next.
          </p>

          <Link
            to="/upload"
            className="inline-flex items-center gap-2 bg-white text-[#0d9488] px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all hover:scale-105"
          >
            Upload Your Report
            <ArrowRight className="w-5 h-5" />
          </Link>

          <p className="text-white/80 text-sm mt-6">
            Your lab reports, finally in plain English.
          </p>
        </div>
      </section>

      {/* Why This Matters Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-[#0f172a] mb-4">
          Why This Matters
        </h2>
        <p className="text-center text-[#64748b] mb-12 max-w-2xl mx-auto">
          Lab reports are confusing. We make them clear.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-[#e2e8f0] hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-[#ef4444]/10 rounded-2xl flex items-center justify-center mb-6">
              <AlertCircle className="w-7 h-7 text-[#ef4444]" />
            </div>
            <h3 className="text-xl font-bold text-[#0f172a] mb-3">
              Confused by your report?
            </h3>
            <p className="text-[#64748b] leading-relaxed">
              We explain every value in simple language. No medical degree needed.
              Understand what your numbers actually mean for your health.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm border border-[#e2e8f0] hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-[#7c3aed]/10 rounded-2xl flex items-center justify-center mb-6">
              <FileSearch className="w-7 h-7 text-[#7c3aed]" />
            </div>
            <h3 className="text-xl font-bold text-[#0f172a] mb-3">
              Anxious about abnormal results?
            </h3>
            <p className="text-[#64748b] leading-relaxed">
              We tell you what they mean in context. AI identifies what needs attention
              and provides actionable guidance you can follow today.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm border border-[#e2e8f0] hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-[#0d9488]/10 rounded-2xl flex items-center justify-center mb-6">
              <MessageCircle className="w-7 h-7 text-[#0d9488]" />
            </div>
            <h3 className="text-xl font-bold text-[#0f172a] mb-3">
              Not sure what to ask your doctor?
            </h3>
            <p className="text-[#64748b] leading-relaxed">
              We generate the exact questions you should ask. Walk into your appointment
              prepared and confident about your health discussion.
            </p>
          </div>
        </div>
      </section>

      {/* 3-Step Explainer */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-[#0f172a] mb-16">
            How It Works
          </h2>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-[#0d9488] to-[#0d9488]/80 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Upload className="w-10 h-10 text-white" />
              </div>
              <div className="mb-4">
                <span className="inline-block bg-[#0d9488]/10 text-[#0d9488] px-4 py-1 rounded-full text-sm font-bold mb-3">
                  STEP 1
                </span>
              </div>
              <h3 className="text-xl font-bold text-[#0f172a] mb-3">
                Upload Your Lab Report PDF
              </h3>
              <p className="text-[#64748b] leading-relaxed">
                Simply drag and drop your PDF lab report. Works with reports from any lab or hospital.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-[#7c3aed] to-[#7c3aed]/80 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <div className="mb-4">
                <span className="inline-block bg-[#7c3aed]/10 text-[#7c3aed] px-4 py-1 rounded-full text-sm font-bold mb-3">
                  STEP 2
                </span>
              </div>
              <h3 className="text-xl font-bold text-[#0f172a] mb-3">
                AI Extracts &amp; Analyzes Every Parameter
              </h3>
              <p className="text-[#64748b] leading-relaxed">
                Our AI reads every value, compares with medical standards, and identifies what needs attention.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-[#0d9488] to-[#7c3aed] rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <div className="mb-4">
                <span className="inline-block bg-gradient-to-r from-[#0d9488] to-[#7c3aed] bg-clip-text text-transparent px-4 py-1 rounded-full text-sm font-bold mb-3">
                  STEP 3
                </span>
              </div>
              <h3 className="text-xl font-bold text-[#0f172a] mb-3">
                Get Plain-English Insights + Doctor Questions
              </h3>
              <p className="text-[#64748b] leading-relaxed">
                Receive clear explanations, preventive guidance, and questions to discuss with your physician.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="bg-[#f8fafc] py-8 border-y border-[#e2e8f0]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-[#0d9488] font-bold text-lg">
            Trusted by patients, not just clinicians
          </p>
          <p className="text-[#64748b] text-sm mt-2">
            Making lab reports accessible to everyone
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#7c3aed]/10 px-4 py-2 rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-[#7c3aed]" />
              <span className="text-[#7c3aed] text-sm font-medium">Powered by AI</span>
            </div>
            <h2 className="text-4xl font-bold text-[#0f172a] mb-6">
              Your Personal Health Intelligence Layer
            </h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-[#22c55e] flex-shrink-0 mt-0.5" />
                <span className="text-[#64748b]">
                  Instant identification and explanation of abnormal values
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-[#22c55e] flex-shrink-0 mt-0.5" />
                <span className="text-[#64748b]">
                  Track health trends over time with multiple reports
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-[#22c55e] flex-shrink-0 mt-0.5" />
                <span className="text-[#64748b]">
                  AI-generated health summaries in plain, non-medical language
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-[#22c55e] flex-shrink-0 mt-0.5" />
                <span className="text-[#64748b]">
                  Personalized questions to ask your doctor based on your results
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-[#22c55e] flex-shrink-0 mt-0.5" />
                <span className="text-[#64748b]">
                  Insurance coverage checker for recommended procedures
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-[#0d9488]/10 to-[#7c3aed]/10 rounded-2xl p-8 border border-[#e2e8f0]">
            <div className="bg-white rounded-xl p-6 shadow-sm mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 bg-[#22c55e] rounded-full"></div>
                <span className="text-sm font-medium text-[#0f172a]">Hemoglobin: 14.2 g/dL</span>
              </div>
              <div className="h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
                <div className="h-full w-[70%] bg-[#22c55e]"></div>
              </div>
              <p className="text-xs text-[#64748b] mt-2">Normal range - No action needed</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 bg-[#ef4444] rounded-full"></div>
                <span className="text-sm font-medium text-[#0f172a]">Cholesterol: 245 mg/dL</span>
              </div>
              <div className="h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
                <div className="h-full w-[95%] bg-[#ef4444]"></div>
              </div>
              <p className="text-xs text-[#64748b] mt-2">Above healthy range - Review needed</p>
            </div>

            <div className="bg-[#7c3aed]/10 rounded-xl p-4 border border-[#7c3aed]/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#7c3aed]" />
                <span className="text-xs font-medium text-[#7c3aed]">AI INSIGHT</span>
              </div>
              <p className="text-sm text-[#0f172a]">
                Your cholesterol is elevated. Consider reducing saturated fats and adding more fiber to your diet.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-[#0d9488] to-[#7c3aed] py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Understand Your Health?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Upload your lab report and get instant clarity in plain English.
          </p>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 bg-white text-[#0d9488] px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all hover:scale-105"
          >
            Get Started Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[#e2e8f0] py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-[#64748b] text-sm">
            © 2026 AI Health Insight Companion. For informational purposes only.
            This is not medical advice. Always consult with healthcare professionals.
          </p>
        </div>
      </footer>
    </div>
  );
}
