# Figma / PNG Measurements for Student Plan Page

> 当前 Codx 环境不能直接读取 Figma。本文件用于把 `assets/reference/page-reference.png` 转成可执行的前端还原标注。  
> 这些数值是根据 PNG 的视觉比例估算的第一版，可在截图对比后继续微调。

## 1. Reference

- Reference file: `assets/reference/page-reference.png`
- Reference size: `853 × 1844px`
- Target type: 移动端 / 窄屏网页
- Important rule: `page-reference.png` 只能做视觉对照，不能作为整页背景图贴进页面。

## 2. Asset Rules

### Images

| File | Purpose | Status |
|---|---|---|
| `assets/images/banner-student-study.placeholder.png` | 顶部 Banner 临时插画 | placeholder, replace with high-res transparent PNG |
| `assets/images/type-limit-green.placeholder.png` | 题型 1 临时插画 | placeholder, replace with real illustration |
| `assets/images/type-limit-purple.placeholder.png` | 题型 2 临时插画 | placeholder, replace with real illustration |

生产版本建议替换为：

| Required final file | Requirement |
|---|---|
| `assets/images/banner-student-study.png` | 高清透明 PNG，不包含标题/日期/按钮/倒计时 |
| `assets/images/type-limit-green.png` | 高清横向插画，不包含播放按钮和网页文字 |
| `assets/images/type-limit-purple.png` | 高清横向插画，不包含播放按钮和网页文字 |

### Icons

SVG icons are provided in `assets/icons/`. They are starter icons and can be replaced with final Figma-exported SVGs.

## 3. Overall Layout

- Page reference width: 853px
- Left sidebar width: ~110px
- Main shell x: ~112px
- Main content width: ~730px
- Outer shell radius: ~30px
- Main background: `#F3F7F8`
- Shell/card background: `#FFFFFF`

## 4. Sidebar

- Sidebar width: ~110px
- Sidebar background: white / very light gray
- Sidebar radius: ~24px
- Top graduation circle: ~76px diameter
- Active menu item background: `#F4F6F8`
- Active icon/text color: `#13BFA8`
- Inactive icon/text color: `#5F6E82`

## 5. Top Banner

- Banner x inside main content: ~24px
- Banner y: ~80px
- Banner width: ~680px
- Banner height: ~340px
- Banner radius: ~28px
- Background: left teal to right light cyan gradient
- Suggested CSS:
  `linear-gradient(135deg, #13AFA1 0%, #27CDBB 48%, #A8EEE7 100%)`

### Banner Text

- Title: `今日学习计划`
- Title size: ~42px
- Title weight: 800
- Title color: white
- Date/name size: ~23px
- Feedback button height: ~46px
- Feedback button radius: pill
- Feedback button background: rgba(255,255,255,0.72)

### Countdown Card

- Width: ~110px
- Height: ~128px
- Radius: ~24px
- Background: white
- Top/right offset: about 30px from banner edge
- Large number size: ~36px
- Text color: `#087C73`

## 6. Section Title

- Distance from banner bottom: ~42px
- Title: `今日全部学习单元`
- Icon size: ~32px
- Text size: ~30px
- Count text aligned right: `共 2 个题型`

## 7. Type Cards

- Card width: ~680px
- Card radius: ~22px
- Card padding: ~20px
- Card gap: ~24px
- Card background: white
- Card shadow: soft
- Border: very light gray/teal

### Card Header

- Label: `题型 1` / `题型 2`
- Label background: `#E8FAF7`
- Label radius: ~14px
- Label height: ~44px
- Title size: ~25px
- Arrow button: ~42px circle

### Illustration Hero

- Hero width: full card content width
- Hero height: ~175px
- Hero radius: ~16px
- Playback pill should be HTML/CSS overlay, not baked into image.

## 8. Source Module

- Container background:
  - Green card: `#E8FAF7`
  - Purple card: `#F2F0FF`
- Container radius: ~18px
- Row height: ~46px
- Row radius: pill
- Row background: rgba(255,255,255,0.82)

## 9. Feedback Module

- Background: warm light orange `#FFF8EE`
- Radius: ~22px
- Header title: `做题反馈`
- Status pill: orange border/background
- Row height: ~48px
- Buttons:
  - Correct: green light pill
  - Wrong: red light pill
  - Not done: gray pill

## 10. Implementation Rules for Codx

1. Do not call Figma.
2. Do not use `page-reference.png` as a full-page background.
3. Build UI with HTML/CSS components.
4. Use placeholder images only until high-resolution final images are supplied.
5. Overlay dynamic text/buttons using HTML/CSS.
6. Generate a screenshot after implementation and compare it with `page-reference.png`.
7. Adjust in small visual-matching iterations.
