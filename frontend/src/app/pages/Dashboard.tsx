import { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Sparkles,
  Leaf,
  MessageCircle,
  Copy,
  User,
  Calendar,
  FileText,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  Download,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Link } from "react-router";
import { toast } from "sonner";
import { Toaster } from "../components/ui/sonner";

// Matches backend LabParameter schema exactly
type LabParameter = {
  name: string;
  value: number;
  unit: string;
  reference_low: number;
  reference_high: number;
  status: "High" | "Low" | "Normal";
};

// Fallback mock data matching backend LabParameter shape
const defaultLabData: LabParameter[] = [
  { name: "Hemoglobin", value: 14.2, unit: "g/dL", reference_low: 13.0, reference_high: 17.0, status: "Normal" },
  { name: "White Blood Cell Count", value: 11.5, unit: "×10³/μL", reference_low: 4.0, reference_high: 10.0, status: "High" },
  { name: "Platelet Count", value: 220, unit: "×10³/μL", reference_low: 150, reference_high: 400, status: "Normal" },
  { name: "Blood Glucose (Fasting)", value: 118, unit: "mg/dL", reference_low: 70, reference_high: 100, status: "High" },
  { name: "Total Cholesterol", value: 245, unit: "mg/dL", reference_low: 0, reference_high: 200, status: "High" },
  { name: "Vitamin D", value: 22, unit: "ng/mL", reference_low: 30, reference_high: 100, status: "Low" },
];

