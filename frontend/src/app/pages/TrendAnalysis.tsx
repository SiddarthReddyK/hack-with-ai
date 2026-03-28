import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Upload,
  ArrowLeft,
  User,
  Calendar,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Link } from "react-router";

type TrendEntry = {
  name: string;
  unit: string;
  older_value: number;
  newer_value: number;
  absolute_change: number;
  percentage_change: number | null;
  direction: "Increased" | "Decreased" | "Unchanged";
  older_status: string;
  newer_status: string;
};

type TrendData = {
  patient_name: string;
  older_report_date: string;
  newer_report_date: string;
  trends: TrendEntry[];
  only_in_older: string[];
  graph_base64: string | null;
};

function StatusBadge({ status }: { status: string }) {
  const isAbnormal = status === "High" || status === "Low";
  return (
    <span
      className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${isAbnormal
          ? "bg-[#ef4444]/10 text-[#ef4444]"
          : "bg-[#22c55e]/10 text-[#22c55e]"
        }`}
    >
      {status}
    </span>
  );
}

function DirectionIcon({ direction, improving }: { direction: string; improving: boolean }) {
  const color = direction === "Unchanged" ? "text-[#64748b]" : improving ? "text-[#22c55e]" : "text-[#ef4444]";
  if (direction === "Increased") return <TrendingUp className={`w-5 h-5 ${color}`} />;
  if (direction === "Decreased") return <TrendingDown className={`w-5 h-5 ${color}`} />;
  return <Minus className="w-5 h-5 text-[#64748b]" />;
}

export function TrendAnalysis() {
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "improved" | "worsened">("all");

  useEffect(() => {
    const stored = localStorage.getItem("trendData");
    if (stored) {
      try {
        setTrendData(JSON.parse(stored) as TrendData);
      } catch {
        /* ignore */
      }
    }
  }, []);

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!trendData) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <div className="w-20 h-20 bg-[#0d9488]/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Upload className="w-9 h-9 text-[#0d9488]" />
          </div>
          <h1 className="text-3xl font-bold text-[#0f172a] mb-3">No Trend Data Yet</h1>
          <p className="text-[#64748b] text-lg mb-8">
            Upload <strong>two lab reports</strong> from different dates to compare your health metrics over time.
          </p>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0d9488] to-[#7c3aed] text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <Upload className="w-5 h-5" />
            Go to Upload
          </Link>
        </div>
      </div>
    );
  }

  const { patient_name, older_report_date, newer_report_date, trends, only_in_older, graph_base64 } = trendData;

  // Classify trends
  const worsened = trends.filter(
    (t) => t.direction !== "Unchanged" && (t.newer_status === "High" || t.newer_status === "Low")
  );
  const improved = trends.filter(
    (t) => t.direction !== "Unchanged" && t.newer_status === "Normal" && t.older_status !== "Normal"
  );

  const displayed =
    activeTab === "improved"
      ? improved
      : activeTab === "worsened"
        ? worsened
        : trends;

  // ── Main view ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Breadcrumb ─────────────────────────────────────────── */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-[#64748b] hover:text-[#0d9488] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* ── Page title ─────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0f172a] mb-1">Health Trend Comparison</h1>
          <p className="text-[#64748b]">See how your lab results changed between two visits</p>
        </div>

        {/* ── Patient + Dates card ───────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 mb-6">
          <div className="flex flex-wrap items-center gap-6">
            {/* Patient */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#7c3aed]/10 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-[#7c3aed]" />
              </div>
              <div>
                <p className="text-xs text-[#64748b]">Patient</p>
                <p className="font-bold text-[#0f172a]">{patient_name}</p>
              </div>
            </div>

            {/* Date flow */}
            <div className="flex items-center gap-3 flex-grow">
              <div className="flex items-center gap-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2">
                <Calendar className="w-4 h-4 text-[#64748b]" />
                <div>
                  <p className="text-xs text-[#64748b]">Older Report</p>
                  <p className="font-semibold text-[#0f172a]">{older_report_date}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#94a3b8] flex-shrink-0" />
              <div className="flex items-center gap-2 bg-[#7c3aed]/5 border border-[#7c3aed]/20 rounded-xl px-4 py-2">
                <Calendar className="w-4 h-4 text-[#7c3aed]" />
                <div>
                  <p className="text-xs text-[#7c3aed]">Newer Report</p>
                  <p className="font-semibold text-[#0f172a]">{newer_report_date}</p>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex gap-4 ml-auto">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#22c55e]">{improved.length}</p>
                <p className="text-xs text-[#64748b]">Improved</p>
              </div>
              <div className="w-px bg-[#e2e8f0]" />
              <div className="text-center">
                <p className="text-2xl font-bold text-[#ef4444]">{worsened.length}</p>
                <p className="text-xs text-[#64748b]">Need attention</p>
              </div>
              <div className="w-px bg-[#e2e8f0]" />
              <div className="text-center">
                <p className="text-2xl font-bold text-[#64748b]">{trends.length - improved.length - worsened.length}</p>
                <p className="text-xs text-[#64748b]">Stable</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Summary banner ─────────────────────────────────────── */}
        {(improved.length > 0 || worsened.length > 0) && (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {improved.length > 0 && (
              <div className="bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#22c55e] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#0f172a] mb-1">
                    {improved.length} parameter{improved.length > 1 ? "s" : ""} improved 🎉
                  </p>
                  <p className="text-sm text-[#64748b]">
                    {improved.map((t) => t.name).join(", ")} moved back to the normal range.
                  </p>
                </div>
              </div>
            )}
            {worsened.length > 0 && (
              <div className="bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#0f172a] mb-1">
                    {worsened.length} parameter{worsened.length > 1 ? "s" : ""} need attention ⚠️
                  </p>
                  <p className="text-sm text-[#64748b]">
                    {worsened.map((t) => `${t.name} (${t.newer_status})`).join(", ")}.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Graph ──────────────────────────────────────────────── */}
        {graph_base64 && (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#7c3aed]" />
              <h2 className="text-lg font-bold text-[#0f172a]">Visual Comparison</h2>
              <span className="text-xs bg-[#7c3aed]/10 text-[#7c3aed] px-2 py-0.5 rounded-full font-medium ml-1">AI Generated</span>
            </div>
            <div className="flex justify-center bg-[#f8fafc] rounded-xl p-4">
              <img
                src={graph_base64}
                alt="Lab parameter percentage change chart"
                className="rounded-lg max-w-full"
                style={{ maxHeight: "420px" }}
              />
            </div>
            <p className="text-xs text-[#94a3b8] text-center mt-3">
              🟦 Decreased &nbsp;·&nbsp; 🟥 Increased — sorted by magnitude of change
            </p>
          </div>
        )}

        {/* ── Parameter cards ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden mb-6">
          {/* Tab bar */}
          <div className="flex items-center gap-1 px-6 pt-5 pb-0 border-b border-[#e2e8f0]">
            {[
              { key: "all", label: `All (${trends.length})` },
              { key: "worsened", label: `⚠ Needs Attention (${worsened.length})` },
              { key: "improved", label: `✓ Improved (${improved.length})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all ${activeTab === key
                    ? key === "worsened"
                      ? "border-[#ef4444] text-[#ef4444]"
                      : key === "improved"
                        ? "border-[#22c55e] text-[#22c55e]"
                        : "border-[#0d9488] text-[#0d9488]"
                    : "border-transparent text-[#64748b] hover:text-[#0f172a]"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Cards */}
          <div className="divide-y divide-[#f1f5f9]">
            {displayed.length === 0 ? (
              <div className="py-12 text-center text-[#64748b] text-sm">
                No parameters in this category.
              </div>
            ) : (
              displayed.map((item, index) => {
                const isImproving =
                  (item.direction !== "Unchanged") &&
                  item.newer_status === "Normal";
                const isWorsening =
                  item.direction !== "Unchanged" &&
                  (item.newer_status === "High" || item.newer_status === "Low");

                const pctLabel =
                  item.percentage_change !== null
                    ? `${item.percentage_change > 0 ? "+" : ""}${item.percentage_change.toFixed(1)}%`
                    : "—";

                const changeColor = isImproving
                  ? "text-[#22c55e]"
                  : isWorsening
                    ? "text-[#ef4444]"
                    : "text-[#64748b]";

                const rowBg = isWorsening
                  ? "bg-[#ef4444]/3"
                  : isImproving
                    ? "bg-[#22c55e]/3"
                    : "bg-white";

                return (
                  <div key={index} className={`px-6 py-4 ${rowBg} hover:bg-[#f8fafc] transition-colors`}>
                    <div className="flex flex-wrap items-center gap-4">
                      {/* Name + unit */}
                      <div className="min-w-[180px] flex-1">
                        <p className="font-semibold text-[#0f172a]">{item.name}</p>
                        <p className="text-xs text-[#94a3b8]">{item.unit}</p>
                      </div>

                      {/* Older value */}
                      <div className="text-center min-w-[100px]">
                        <p className="text-xs text-[#94a3b8] mb-1">{older_report_date}</p>
                        <p className="text-lg font-mono font-bold text-[#64748b]">{item.older_value}</p>
                        <StatusBadge status={item.older_status} />
                      </div>

                      {/* Arrow + change */}
                      <div className="flex flex-col items-center min-w-[80px]">
                        <DirectionIcon direction={item.direction} improving={isImproving} />
                        <p className={`text-sm font-bold mt-1 ${changeColor}`}>{pctLabel}</p>
                      </div>

                      {/* Newer value */}
                      <div className="text-center min-w-[100px]">
                        <p className="text-xs text-[#7c3aed] mb-1 font-medium">{newer_report_date}</p>
                        <p className={`text-lg font-mono font-bold ${isWorsening ? "text-[#ef4444]" : "text-[#0f172a]"}`}>
                          {item.newer_value}
                        </p>
                        <StatusBadge status={item.newer_status} />
                      </div>

                      {/* Plain-English label */}
                      <div className="ml-auto">
                        {isImproving ? (
                          <span className="inline-flex items-center gap-1 bg-[#22c55e]/10 text-[#22c55e] text-xs font-bold px-3 py-1.5 rounded-full">
                            <CheckCircle className="w-3.5 h-3.5" /> Improved
                          </span>
                        ) : isWorsening ? (
                          <span className="inline-flex items-center gap-1 bg-[#ef4444]/10 text-[#ef4444] text-xs font-bold px-3 py-1.5 rounded-full">
                            <AlertTriangle className="w-3.5 h-3.5" /> Needs Attention
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-[#64748b]/10 text-[#64748b] text-xs font-bold px-3 py-1.5 rounded-full">
                            <Minus className="w-3.5 h-3.5" /> Stable
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Parameters only in older report ────────────────────── */}
        {only_in_older.length > 0 && (
          <div className="bg-[#fb923c]/5 border border-[#fb923c]/20 rounded-xl p-5 mb-6">
            <p className="font-semibold text-[#fb923c] mb-2">
              📋 Tests not repeated in the newer report
            </p>
            <p className="text-sm text-[#64748b] mb-3">
              These parameters appeared in your older report but were not included in the newer one:
            </p>
            <div className="flex flex-wrap gap-2">
              {only_in_older.map((name) => (
                <span key={name} className="text-xs bg-white border border-[#fb923c]/30 text-[#fb923c] px-3 py-1 rounded-full">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Disclaimer ─────────────────────────────────────────── */}
        <p className="text-xs text-center text-[#94a3b8] pb-8">
          This is not a medical diagnosis. Always consult your doctor about changes in your lab results.
        </p>
      </div>
    </div>
  );
}
