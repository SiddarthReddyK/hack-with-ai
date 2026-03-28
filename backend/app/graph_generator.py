"""
graph_generator.py
------------------
Generates a clear, user-friendly bar chart comparing lab parameter
percentage changes between two reports.
Uses matplotlib (Agg backend) for thread-safe non-GUI rendering.
"""

import base64
import io
import matplotlib
matplotlib.use('Agg')

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np


def generate_trend_graph_base64(trends: list[dict]) -> str | None:
    """
    Generate a clean horizontal bar chart showing % change for each
    lab parameter. Green = improved/decreased toward normal,
    Red = worsened/increased away from normal or went higher.
    Returns a base64 data URI string, or None if no valid data.
    """
    valid_trends = [
        t for t in trends
        if t.get('percentage_change') is not None and t['percentage_change'] != 0
    ]

    if not valid_trends:
        return None

    # Sort by absolute percentage change (biggest movers first)
    valid_trends.sort(key=lambda x: abs(x['percentage_change']), reverse=True)
    top_trends = valid_trends[:12]  # Max 12 for readability

    names    = [t['name'] for t in top_trends]
    pct      = [t['percentage_change'] for t in top_trends]
    newer_st = [t.get('newer_status', 'Normal') for t in top_trends]

    # Color: green if newer status is Normal (good outcome), red otherwise
    colors = [
        '#22c55e' if st == 'Normal' else '#ef4444'
        for st in newer_st
    ]

    # ── Figure setup ────────────────────────────────────────────────────────
    bar_height = 0.55
    fig_height = max(5, len(names) * 0.78 + 2.2)
    fig, ax = plt.subplots(figsize=(12, fig_height))
    fig.patch.set_facecolor('#ffffff')
    ax.set_facecolor('#f8fafc')

    # ── Draw bars ───────────────────────────────────────────────────────────
    y_pos = np.arange(len(names))
    bars = ax.barh(y_pos, pct, height=bar_height, color=colors,
                   edgecolor='white', linewidth=0.8, zorder=3)

    # ── Zero reference line ─────────────────────────────────────────────────
    ax.axvline(0, color='#94a3b8', linewidth=1.4, zorder=4)

    # ── Value labels on bars ────────────────────────────────────────────────
    for bar, val, status in zip(bars, pct, newer_st):
        w = bar.get_width()
        label = f"{'+' if w > 0 else ''}{w:.1f}%"
        offset = max(abs(w) * 0.04, 1.5)
        ha = 'left' if w >= 0 else 'right'
        x = w + offset if w >= 0 else w - offset
        ax.text(x, bar.get_y() + bar.get_height() / 2,
                label, ha=ha, va='center',
                fontsize=10, fontweight='bold',
                color='#374151', zorder=5)

    # ── Status icon next to parameter name ──────────────────────────────────
    label_names = []
    for name, status in zip(names, newer_st):
        icon = '✓' if status == 'Normal' else '⚠'
        # Truncate long names
        short = name if len(name) <= 28 else name[:26] + '…'
        label_names.append(f'{icon}  {short}')

    # ── Axes formatting ─────────────────────────────────────────────────────
    ax.set_yticks(y_pos)
    ax.set_yticklabels(label_names, fontsize=11, color='#1e293b')
    ax.invert_yaxis()  # Largest change at top

    ax.set_xlabel('Change from Previous Report (%)', fontsize=11,
                  color='#475569', labelpad=10)

    ax.set_title('Lab Parameter Changes Since Last Report',
                 fontsize=15, fontweight='bold', color='#0f172a',
                 pad=18, loc='left')

    # Grid on x-axis only
    ax.xaxis.grid(True, color='#e2e8f0', linestyle='--', linewidth=0.8, zorder=0)
    ax.set_axisbelow(True)

    # Remove top/right spines; style rest
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#e2e8f0')
    ax.spines['bottom'].set_color('#e2e8f0')

    ax.tick_params(axis='x', colors='#64748b', labelsize=10)
    ax.tick_params(axis='y', length=0)

    # Expand x-limits to fit labels
    x_min, x_max = ax.get_xlim()
    padding = max(abs(x_min), abs(x_max)) * 0.30
    ax.set_xlim(x_min - padding, x_max + padding)

    # ── Legend ──────────────────────────────────────────────────────────────
    good_patch = mpatches.Patch(color='#22c55e', label='✓  Now in normal range  (improved)')
    bad_patch  = mpatches.Patch(color='#ef4444', label='⚠  Outside normal range  (needs attention)')
    ax.legend(
        handles=[good_patch, bad_patch],
        loc='lower right', frameon=True,
        framealpha=0.95, edgecolor='#e2e8f0',
        fontsize=10, labelcolor='#374151',
    )

    # ── Subtitle hint ───────────────────────────────────────────────────────
    ax.text(0.0, 1.01,
            'Sorted by size of change · ✓ = back to normal · ⚠ = outside normal range',
            transform=ax.transAxes, fontsize=9, color='#94a3b8')

    plt.tight_layout(pad=1.5)

    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=130,
                bbox_inches='tight', facecolor='white')
    plt.close(fig)
    buf.seek(0)

    img_b64 = base64.b64encode(buf.read()).decode('utf-8')
    return f"data:image/png;base64,{img_b64}"
