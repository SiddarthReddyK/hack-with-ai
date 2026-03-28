import { createBrowserRouter } from "react-router";
import { Landing } from "./pages/Landing";
import { Upload } from "./pages/Upload";
import { Dashboard } from "./pages/Dashboard";
import { TrendAnalysis } from "./pages/TrendAnalysis";
import { InsuranceChecker } from "./pages/InsuranceChecker";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Landing,
  },
  {
    path: "/upload",
    Component: Upload,
  },
  {
    path: "/dashboard",
    Component: Dashboard,
  },
  {
    path: "/trends",
    Component: TrendAnalysis,
  },
  {
    path: "/insurance",
    Component: InsuranceChecker,
  },
]);
