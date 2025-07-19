# @suara/ui

UI components and design system for the Suara.id platform, optimized for Indonesian users and mobile-first experiences.

## 🎨 Design Philosophy

This design system is specifically crafted for Indonesian civic engagement:

- **🇮🇩 Indonesian Context**: Colors inspired by Indonesian flag, cultural preferences, and local design patterns
- **📱 Mobile-First**: Optimized for touch interfaces with 44px minimum touch targets
- **♿ Accessibility**: WCAG AA compliant with high contrast and screen reader support
- **🚀 Performance**: Lightweight components with minimal bundle size
- **🎯 User-Centered**: Designed for Indonesian civic issue reporting workflows

## 📦 Installation

```bash
# Install the package
pnpm add @suara/ui

# Install peer dependencies
pnpm add react react-dom

# Install Tailwind CSS (if not already installed)
pnpm add -D tailwindcss @tailwindcss/forms @tailwindcss/typography
```

## 🚀 Quick Start

1. **Import styles in your app:**

```typescript
// In your main app file (e.g., App.tsx)
import '@suara/ui/styles';
```

2. **Configure Tailwind CSS:**

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@suara/ui/**/*.{js,ts,jsx,tsx}',
  ],
  // ... extend with @suara/ui theme if needed
}
```

3. **Start using components:**

```typescript
import { Button, Input, ChatBubble, TrustBadge } from '@suara/ui';

function MyApp() {
  return (
    <div>
      <TrustBadge level="VERIFIED" score={3.2} />
      <Input label="Nomor Telepon" placeholder="08123456789" />
      <Button variant="primary">Kirim Laporan</Button>
    </div>
  );
}
```

## 🧩 Components

### Core Components

#### Button
Touch-friendly buttons with loading states and Indonesian labels.

```typescript
<Button variant="primary" size="lg" loading={isSubmitting}>
  Kirim Laporan
</Button>

<Button variant="secondary" leftIcon={<PlusIcon />}>
  Tambah Foto
</Button>
```

#### Form Components
Mobile-optimized inputs with Indonesian validation messages.

```typescript
<Input
  label="Nomor Telepon"
  placeholder="08123456789"
  type="tel"
  required
  error="Format nomor telepon tidak valid"
  helpText="Contoh: 08123456789"
/>

<Textarea
  label="Deskripsi Masalah"
  placeholder="Jelaskan masalah yang Anda temukan..."
  maxLength={500}
  showCount
  required
/>
```

### Indonesian-Specific Components

#### TrustBadge
Displays user verification levels in Indonesian context.

```typescript
<TrustBadge level="BASIC" />       {/* 👤 Dasar */}
<TrustBadge level="VERIFIED" score={3.2} />  {/* ✅ Terverifikasi 3.2 */}
<TrustBadge level="PREMIUM" score={4.8} />   {/* ⭐ Premium 4.8 */}
```

#### CategoryBadge
Shows Indonesian civic issue categories.

```typescript
<CategoryBadge category="INFRASTRUCTURE" />  {/* 🏗️ Infrastruktur */}
<CategoryBadge category="CLEANLINESS" />     {/* 🧹 Kebersihan */}
<CategoryBadge category="LIGHTING" />        {/* 💡 Penerangan */}
<CategoryBadge category="WATER_DRAINAGE" />  {/* 💧 Air & Drainase */}
<CategoryBadge category="ENVIRONMENT" />     {/* 🌱 Lingkungan */}
<CategoryBadge category="SAFETY" />          {/* 🛡️ Keamanan */}
```

### Chat Interface

#### ChatBubble
Message bubbles with Indonesian timestamp formatting.

```typescript
const message = {
  id: '1',
  content: 'Halo! Ada masalah apa yang ingin Anda laporkan?',
  timestamp: new Date(),
  sender: 'bot' as const,
};

<ChatBubble message={message} showTimestamp />
```

#### ChatInput
Mobile-optimized chat input with attachments and location sharing.

```typescript
<ChatInput
  placeholder="Ketik pesan Anda..."
  onSend={handleSend}
  onAttachment={handleAttachment}
  onLocation={handleLocation}
  maxLength={500}
