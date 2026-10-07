# Email Design System

This document defines the shared email template structure and style system used by Backlyst.
It describes the design tokens, layout rules, typography, spacing, color palette, and component classes used across all email templates.

## 1. Root layout

All email templates are rendered through the root layout file:

- `src/templates/layouts/main.hbs`

The root layout provides the shared shell for every email:

- global body background
- container card styling
- header and footer structure
- reusable typography utilities
- shared component classes and design tokens

Every email template should be a child template that only defines email-specific markup and placeholders.
The layout injects template content using `{{{body}}}`.

## 2. Design tokens

Use the following design properties consistently across all template content.

### 2.1 Color palette

- `brand-blue`: `#3b82f6` (primary header and accent)
- `brand-indigo`: `#6366f1` (secondary accent, OTP and CTA backgrounds)
- `surface`: `#ffffff` (card background)
- `surface-strong`: `#f4f6f8` (footer and subtle panels)
- `surface-muted`: `#f8fafc` (message cards and metadata blocks)
- `text-primary`: `#111827` (main body headings)
- `text-secondary`: `#374151` (paragraph copy)
- `text-muted`: `#6b7280` (supporting copy, captions)
- `border`: `#e5e7eb` (panels, divider borders)
- `background`: `linear-gradient(135deg, #667eea, #764ba2)` (email page background)

### 2.2 Typography

- base font family: `Arial, sans-serif`
- heading font weight: `700`
- body font weight: `400`
- line height: `1.7`
- title size: `22px`
- body size: `15px`
- small copy size: `13px`

### 2.3 Spacing scale

- `space-0`: `0`
- `space-1`: `8px`
- `space-2`: `14px`
- `space-3`: `16px`
- `space-4`: `18px`
- `space-5`: `20px`
- `space-6`: `24px`
- `space-7`: `30px`
- `space-8`: `32px`
- `space-9`: `40px`

### 2.4 Layout tokens

- container width: `max-width: 700px`
- container radius: `12px` / `14px`
- card shadow: `0 14px 35px rgba(0, 0, 0, 0.16)`
- border radius: `10px`
- content padding: `32px` (desktop) and `22px` (mobile)

## 3. Layout structure

The root layout defines the overall structure.

### 3.1 Page structure

- `body`: full-page background, centered container
- `.container`: white card with rounded corners and shadow
- `.header`: bold colored header block
- `.body`: main email content area
- `.footer`: footer with small muted text

### 3.2 Responsive behavior

- reduce container margin on mobile
- scale down header font size
- decrease padding inside `.body`
- preserve readability on narrow screens

## 4. Shared classes

The root layout exposes reusable classes for child templates.
Child templates should use these classes instead of inline styles where possible.

### 4.1 Content classes

- `.content-title`
  - large heading style
  - used for important titles inside the email body

- `.content-copy`
  - standard paragraph text
  - use for most copy and supporting sentences

### 4.2 Utility classes

- `.otp-box`
  - strong circular button-like block for verification codes
  - uses accent gradient background and uppercase spacing

- `.message-box`
  - light panel for reasons, alerts, or contextual information
  - uses surface-muted background with border and padding

- `.row`
  - flexible row layout for key/value pairs
  - used for structured metadata content in support and status emails

- `.label`
  - metadata field label
  - bold and high contrast for readability

- `.link`
  - text link styling
  - brand accent color with underline on hover

### 4.3 Visual hierarchy

Use the classes to express importance:

- headings: `.content-title`
- body text: `.content-copy`
- callout panels: `.message-box`
- metadata labels: `.label`
- links: `.link`

## 5. Template conventions

### 5.1 Template folder structure

- root layout: `src/templates/layouts/main.hbs`
- templates: `src/templates/*.hbs`

All non-layout templates should be direct children of the root templates folder.

### 5.2 Avoid inline styling

Prefer shared classes.
Inline styles are allowed only for small layout adjustments that cannot be expressed in the shared stylesheet.

### 5.3 Content patterns

- greeting and clear opening statement
- concise explanation of why the email was sent
- action or next step clearly marked
- closing and support instructions

## 6. Design properties reference

### 6.1 Colors

- `primary`: `#3b82f6`
- `secondary`: `#6366f1`
- `surface`: `#ffffff`
- `surface-alt`: `#f4f6f8`
- `surface-muted`: `#f8fafc`
- `text-primary`: `#111827`
- `text-secondary`: `#374151`
- `text-muted`: `#6b7280`
- `border`: `#e5e7eb`
- `background`: `linear-gradient(135deg, #667eea, #764ba2)`

### 6.2 Typography

- font family: `Arial, sans-serif`
- headings: bold, `700`
- body: regular, `400`
- title: `22px`
- paragraph: `15px`
- small: `13px`
- line height: `1.7`

### 6.3 Spacing

- `8px` - small gap and minor vertical spacing
- `14px` - line, row spacing
- `16px` - paragraph spacing and block padding
- `20px` - medium gap and panel padding
- `24px` - outer content spacing
- `32px` - large content padding
- `40px` - section separation and card margin

### 6.4 Boxes and borders

- border radius: `10px`
- elevated container shadow: `0 14px 35px rgba(0, 0, 0, 0.16)`
- panel border: `1px solid #e5e7eb`

## 7. Existing template mapping

Current templates and their purpose:

- `src/templates/otp.hbs` — verification code email
- `src/templates/reset-password.hbs` — password reset OTP email
- `src/templates/ban-user.hbs` — account suspension notification
- `src/templates/support.hbs` — support request summary
- `src/templates/website-verified.hbs` — website verification confirmation

## 8. Best practices

- keep copy short and scannable
- use shared classes for layout and spacing
- use accent color only for important states and links
- avoid complex grids and unsupported email CSS features
- keep the design simple and accessible

## 9. Maintenance

When updating the email system:

1. update `src/templates/layouts/main.hbs`
2. add or update shared utility classes there
3. update child templates to use the new classes
4. test in both local and built `dist` versions
5. keep the root layout as the single source of style truth