export function Dashboard() {
  const [labData, setLabData] = useState<LabParameter[]>(defaultLabData);
  const [patientName, setPatientName] = useState("John Anderson");
  const [reportDate, setReportDate] = useState("Feb 20, 2026");
  const [summary, setSummary] = useState("");
  const [preventiveGuidance, setPreventiveGuidance] = useState("");
  const [doctorQuestions, setDoctorQuestions] = useState<string[]>([]);
  const [hasTrendData, setHasTrendData] = useState(false);
  const [filter, setFilter] = useState<"all" | "abnormal" | "normal">("all");
  const [isCopied, setIsCopied] = useState(false);
  const [fromApi, setFromApi] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Load API response (AnalysisResponse) from localStorage set by Upload page
  useEffect(() => {
    const stored = localStorage.getItem("labReportData");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.patient_name) setPatientName(data.patient_name);
        if (data.report_date) setReportDate(data.report_date);
        if (Array.isArray(data.parameters) && data.parameters.length > 0) {
          setLabData(data.parameters);
        }
        if (data.summary) setSummary(data.summary);
        if (data.preventive_guidance) setPreventiveGuidance(data.preventive_guidance);
        if (Array.isArray(data.doctor_questions) && data.doctor_questions.length > 0) {
          setDoctorQuestions(data.doctor_questions);
        }
        setFromApi(true);
      } catch {
        // Fall back to mock data silently
      }
    }

    // Check if trend data is available
    const trend = localStorage.getItem("trendData");
    if (trend) setHasTrendData(true);
  }, []);

  const abnormalCount = labData.filter((item) => item.status !== "Normal").length;

  const sortedData = [...labData].sort((a, b) => {
    const aAbnormal = a.status !== "Normal" ? 0 : 1;
    const bAbnormal = b.status !== "Normal" ? 0 : 1;
    return aAbnormal - bAbnormal;
  });

  const filteredData = sortedData.filter((item) => {
    if (filter === "abnormal") return item.status !== "Normal";
    if (filter === "normal") return item.status === "Normal";
    return true;
  });

  const handleCopyQuestions = () => {
    const text = doctorQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n");
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success("Questions copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsDownloading(true);

    // Helper: inline computed color-related styles to avoid html2canvas parsing
    const inlineComputedColors = (root: HTMLElement) => {
      const nodes = Array.from(root.querySelectorAll('*')) as HTMLElement[];
      nodes.unshift(root);
      const saved: Array<{ el: HTMLElement; cssText: string }> = [];
      const props = [
        'color',
        'backgroundColor',
        'borderTopColor',
        'borderRightColor',
        'borderBottomColor',
        'borderLeftColor',
        'boxShadow',
        'textDecorationColor',
        'caretColor',
        'outlineColor',
      ];

      // Normalize color functions (oklab/lab/lch/device-cmyk) inside any CSS value
      const normalizeColor = (value: string) => {
        try {
          if (!value || typeof value !== 'string') return value;
          const colorFuncRegex = /(oklab\([^)]*\)|lab\([^)]*\)|lch\([^)]*\)|device-cmyk\([^)]*\))/gi;
          if (!colorFuncRegex.test(value)) return value;

          const resolve = (funcStr: string) => {
            try {
              const tmp = document.createElement('span');
              tmp.style.all = 'initial';
              tmp.style.position = 'fixed';
              tmp.style.left = '-9999px';
              // set as color so browser resolves the function to sRGB
              tmp.style.color = funcStr;
              document.documentElement.appendChild(tmp);
              const resolved = getComputedStyle(tmp).color;
              tmp.remove();
              return resolved || funcStr;
            } catch {
              return funcStr;
            }
          };

          return value.replace(colorFuncRegex, (m) => resolve(m));
        } catch {
          return value;
        }
      };

      nodes.forEach((el) => {
        try {
          const comp = window.getComputedStyle(el as Element);
          const prev = el.style.cssText || '';
          const parts: string[] = [];
          props.forEach((p) => {
            const cssName = p.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
            // Prefer getPropertyValue to obtain the exact computed string
            let rawVal = comp.getPropertyValue(cssName) || (comp as any)[p];
            if (rawVal && rawVal !== 'transparent' && rawVal !== 'rgba(0, 0, 0, 0)') {
              const val = normalizeColor(rawVal.trim());
              parts.push(`${cssName}: ${val};`);
            }
          });
          if (parts.length) el.style.cssText = prev + parts.join(' ');
          saved.push({ el, cssText: prev });
        } catch {
          // ignore elements that throw on getComputedStyle
        }
      });

      return saved;
    };

    const restoreInlined = (saved: Array<{ el: HTMLElement; cssText: string }>) => {
      saved.forEach((s) => {
        try {
          s.el.style.cssText = s.cssText || '';
        } catch {
          // ignore
        }
      });
    };

    // Fallback: open a printable window (user can Save as PDF) with inline styles
    const openPrintWindow = (el: HTMLElement, title = 'Report') => {
      const w = window.open('', '_blank');
      if (!w) {
        toast.error('Unable to open print window. Please allow popups.');
        return;
      }

      const doc = w.document;
      const cloned = el.cloneNode(true) as HTMLElement;

      // Inline computed styles on the clone
      const saved = inlineComputedColors(cloned);

      doc.open();
      doc.write(`<!doctype html><html><head><title>${title}</title>`);
      // Copy over current page's stylesheets links to preserve fonts/layout
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
      links.forEach((ln) => {
        try {
          doc.write(ln.outerHTML);
        } catch {}
      });
      doc.write('</head><body></body></html>');
      doc.body.appendChild(cloned);

      // Wait a tick for styles to apply then print
      setTimeout(() => {
        try {
          w.focus();
          w.print();
        } catch (err) {
          console.error('Print fallback failed:', err);
          toast.error('Print fallback failed. Please try saving manually.');
        } finally {
          // restore inline styles on clone (not strictly necessary since window will close)
          restoreInlined(saved);
        }
      }, 500);
    };
    try {
      const element = reportRef.current;
      // Inline all computed styles (resolves modern color funcs to sRGB) then disable external stylesheets
      const savedStyles = inlineAllComputedStyles(element);
      const savedAll = disableAllStyles();

      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
        });
      } finally {
        // Restore styles and inline styles immediately after capture
        restoreAllStyles(savedAll);
        restoreInlined(savedStyles);
      }

      // Create a PDF with proper multi-page support by slicing the canvas
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();

      // Determine page height in pixels for slicing the canvas. We map PDF points to canvas pixels
      const pxPerPoint = canvas.width / pdfWidth; // pixels per PDF point
      const pdfPageHeightPts = pdf.internal.pageSize.getHeight();
      const pageHeightPx = Math.floor(pdfPageHeightPts * pxPerPoint);

      let yOffset = 0;
      while (yOffset < canvas.height) {
        const sliceHeight = Math.min(pageHeightPx, canvas.height - yOffset);

        // Create temporary canvas to hold the page slice
        const tmpCanvas = document.createElement("canvas");
        tmpCanvas.width = canvas.width;
        tmpCanvas.height = sliceHeight;
        const ctx = tmpCanvas.getContext("2d");
        if (!ctx) throw new Error("Failed to get canvas context");

        // Draw the slice from the full canvas
        ctx.drawImage(canvas, 0, yOffset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

        const imgData = tmpCanvas.toDataURL("image/jpeg", 0.98);

        const imgHeightPts = sliceHeight / pxPerPoint;
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, imgHeightPts);

        yOffset += sliceHeight;
        if (yOffset < canvas.height) pdf.addPage();
      }

      // Primary save path
      const filename = `${patientName.replace(/\s+/g, "_")}_Lab_Report.pdf`;
      pdf.save(filename);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF generation failed (html2canvas path):", error);
      // Fallback: try jsPDF.html which can render DOM directly in some setups
      try {
        const filename = `${patientName.replace(/\s+/g, "_")}_Lab_Report.pdf`;
        const pdf = new jsPDF("p", "mm", "a4");
        await new Promise<void>((resolve, reject) => {
          pdf.html(reportRef.current as HTMLElement, {
            html2canvas: { scale: 2, useCORS: true },
            callback: (doc) => {
              try {
                doc.save(filename);
                resolve();
              } catch (err) {
                reject(err);
              }
            },
            // Provide a wider window width to help layout the DOM correctly
            windowWidth: (reportRef.current as HTMLElement).scrollWidth,
          });
        });
        toast.success("PDF downloaded successfully (fallback)!");
      } catch (fallbackErr) {
        console.error("PDF generation failed (fallback path):", fallbackErr);
        const msg = (fallbackErr && (fallbackErr as Error).message) || String(fallbackErr);
        toast.error(`Failed to generate PDF: ${msg}`);
        // Final fallback: ask backend to generate the PDF and return base64
        try {
          const filename = `${patientName.replace(/\s+/g, "_")}_Lab_Report.pdf`;
          const payload = {
            patient_name: patientName,
            report_date: reportDate,
            parameters: labData,
            summary,
            preventive_guidance: preventiveGuidance,
            doctor_questions: doctorQuestions,
          };
          const res = await fetch("http://127.0.0.1:8000/api/v1/generate-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error(`Server returned ${res.status}`);
          const data = await res.json();
          if (data?.pdf_base64) {
            downloadBase64Pdf(data.pdf_base64, filename);
          } else {
            throw new Error("No pdf returned from server");
          }
        } catch (serverErr) {
          console.error("Server-side PDF generation failed:", serverErr);
          toast.error("Server-side PDF generation failed. See console for details.");
        }
      }
    } finally {
      setIsDownloading(false);
    }
      return;
  };

  const downloadBase64Pdf = (b64: string, filename: string) => {
    try {
      // Save to localStorage
      localStorage.setItem('latest_report_pdf_base64', b64);

      const byteChars = atob(b64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('PDF saved to localStorage and downloaded.');
    } catch (err) {
      console.error('downloadBase64Pdf failed:', err);
      toast.error('Failed to download PDF from server.');
    }
  };

  // Inline all computed styles for every node under root (returns saved inline cssText)
  const inlineAllComputedStyles = (root: HTMLElement) => {
    const nodes = Array.from(root.querySelectorAll('*')) as HTMLElement[];
    nodes.unshift(root);
    const saved: Array<{ el: HTMLElement; cssText: string }> = [];

    nodes.forEach((el) => {
      try {
        const comp = window.getComputedStyle(el as Element);
        const prev = el.style.cssText || '';
        let parts = '';
        for (let i = 0; i < comp.length; i++) {
          const prop = comp.item(i);
          try {
            const val = comp.getPropertyValue(prop);
            if (val) parts += `${prop}: ${val}; `;
          } catch {
            // ignore individual property failures
          }
        }
        if (parts) el.style.cssText = prev + parts;
        saved.push({ el, cssText: prev });
      } catch {
        // ignore elements that throw on getComputedStyle
      }
    });

    return saved;
  };

  // Disable stylesheets or <style> tags that contain unsupported color functions (oklab/lab/lch)
  const disableOkLabStyles = async () => {
    const modified: {
      styleEls: Array<{ el: HTMLStyleElement; text: string }>;
      linkEls: Array<{ el: HTMLLinkElement; disabledBefore: boolean }>;
    } = { styleEls: [], linkEls: [] };

    // Clear inline <style> elements containing 'oklab('
    const styleEls = Array.from(document.querySelectorAll('style')) as HTMLStyleElement[];
    styleEls.forEach((el) => {
      try {
        const txt = el.textContent || '';
        if (/oklab\(/i.test(txt)) {
          modified.styleEls.push({ el, text: txt });
          el.textContent = '';
        }
      } catch {
        // ignore
      }
    });

    // For linked stylesheets, attempt to fetch and disable those containing oklab(); skip cross-origin failures
    const linkEls = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
    for (const link of linkEls) {
      try {
        const href = link.href;
        if (!href) continue;
        const res = await fetch(href, { cache: 'no-store' });
        const text = await res.text();
        if (/oklab\(/i.test(text)) {
          modified.linkEls.push({ el: link, disabledBefore: !!link.disabled });
          link.disabled = true;
        }
      } catch {
        // Could be cross-origin or network; ignore and continue
      }
    }

    return modified;
  };

  const restoreOkLabStyles = (modified: { styleEls: Array<{ el: HTMLStyleElement; text: string }>; linkEls: Array<{ el: HTMLLinkElement; disabledBefore: boolean }> }) => {
    try {
      modified.styleEls.forEach((s) => {
        try {
          s.el.textContent = s.text || '';
        } catch {}
      });
      modified.linkEls.forEach((l) => {
        try {
          l.el.disabled = !!l.disabledBefore;
        } catch {}
      });
    } catch {
      // ignore
    }
  };

  // Aggressive: disable all external stylesheets and clear <style> tags (save/restore)
  const disableAllStyles = () => {
    const saved: {
      linkEls: Array<{ el: HTMLLinkElement; disabledBefore: boolean }>;
      styleEls: Array<{ el: HTMLStyleElement; text: string }>;
    } = { linkEls: [], styleEls: [] };

    const linkEls = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
    linkEls.forEach((link) => {
      try {
        saved.linkEls.push({ el: link, disabledBefore: !!link.disabled });
        link.disabled = true;
      } catch {
        // ignore
      }
    });

    const styleEls = Array.from(document.querySelectorAll('style')) as HTMLStyleElement[];
    styleEls.forEach((style) => {
      try {
        saved.styleEls.push({ el: style, text: style.textContent || '' });
        style.textContent = '';
      } catch {
        // ignore
      }
    });

    return saved;
  };

  const restoreAllStyles = (saved: { linkEls: Array<{ el: HTMLLinkElement; disabledBefore: boolean }>; styleEls: Array<{ el: HTMLStyleElement; text: string }> }) => {
    try {
      saved.linkEls.forEach((l) => {
        try {
          l.el.disabled = !!l.disabledBefore;
        } catch {}
      });
      saved.styleEls.forEach((s) => {
        try {
          s.el.textContent = s.text || '';
        } catch {}
      });
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Toaster />
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#0f172a] mb-2">
              Your Health Snapshot
            </h1>
            <p className="text-[#64748b]">
              {fromApi
                ? "AI analysis of your uploaded lab report"
                : "Comprehensive analysis of your latest health report"}
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {hasTrendData && (
              <Link
                to="/trends"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0d9488] to-[#7c3aed] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:shadow-lg transition-all hover:scale-105"
              >
                <TrendingUp className="w-4 h-4" />
                View Trend Analysis
              </Link>
            )}
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 bg-[#0f172a] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#1e293b] hover:shadow-lg transition-all hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {isDownloading ? "Generating..." : "Download PDF"}
            </button>
          </div>
        </div>

        {/* Printable Report Container */}
        <div ref={reportRef} className="space-y-6">
          {/* Patient Information Card */}
          <div className="bg-white rounded-xl shadow-sm border-l-4 border-[#7c3aed] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#0f172a]">Patient Information</h3>
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${abnormalCount > 0
                  ? "bg-[#fb923c]/10 text-[#fb923c]"
                  : "bg-[#22c55e]/10 text-[#22c55e]"
                  }`}
              >
                {abnormalCount > 0 ? (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    {abnormalCount}{" "}
                    {abnormalCount === 1 ? "value needs" : "values need"} attention
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    All values normal
                  </>
                )}
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#0d9488]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-[#0d9488]" />
                </div>
                <div>
                  <div className="text-xs text-[#64748b] mb-1">Patient Name</div>
                  <div className="font-medium text-[#0f172a]">{patientName}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#0d9488]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-[#0d9488]" />
                </div>
                <div>
                  <div className="text-xs text-[#64748b] mb-1">Test Date</div>
                  <div className="font-medium text-[#0f172a]">{reportDate}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#0d9488]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-[#0d9488]" />
                </div>
                <div>
                  <div className="text-xs text-[#64748b] mb-1">Parameters</div>
                  <div className="font-medium text-[#0f172a]">{labData.length} extracted</div>
                </div>
              </div>
            </div>
          </div>

          {/* Parameters Table */}
          <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] mb-6 overflow-hidden">
            <div className="border-b border-[#e2e8f0] px-6 py-4 bg-[#f8fafc]">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#64748b]">Filter:</span>
                <button
                  onClick={() => setFilter("all")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === "all"
                    ? "bg-[#0d9488] text-white"
                    : "bg-white text-[#64748b] hover:bg-[#e2e8f0]"
                    }`}
                >
                  All ({labData.length})
                </button>
                <button
                  onClick={() => setFilter("abnormal")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === "abnormal"
                    ? "bg-[#ef4444] text-white"
                    : "bg-white text-[#64748b] hover:bg-[#e2e8f0]"
                    }`}
                >
                  Abnormal Only ({abnormalCount})
                </button>
                <button
                  onClick={() => setFilter("normal")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === "normal"
                    ? "bg-[#22c55e] text-white"
                    : "bg-white text-[#64748b] hover:bg-[#e2e8f0]"
                    }`}
                >
                  Normal Only ({labData.length - abnormalCount})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#0d9488] text-white">
                    <th className="text-left px-6 py-4 font-bold">Parameter</th>
                    <th className="text-left px-6 py-4 font-bold">Value</th>
                    <th className="text-left px-6 py-4 font-bold">Reference Range</th>
                    <th className="text-left px-6 py-4 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, index) => {
                    const isAbnormal = item.status !== "Normal";
                    const bgColor = isAbnormal ? "bg-[#ef4444]/10" : "bg-white";
                    const borderColor = isAbnormal ? "border-l-4 border-l-[#ef4444]" : "";
                    const badgeColor = isAbnormal ? "text-[#ef4444]" : "text-[#22c55e]";
                    const badgeBg = isAbnormal ? "bg-[#ef4444]/10" : "bg-[#22c55e]/10";

                    return (
                      <tr
                        key={index}
                        className={`border-b border-[#e2e8f0] last:border-b-0 ${bgColor} ${borderColor} hover:shadow-[inset_3px_0_0_0_#0d9488] transition-shadow`}
                      >
                        <td className="px-6 py-4 font-medium text-[#0f172a]">{item.name}</td>
                        <td className="px-6 py-4 text-[#0f172a] font-mono">
                          {item.value} {item.unit}
                        </td>
                        <td className="px-6 py-4 text-[#64748b]">
                          {item.reference_low} – {item.reference_high} {item.unit}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${badgeColor} ${badgeBg}`}
                          >
                            {isAbnormal && <AlertTriangle className="w-3 h-3" />}
                            {item.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* AI Health Summary */}
            <div className="bg-[#7c3aed]/5 rounded-xl border border-[#7c3aed]/20 overflow-hidden">
              <div className="bg-[#7c3aed] px-6 py-4 flex items-center justify-between">
                <h3 className="font-bold text-white">What Your Results Mean</h3>
                <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-white">
                  <Sparkles className="w-3 h-3" />
                  AI Generated
                </span>
              </div>
              <div className="p-6">
                {summary ? (
                  <p className="text-[#0f172a] leading-relaxed whitespace-pre-line">{summary}</p>
                ) : (
                  <p className="text-[#64748b] italic leading-relaxed">
                    Upload a lab report to get an AI-generated summary of your results.
                  </p>
                )}
                <p className="text-xs text-[#64748b] italic border-t border-[#7c3aed]/20 pt-4 mt-4">
                  This is not medical advice. Always consult your doctor.
                </p>
              </div>
            </div>

            {/* Preventive Guidance */}
            <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] overflow-hidden">
              <div className="bg-[#0d9488] px-6 py-4 flex items-center gap-2">
                <Leaf className="w-5 h-5 text-white" />
                <h3 className="font-bold text-white">What You Can Do</h3>
              </div>
              <div className="p-6">
                {preventiveGuidance ? (
                  <p className="text-[#0f172a] leading-relaxed whitespace-pre-line">
                    {preventiveGuidance}
                  </p>
                ) : (
                  <p className="text-[#64748b] italic leading-relaxed">
                    Upload a lab report to get personalized preventive guidance from AI.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Doctor Questions */}
          <div className="bg-white rounded-xl shadow-sm border-l-4 border-[#7c3aed] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MessageCircle className="w-5 h-5 text-[#7c3aed]" />
                  <h3 className="font-bold text-[#0f172a]">
                    Ask Your Doctor These Questions
                  </h3>
                </div>
                <p className="text-xs text-[#64748b]">
                  {doctorQuestions.length > 0
                    ? "Generated by AI based on your lab results"
                    : "Upload a report to generate personalized questions"}
                </p>
              </div>
              {doctorQuestions.length > 0 && (
                <button
                  onClick={handleCopyQuestions}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0d9488] text-white rounded-lg hover:bg-[#0d9488]/90 transition-colors text-sm font-medium"
                >
                  <Copy className="w-4 h-4" />
                  {isCopied ? "Copied ✓" : "Copy All Questions"}
                </button>
              )}
            </div>

            <div className="space-y-3">
              {doctorQuestions.length > 0 ? (
                doctorQuestions.map((question: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]"
                  >
                    <span className="flex items-center justify-center w-6 h-6 bg-[#7c3aed] text-white rounded-full text-xs font-bold flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-[#0f172a] leading-relaxed">{question}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-[#64748b] italic text-sm">
                  No doctor questions yet. Upload a lab report to generate personalized questions.
                </div>
              )}
            </div>
          </div>

          {/* Disclaimer Footer */}
          <div className="mt-10 pb-6 text-center">
            <p className="text-xs text-[#94a3b8]">
              This is not a medical diagnosis. Always consult your doctor.
            </p>
          </div>

        </div> {/* End of Printable Container */}
      </div>
    </div>
  );
}
