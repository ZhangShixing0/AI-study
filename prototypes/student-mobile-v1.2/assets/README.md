# Student Mobile Prototype Assets

This directory stores the runtime assets and design references for the student mobile prototype.

## Directory Structure

- `images/`
  - Runtime illustration images used by `index.html`.
  - Current files:
    - `banner-student-study.placeholder.png`
    - `type-limit-green.placeholder.png`
    - `type-limit-purple.placeholder.png`

- `icons/`
  - Runtime SVG icons used by `index.html`.
  - Current files:
    - `icon-graduation.svg`
    - `icon-plan.svg`
    - `icon-rank.svg`
    - `icon-chart.svg`
    - `icon-section-plan.svg`
    - `icon-book.svg`
    - `icon-play.svg`
    - `icon-arrow-right.svg`
    - `icon-feedback.svg`
    - `icon-calendar.svg`
    - `icon-edit.svg`

- `reference/`
  - Full-page page references for visual comparison.
  - These files are for development reference only, not runtime page assets.
  - Current files:
    - `today-plan-reference.png` - 今日计划页面
    - `ranking-reference.png` - 排行页面
    - `curve-reference.png` - 曲线页面
    - `study-room-reference.png` - 自习室页面

- `annotations/`
  - Figma measurements and implementation notes.
  - Current file: `figma-measurements.md`

## Notes

1. Do not use the full-page reference PNG as the page background.
2. The `.placeholder.png` files are temporary layout-matching images. Replace them with final high-resolution illustrations before production.
3. Keep page text, buttons, badges, and countdown content in HTML/CSS rather than baking them into images.