/>
```

### Layout Components

#### Card
Flexible card component with composable sections.

```typescript
<Card elevated interactive onClick={handleClick}>
  <Card.Header>
    <h3>Judul Laporan</h3>
  </Card.Header>
  <Card.Body>
    <p>Konten laporan...</p>
  </Card.Body>
  <Card.Footer>
    <Button>Lihat Detail</Button>
  </Card.Footer>
</Card>
```

## 🎨 Design Tokens

### Colors

#### Primary Colors (Indonesian Flag Inspired)
- **Primary Red**: `#ef4444` - Main brand color from Indonesian flag
- **Secondary Gray**: `#64748b` - Neutral supporting color

#### Trust Level Colors
- **Basic**: `#94a3b8` - Gray for basic users
- **Verified**: `#3b82f6` - Blue for verified users  
- **Premium**: `#10b981` - Green for premium users

#### Category Colors
- **Infrastructure**: `#ef4444` - Red
- **Cleanliness**: `#10b981` - Green
- **Lighting**: `#f59e0b` - Amber
- **Water & Drainage**: `#3b82f6` - Blue
- **Environment**: `#22c55e` - Light green
- **Safety**: `#dc2626` - Dark red

### Typography

- **Primary Font**: Inter (excellent for Indonesian text)
- **Display Font**: Poppins (for headings)
- **Fallbacks**: Segoe UI, system fonts

### Spacing

Mobile-optimized spacing scale:
- **Touch Targets**: Minimum 44px (Apple/Google guidelines)
- **Safe Areas**: iOS notch and bottom indicator support
- **Container Padding**: 16px (1rem) on mobile, 24px (1.5rem) on desktop

## 🛠️ Utilities

### Class Name Utility

```typescript
import { cn } from '@suara/ui';

// Merge classes with conflict resolution
const className = cn(
  'base-class',
  condition && 'conditional-class',
  'override-class'
);
```

### Helper Functions

```typescript
import { 
  getTrustLevelClasses, 
  getCategoryClasses,
  getButtonClasses 
} from '@suara/ui';

// Get trust level specific classes
const trustClasses = getTrustLevelClasses('VERIFIED');
// Returns: { badge: 'trust-badge--verified', text: 'text-trust-verified', ... }

// Get category specific classes  
const categoryClasses = getCategoryClasses('INFRASTRUCTURE');
// Returns: { badge: 'category-badge--infrastructure', icon: 'text-category-infrastructure', ... }
```

## 📱 Mobile Optimization

### Touch Targets
All interactive elements meet 44px minimum touch target size.

### Safe Areas
Components automatically handle iOS safe areas:

```css
.safe-area-top { padding-top: env(safe-area-inset-top); }
.safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }
```

### Responsive Design
Mobile-first breakpoints optimized for Indonesian device usage:

- `xs`: 375px (Small phones)
- `sm`: 640px (Large phones) 
- `md`: 768px (Tablets)
- `lg`: 1024px (Laptops)

## ♿ Accessibility

### Screen Reader Support
All components include proper ARIA labels in Indonesian:

```typescript
<Button loading>
  Kirim
  <span className="sr-only">Memuat...</span>
</Button>
```

### Keyboard Navigation
Full keyboard navigation support with visible focus indicators.

### High Contrast
Components automatically adapt to high contrast mode preferences.

## 🧪 Development

### Building
```bash
pnpm build
```

### Testing
```bash
pnpm test
pnpm test:watch
```

### Linting
```bash
pnpm lint
```

### Storybook (Future)
```bash
pnpm storybook
```

## 📄 License

MIT License - see LICENSE file for details.

---

**🇮🇩 Dibuat untuk Indonesia**: This design system is specifically crafted for Indonesian users, incorporating cultural preferences, language patterns, and mobile-first design principles tailored to the Indonesian civic engagement context.