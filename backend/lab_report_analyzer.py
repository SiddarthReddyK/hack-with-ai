"""
Lab Report Analyzer - Core Logic Layer
AI Health Insight Companion

Provides pure, modular functions for:
  - Classifying lab parameter statuses
  - Computing trend analysis between two reports
"""


# ─────────────────────────────────────────────
# FUNCTION 1: Status Classification
# ─────────────────────────────────────────────

def classify_report_statuses(report: dict) -> dict:
    """
    Classifies each parameter in a lab report as 'High', 'Low', or 'Normal'
    based on its reference range.

    Args:
        report (dict): A structured lab report JSON object containing a
                       'parameters' list. Each parameter must include:
                       'value', 'reference_low', and 'reference_high'.

    Returns:
        dict: A new report dict with 'status' set on every parameter.
              The original dict is NOT mutated.

    Raises:
        KeyError:  If a required key is missing from a parameter entry.
        TypeError: If numeric fields are not comparable numbers.
    """
    import copy
    classified = copy.deepcopy(report)

    for param in classified.get("parameters", []):
        value          = param["value"]
        reference_low  = param["reference_low"]
        reference_high = param["reference_high"]

        if value > reference_high:
            param["status"] = "High"
        elif value < reference_low:
            param["status"] = "Low"
        else:
            param["status"] = "Normal"

    return classified


# ─────────────────────────────────────────────
# FUNCTION 2: Trend Analysis
# ─────────────────────────────────────────────

def analyze_trends(older_report: dict, newer_report: dict) -> dict:
    """
    Compares two structured lab reports and computes parameter-level trends.

    For each parameter that exists in both reports (matched by name), the
    function calculates:
      - absolute_change : newer_value - older_value
      - percentage_change: (absolute_change / older_value) * 100
                           Returns None if older_value is 0 (division guard).
      - direction        : 'Increased', 'Decreased', or 'Unchanged'

    Parameters present in only one report are captured separately.

    Args:
        older_report (dict): The earlier lab report (baseline).
        newer_report (dict): The more recent lab report (comparison target).

    Returns:
        dict: Structured trend analysis with the following shape:
            {
                "patient_name"    : str,
                "older_report_date": str,
                "newer_report_date": str,
                "trends"          : [
                    {
                        "name"              : str,
                        "unit"              : str,
                        "older_value"       : number,
                        "newer_value"       : number,
                        "absolute_change"   : number,
                        "percentage_change" : float | None,
                        "direction"         : str,
                        "older_status"      : str,
                        "newer_status"      : str,
                    },
                    ...
                ],
                "only_in_older"   : [str],   # parameter names
                "only_in_newer"   : [str],   # parameter names
            }
    """
    # Build lookup maps keyed by parameter name
    def _build_param_map(report: dict) -> dict:
        return {p["name"]: p for p in report.get("parameters", [])}

    older_map = _build_param_map(older_report)
    newer_map = _build_param_map(newer_report)

    common_names    = older_map.keys() & newer_map.keys()
    only_in_older   = sorted(older_map.keys() - newer_map.keys())
    only_in_newer   = sorted(newer_map.keys() - older_map.keys())

    trends = []
    for name in sorted(common_names):
        old_param = older_map[name]
        new_param = newer_map[name]

        older_value = old_param["value"]
        newer_value = new_param["value"]

        absolute_change = round(newer_value - older_value, 6)

        if older_value != 0:
            percentage_change = round((absolute_change / older_value) * 100, 2)
        else:
            percentage_change = None   # avoid ZeroDivisionError

        if absolute_change > 0:
            direction = "Increased"
        elif absolute_change < 0:
            direction = "Decreased"
        else:
            direction = "Unchanged"

        trends.append({
            "name"              : name,
            "unit"              : new_param.get("unit", old_param.get("unit", "")),
            "older_value"       : older_value,
            "newer_value"       : newer_value,
            "absolute_change"   : absolute_change,
            "percentage_change" : percentage_change,
            "direction"         : direction,
            "older_status"      : old_param.get("status", ""),
            "newer_status"      : new_param.get("status", ""),
        })

    return {
        "patient_name"     : newer_report.get("patient_name", ""),
        "older_report_date": older_report.get("report_date", ""),
        "newer_report_date": newer_report.get("report_date", ""),
        "trends"           : trends,
        "only_in_older"    : only_in_older,
        "only_in_newer"    : only_in_newer,
    }


# ─────────────────────────────────────────────
# Quick smoke-test (remove in production)
# ─────────────────────────────────────────────

if __name__ == "__main__":
    import json

    sample_report_jan = {
        "patient_name": "Akshay Sharma",
        "report_date" : "2026-01-15",
        "parameters"  : [
            {"name": "Hemoglobin",   "value": 11.2, "unit": "g/dL",  "reference_low": 13.0, "reference_high": 17.0, "status": ""},
            {"name": "Glucose",      "value": 95.0, "unit": "mg/dL", "reference_low": 70.0, "reference_high": 100.0,"status": ""},
            {"name": "Cholesterol",  "value": 215.0,"unit": "mg/dL", "reference_low": 0.0,  "reference_high": 200.0,"status": ""},
        ]
    }

    sample_report_feb = {
        "patient_name": "Akshay Sharma",
        "report_date" : "2026-02-20",
        "parameters"  : [
            {"name": "Hemoglobin",   "value": 12.8, "unit": "g/dL",  "reference_low": 13.0, "reference_high": 17.0, "status": ""},
            {"name": "Glucose",      "value": 88.0, "unit": "mg/dL", "reference_low": 70.0, "reference_high": 100.0,"status": ""},
            {"name": "Cholesterol",  "value": 185.0,"unit": "mg/dL", "reference_low": 0.0,  "reference_high": 200.0,"status": ""},
            {"name": "Vitamin D",    "value": 18.0, "unit": "ng/mL", "reference_low": 20.0, "reference_high": 50.0, "status": ""},
        ]
    }

    # Step 1 – classify statuses
    classified_jan = classify_report_statuses(sample_report_jan)
    classified_feb = classify_report_statuses(sample_report_feb)

    print("=== Classified January Report ===")
    print(json.dumps(classified_jan, indent=2))

    print("\n=== Classified February Report ===")
    print(json.dumps(classified_feb, indent=2))

    # Step 2 – trend analysis
    trends = analyze_trends(classified_jan, classified_feb)

    print("\n=== Trend Analysis ===")
    print(json.dumps(trends, indent=2))
