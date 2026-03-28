import { Activity } from "lucide-react";
import { Link, useLocation } from "react-router";

export function Navbar() {
  const location = useLocation();

  return (
    <nav className="bg-white border-b border-[#e2e8f0] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0d9488] to-[#7c3aed] rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-[#0d9488]">
              AI Health Insight Companion
            </span>
          </Link>

          <div className="flex items-center gap-8">
            <Link
              to="/"
              className={`text-sm relative pb-1 ${
                location.pathname === "/"
                  ? "text-[#7c3aed] font-medium"
                  : "text-[#64748b] hover:text-[#0d9488]"
              } transition-colors`}
            >
              Home
              {location.pathname === "/" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7c3aed]" />
              )}
            </Link>
            <Link
              to="/dashboard"
              className={`text-sm relative pb-1 ${
                location.pathname === "/dashboard"
                  ? "text-[#7c3aed] font-medium"
                  : "text-[#64748b] hover:text-[#0d9488]"
              } transition-colors`}
            >
              Dashboard
              {location.pathname === "/dashboard" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7c3aed]" />
              )}
            </Link>
            <Link
              to="/trends"
              className={`text-sm relative pb-1 ${
                location.pathname === "/trends"
                  ? "text-[#7c3aed] font-medium"
                  : "text-[#64748b] hover:text-[#0d9488]"
              } transition-colors`}
            >
              Trends
              {location.pathname === "/trends" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7c3aed]" />
              )}
            </Link>
            <Link
              to="/insurance"
              className={`text-sm relative pb-1 ${
                location.pathname === "/insurance"
                  ? "text-[#7c3aed] font-medium"
                  : "text-[#64748b] hover:text-[#0d9488]"
              } transition-colors`}
            >
              Insurance
              {location.pathname === "/insurance" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7c3aed]" />
              )}
            </Link>

            <Link
              to="/upload"
              className="bg-gradient-to-r from-[#0d9488] to-[#7c3aed] text-white px-5 py-2 rounded-lg font-medium text-sm hover:shadow-lg transition-all hover:scale-105"
            >
              Upload Report
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
