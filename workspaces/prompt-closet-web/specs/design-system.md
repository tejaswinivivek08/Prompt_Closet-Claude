# Design System Spec — Prompt Closet Web

## Color Palette

```
Ivory (bg):     #F5F0EA
Rose Gold:      #C9847A
Charcoal (text):#2B2B2B
White (cards):  #FFFFFF
Border:         #E5DDD5
Muted text:     #7A6F68
```

## Typography

- Font: Inter (Google Fonts)
- Headings: Inter 700 (bold)
- Body: Inter 400/500
- Scale: 14/16/18/24/32/48px

## Tailwind Config

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        ivory: "#F5F0EA",
        "rose-gold": "#C9847A",
        charcoal: "#2B2B2B",
        border: "#E5DDD5",
        muted: "#7A6F68",
      },
      fontFamily: { inter: ["Inter", "sans-serif"] },
      borderRadius: { card: "12px" },
    },
  },
};
```

## Components

### Card

- White background, border-radius 12px, shadow-sm
- Padding: 24px
- Border: 1px solid #E5DDD5

### Button Primary

- Background: rose-gold (#C9847A)
- Text: white
- Padding: 12px 24px
- Border-radius: 8px
- Hover: opacity-90

### Input

- Border: 1px solid #E5DDD5
- Border-radius: 8px
- Padding: 12px 16px
- Focus: ring-2 ring-rose-gold

### Filter Pill

- Default: white bg, border, charcoal text
- Active: rose-gold bg, white text
- Height: 36px min
- Padding: 8px 16px
- Border-radius: 18px (pill shape)

### Modal / Slide-over

- Backdrop: rgba(0,0,0,0.4)
- White panel, slides from right
- Width: 480px max
- Full height
