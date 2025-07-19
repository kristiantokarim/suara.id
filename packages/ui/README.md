# UI Package

Shared UI components and design system for the Suara.id platform.

## Structure

```
packages/ui/
├── src/
│   ├── components/        # Reusable components
│   │   ├── Button/
│   │   ├── Chat/
│   │   ├── Form/
│   │   └── Map/
│   ├── styles/           # Shared styles
│   │   ├── globals.css
│   │   └── components.css
│   ├── icons/            # Icon components
│   └── index.ts          # Package exports
└── package.json
```

## Components

- **Chat Components**: Message bubbles, typing indicators, input areas
- **Form Components**: Input fields, buttons, validation displays
- **Map Components**: Interactive maps, location pickers
- **Navigation**: Mobile-first navigation components
- **Feedback**: Loading states, error messages, success indicators

## Design Principles

- **Mobile-First**: Optimized for touch interfaces
- **Accessibility**: WCAG AA compliant
- **Performance**: Lightweight and fast
- **Consistency**: Unified design language

## Usage

```typescript
import { Button, ChatBubble, MapView } from '@suara/ui';

<Button variant="primary" size="large">
  Submit Report
</Button>

<ChatBubble message={message} sender="bot" />

<MapView center={coordinates} onLocationSelect={handleLocation} />
```

## Styling

Built with Tailwind CSS for consistency across applications. Custom components follow the design system tokens defined in the config package.