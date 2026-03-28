import { useState } from "react";
import { Send, Sparkles, CheckCircle, Upload, FileText, X } from "lucide-react";
import { Navbar } from "../components/Navbar";

type Message = {
  type: "user" | "ai";
  text: string;
  clause?: string;
};

const initialMessages: Message[] = [
  {
    type: "ai",
    text: "Hello! I'm your AI Insurance Assistant. Upload your insurance policy document and ask me about coverage for specific procedures, tests, or medications.",
  },
];

export function InsuranceChecker() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [policyFile, setPolicyFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPolicyFile(file);
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          text: `Great! I've received your policy document "${file.name}". Now you can ask me questions about your coverage.`,
        },
      ]);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = input;
    setMessages((prev) => [...prev, { type: "user", text: userMessage }]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const aiResponse = generateResponse(userMessage);
      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const generateResponse = (query: string): Message => {
    const lowerQuery = query.toLowerCase();

    if (!policyFile) {
      return {
        type: "ai",
        text: "Please upload your insurance policy document first so I can provide accurate coverage information.",
      };
    }

    if (lowerQuery.includes("lipid") || lowerQuery.includes("cholesterol") || lowerQuery.includes("blood test")) {
      return {
        type: "ai",
        text: "Based on your policy document, lipid panel tests are covered under preventive care benefits. Your insurance covers one lipid panel test per year at 100% with no copay when performed at an in-network lab.",
        clause: "Section 4.2.1: Preventive Laboratory Services - Lipid screening tests are covered annually for adults aged 20 and older without cost-sharing requirements.",
      };
    }

    if (lowerQuery.includes("statin") || lowerQuery.includes("medication")) {
      return {
        type: "ai",
        text: "Statin medications for cholesterol management are covered under your prescription drug benefit. Generic statins (like atorvastatin and simvastatin) require a $10 copay for a 30-day supply. Brand-name statins may require prior authorization.",
        clause: "Section 7.3: Tier 1 Medications - Generic cholesterol-lowering medications are classified as Tier 1 preferred drugs with standard copay structure.",
      };
    }

    if (lowerQuery.includes("glucose") || lowerQuery.includes("diabetes") || lowerQuery.includes("hba1c")) {
      return {
        type: "ai",
        text: "HbA1c and fasting glucose tests are fully covered under your plan as part of diabetes screening and management. You can get these tests quarterly if you have prediabetes or diabetes, with no out-of-pocket cost at network providers.",
        clause: "Section 4.2.3: Diabetes Screening and Monitoring - Covered for at-risk individuals up to 4 times per year with no member cost share at participating laboratories.",
      };
    }

    if (lowerQuery.includes("vitamin")) {
      return {
        type: "ai",
        text: "Vitamin D and B12 blood tests are covered when medically necessary and ordered by your physician. These fall under diagnostic laboratory services with your standard copay of $15 at in-network labs.",
        clause: "Section 4.3: Diagnostic Laboratory Services - Vitamin level testing covered when medically indicated with applicable copayment.",
      };
    }

    return {
      type: "ai",
      text: "I can help you check coverage for specific procedures, medications, or tests mentioned in your lab report. Could you please specify what you'd like to verify? For example: lipid panel, diabetes screening, statin medications, or vitamin tests.",
    };
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#0f172a] mb-2">
            Check Your Coverage
          </h1>
          <p className="text-[#64748b]">Upload your policy and ask what's covered</p>
        </div>

        {/* Two Panel Layout */}
        <div className="grid lg:grid-cols-[350px_1fr] gap-6 h-[calc(100vh-280px)]">
          {/* Left Panel: Policy Upload */}
          <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] p-6 flex flex-col">
            <h2 className="text-lg font-bold text-[#0f172a] mb-4">
              Insurance Policy
            </h2>

            {!policyFile ? (
              <div className="flex-1 flex flex-col">
                <div className="relative border-2 border-dashed border-[#e2e8f0] rounded-xl p-6 text-center hover:border-[#0d9488] hover:bg-[#0d9488]/5 transition-all flex-1 flex flex-col items-center justify-center">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />

                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-[#7c3aed]/10 rounded-2xl flex items-center justify-center">
                      <Upload className="w-7 h-7 text-[#7c3aed]" />
                    </div>

                    <div>
                      <p className="text-base font-medium text-[#0f172a] mb-1">
                        Upload Policy Document
                      </p>
                      <p className="text-sm text-[#64748b]">Click or drag PDF here</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-[#7c3aed]/5 rounded-lg border border-[#7c3aed]/20">
                  <p className="text-xs text-[#64748b] leading-relaxed">
                    Upload your insurance policy to get accurate coverage information
                    for procedures and tests.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="flex items-start gap-3 p-4 bg-[#7c3aed]/5 rounded-lg border border-[#7c3aed]/20">
                  <div className="w-10 h-10 bg-[#7c3aed]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-[#7c3aed]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0f172a] truncate mb-1">
                      {policyFile.name}
                    </p>
                    <p className="text-xs text-[#64748b]">
                      {(policyFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>

                  <button
                    onClick={() => setPolicyFile(null)}
                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#ef4444]/10 text-[#64748b] hover:text-[#ef4444] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 p-4 bg-[#22c55e]/5 rounded-lg border border-[#22c55e]/20">
                  <p className="text-sm text-[#22c55e] font-medium mb-1">
                    ✓ Policy Uploaded
                  </p>
                  <p className="text-xs text-[#64748b]">
                    You can now ask questions about your coverage
                  </p>
                </div>

                <div className="mt-auto pt-4">
                  <h3 className="text-sm font-bold text-[#0f172a] mb-3">
                    Quick Questions
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleQuickQuestion("Is lipid panel testing covered?")}
                      className="w-full text-left p-3 bg-white rounded-lg border border-[#e2e8f0] hover:border-[#0d9488] hover:shadow-sm transition-all text-xs text-[#0f172a]"
                    >
                      Is lipid panel testing covered?
                    </button>
                    <button
                      onClick={() => handleQuickQuestion("Are statin medications covered?")}
                      className="w-full text-left p-3 bg-white rounded-lg border border-[#e2e8f0] hover:border-[#0d9488] hover:shadow-sm transition-all text-xs text-[#0f172a]"
                    >
                      Are statin medications covered?
                    </button>
                    <button
                      onClick={() => handleQuickQuestion("Is diabetes screening covered?")}
                      className="w-full text-left p-3 bg-white rounded-lg border border-[#e2e8f0] hover:border-[#0d9488] hover:shadow-sm transition-all text-xs text-[#0f172a]"
                    >
                      Is diabetes screening covered?
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Chat */}
          <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] flex flex-col overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message, index) => (
                <div key={index}>
                  {message.type === "user" ? (
                    <div className="flex justify-end">
                      <div className="bg-[#0d9488] text-white rounded-2xl rounded-tr-sm px-6 py-3 max-w-[80%]">
                        {message.text}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start">
                      <div className="max-w-[85%]">
                        <div className="bg-white border-l-4 border-[#7c3aed] rounded-lg rounded-tl-sm p-6 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 bg-[#7c3aed] rounded-full flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-xs font-bold text-[#7c3aed]">
                              AI ASSISTANT
                            </span>
                          </div>
                          <p className="text-[#0f172a] leading-relaxed">{message.text}</p>
                        </div>

                        {message.clause && (
                          <div className="mt-3 bg-[#7c3aed]/10 rounded-lg p-4 border border-[#7c3aed]/20">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="w-4 h-4 text-[#7c3aed]" />
                              <span className="text-xs font-bold text-[#7c3aed]">
                                POLICY REFERENCE
                              </span>
                            </div>
                            <p className="text-sm text-[#0f172a]">
                              "{message.clause.split(" - ")[0]}"
                              <span className="block mt-1 border-l-2 border-[#7c3aed] pl-3 italic text-[#64748b]">
                                {message.clause.split(" - ")[1]}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border-l-4 border-[#7c3aed] rounded-lg rounded-tl-sm px-6 py-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-[#7c3aed] rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-[#7c3aed] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-2 h-2 bg-[#7c3aed] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                      </div>
                      <span className="text-xs text-[#64748b]">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-[#e2e8f0] p-4 bg-[#f8fafc]">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  placeholder="e.g. Is my blood test covered under my policy?"
                  className="flex-1 px-4 py-3 bg-white border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488] text-[#0f172a] placeholder:text-[#64748b]"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="px-6 py-3 bg-[#0d9488] text-white rounded-lg hover:bg-[#0d9488]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                >
                  <Send className="w-5 h-5" />
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
