# UI Implementation Documentation
## Suara.id User Interface Architecture

### Overview

The UI package provides a comprehensive design system optimized for Indonesian users, featuring mobile-first components, accessibility standards, and cultural sensitivity. The design emphasizes simplicity and familiarity, drawing inspiration from WhatsApp's interface patterns that Indonesian users know well.

### Architecture Decisions

#### 1. **Mobile-First Design Philosophy**
- **Primary Target**: Indonesian smartphone users (80%+ mobile traffic)
- **Screen Sizes**: Optimized for 360px-414px viewport widths
- **Touch Interface**: 44px minimum touch targets, thumb-friendly navigation
- **Performance**: Lightweight components for 3G/4G networks

#### 2. **WhatsApp-Inspired Chat Interface**
- **Familiarity**: Leverage existing user mental models
- **Accessibility**: Patterns already known by diverse user base
- **Cultural Fit**: Aligns with Indonesian communication preferences
- **Trust**: Interface similarity reduces onboarding friction

#### 3. **Design System Architecture**
```
@suara/ui/
├── components/          # Reusable UI components
│   ├── chat/           # Chat-specific components
│   ├── forms/          # Form inputs and validation
│   ├── navigation/     # Mobile navigation patterns
│   ├── feedback/       # Loading, success, error states
│   └── layout/         # Page layouts and containers
├── styles/             # Design tokens and themes
├── icons/              # Icon system
├── hooks/              # Reusable React hooks
└── utils/              # UI utilities and helpers
```

### Component Architecture

#### 1. **Chat Interface Components**

##### ChatContainer
```typescript
interface ChatContainerProps {
  conversation: ConversationMessage[];
  onSendMessage: (message: string, type: MessageType) => void;
  onSendMedia: (files: File[]) => void;
  onSendLocation: (coordinates: [number, number]) => void;
  isLoading?: boolean;
  language: LanguageCode;
  disabled?: boolean;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  conversation,
  onSendMessage,
  onSendMedia,
  onSendLocation,
  isLoading = false,
  language = 'id',
  disabled = false,
}) => {
  // Auto-scroll to bottom on new messages
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);
  
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {conversation.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            language={language}
          />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <ChatInput
        onSendMessage={onSendMessage}
        onSendMedia={onSendMedia}
        onSendLocation={onSendLocation}
        disabled={disabled || isLoading}
        language={language}
      />
    </div>
  );
};
```

##### MessageBubble
```typescript
interface MessageBubbleProps {
  message: ConversationMessage;
  language: LanguageCode;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  language 
}) => {
  const isUser = message.role === 'user';
  const isBot = message.role === 'bot';
  
  return (
    <div className={cn(
      "flex max-w-[85%]",
      isUser ? "ml-auto" : "mr-auto"
    )}>
      {/* Bot Avatar */}
      {isBot && (
        <div className="flex-shrink-0 w-8 h-8 mr-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src="/bot-avatar.png" alt="Suara.id Bot" />
            <AvatarFallback className="bg-blue-500 text-white text-xs">
              SB
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      
      {/* Message Content */}
      <div className={cn(
        "px-4 py-2 rounded-2xl relative",
        isUser ? [
          "bg-blue-500 text-white",
          "rounded-br-md", // WhatsApp-style corner
        ] : [
          "bg-white text-gray-900 shadow-sm border",
          "rounded-bl-md", // WhatsApp-style corner
        ]
      )}>
        {/* Message Content by Type */}
        {message.messageType === 'text' && (
          <MessageText content={message.content} />
        )}
        
        {message.messageType === 'image' && (
          <MessageImage 
            src={message.content} 
            alt="User uploaded image"
          />
        )}
        
        {message.messageType === 'location' && (
          <MessageLocation 
            coordinates={JSON.parse(message.content)} 
          />
        )}
        
        {message.messageType === 'system' && (
          <MessageSystem 
            content={message.content} 
            language={language}
          />
        )}
        
        {/* Timestamp */}
        <div className={cn(
          "text-xs mt-1 opacity-70",
          isUser ? "text-white" : "text-gray-500"
        )}>
          {formatMessageTime(message.timestamp, language)}
        </div>
        
        {/* Delivery Status for User Messages */}
        {isUser && (
          <MessageStatus status={message.metadata?.status || 'sent'} />
        )}
      </div>
    </div>
  );
};
```

##### ChatInput
```typescript
export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onSendMedia,
  onSendLocation,
  disabled,
  language,
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);
  
  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim(), 'text');
      setMessage('');
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div className="border-t bg-white p-4">
      <div className="flex items-end space-x-3">
        {/* Media Attachment Button */}
        <MediaAttachButton
          onSelectMedia={onSendMedia}
          onSelectLocation={onSendLocation}
          disabled={disabled}
        />
        
        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={getPlaceholderText(language)}
            disabled={disabled}
            className={cn(
              "w-full px-4 py-2 border rounded-2xl resize-none",
              "focus:outline-none focus:ring-2 focus:ring-blue-500",
              "max-h-[120px] overflow-y-auto",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            rows={1}
          />
          
          {/* Voice Message Button */}
          {message.length === 0 && (
            <VoiceMessageButton
              isRecording={isRecording}
              onStartRecording={() => setIsRecording(true)}
              onStopRecording={(audioBlob) => {
                setIsRecording(false);
                // Handle voice message
              }}
              disabled={disabled}
            />
          )}
        </div>
        
        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          size="sm"
          className="rounded-full w-10 h-10 p-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
```

#### 2. **Form Components**

##### LocationPicker
```typescript
interface LocationPickerProps {
  onLocationSelect: (location: LocationData) => void;
  initialLocation?: [number, number];
  error?: string;
  disabled?: boolean;
  language: LanguageCode;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  initialLocation,
  error,
  disabled,
  language,
}) => {
  const [location, setLocation] = useState<[number, number] | null>(
    initialLocation || null
  );
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Get user's current location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error(getText('geolocation_not_supported', language));
      return;
    }
    
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        
        setLocation(coords);
        
        // Reverse geocoding
        try {
          const addressResult = await reverseGeocode(coords);
          setAddress(addressResult.formattedAddress);
          
          onLocationSelect({
            coordinates: coords,
            address: addressResult.formattedAddress,
            accuracy: position.coords.accuracy,
            kelurahan: addressResult.kelurahan,
            kecamatan: addressResult.kecamatan,
            kabupaten: addressResult.kabupaten,
            provinsi: addressResult.provinsi,
          });
        } catch (err) {
          console.error('Reverse geocoding failed:', err);
        }
        
        setIsLoading(false);
      },
      (error) => {
        setIsLoading(false);
        toast.error(getText('location_access_denied', language));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };
  
  return (
    <div className="space-y-4">
      {/* Current Location Button */}
      <Button
        onClick={handleGetCurrentLocation}
        disabled={disabled || isLoading}
        className="w-full"
        variant="outline"
      >
        {isLoading ? (
          <Loader className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <MapPin className="w-4 h-4 mr-2" />
        )}
        {getText('use_current_location', language)}
      </Button>
      
      {/* Map Display */}
      {location && (
        <div className="relative h-48 bg-gray-100 rounded-lg overflow-hidden">
          <GoogleMap
            center={{ lat: location[0], lng: location[1] }}
            zoom={16}
            onClick={(e) => {
              if (e.latLng) {
                const newLocation: [number, number] = [
                  e.latLng.lat(),
                  e.latLng.lng(),
                ];
                setLocation(newLocation);
                // Update address...
              }
            }}
          >
            <Marker position={{ lat: location[0], lng: location[1] }} />
          </GoogleMap>
        </div>
      )}
      
      {/* Address Input */}
      <div>
        <Label htmlFor="address">
          {getText('address_description', language)}
        </Label>
        <Textarea
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={getText('address_placeholder', language)}
          disabled={disabled}
          className={error ? 'border-red-500' : ''}
        />
        {error && (
          <p className="text-sm text-red-500 mt-1">{error}</p>
        )}
      </div>
    </div>
  );
};
```

#### 3. **Accessibility Components**

##### AccessibleButton
```typescript
interface AccessibleButtonProps extends ButtonProps {
  screenReaderText?: string;
  keyboardShortcut?: string;
  loading?: boolean;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  screenReaderText,
  keyboardShortcut,
  loading,
  disabled,
  ...props
}) => {
  return (
    <Button
      disabled={disabled || loading}
      aria-label={screenReaderText}
      aria-describedby={keyboardShortcut ? `${props.id}-shortcut` : undefined}
      {...props}
    >
      {loading ? (
        <Loader className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        children
      )}
      
      {/* Screen reader only text */}
      {screenReaderText && (
        <span className="sr-only">{screenReaderText}</span>
      )}
      
      {/* Keyboard shortcut hint */}
      {keyboardShortcut && (
        <span id={`${props.id}-shortcut`} className="sr-only">
          Keyboard shortcut: {keyboardShortcut}
        </span>
      )}
    </Button>
  );
};
```

### Design Tokens and Theming

#### Indonesian Design Tokens

```typescript
export const designTokens = {
  // Colors optimized for Indonesian flag and cultural preferences
  colors: {
    primary: {
      50: '#eff6ff',
      500: '#3b82f6', // Indonesian blue preference
      600: '#2563eb',
      900: '#1e3a8a',
    },
    secondary: {
      500: '#dc2626', // Indonesian red from flag
      600: '#b91c1c',
    },
    success: {
      500: '#10b981', // Green for positive actions
    },
    warning: {
      500: '#f59e0b', // Amber for caution
    },
    error: {
      500: '#ef4444', // Red for errors
    },
    
    // Indonesian-specific grays (warmer tone)
    gray: {
      50: '#fafaf9',
      100: '#f5f5f4',
      200: '#e7e5e4',
      500: '#78716c',
      900: '#1c1917',
    },
  },
  
  // Typography optimized for Indonesian text
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      // Fallback fonts for Indonesian characters
      indonesian: ['Noto Sans', 'Inter', 'system-ui', 'sans-serif'],
    },
    
    fontSize: {
      // Larger base size for accessibility
      xs: ['12px', { lineHeight: '16px' }],
      sm: ['14px', { lineHeight: '20px' }],
      base: ['16px', { lineHeight: '24px' }], // 16px minimum for accessibility
      lg: ['18px', { lineHeight: '28px' }],
      xl: ['20px', { lineHeight: '28px' }],
      '2xl': ['24px', { lineHeight: '32px' }],
    },
  },
  
  // Spacing optimized for touch interfaces
  spacing: {
    // Touch target minimum 44px
    touchTarget: '44px',
    // Comfortable thumb reach
    thumbZone: '76px',
    // Common mobile margins
    mobile: {
      xs: '8px',
      sm: '12px',
      md: '16px',
      lg: '24px',
      xl: '32px',
    },
  },
  
  // Border radius for friendly appearance
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    bubble: '18px', // WhatsApp-style message bubbles
    full: '9999px',
  },
};
```

#### Theme Configuration

```typescript
export const lightTheme: Theme = {
  ...designTokens,
  
  semantic: {
    background: {
      primary: designTokens.colors.gray[50],
      secondary: '#ffffff',
      chat: '#f8fafc', // Light gray for chat background
      message: {
        user: designTokens.colors.primary[500],
        bot: '#ffffff',
        system: designTokens.colors.gray[100],
      },
    },
    
    text: {
      primary: designTokens.colors.gray[900],
      secondary: designTokens.colors.gray[600],
      muted: designTokens.colors.gray[500],
      inverse: '#ffffff',
    },
    
    border: {
      default: designTokens.colors.gray[200],
      focus: designTokens.colors.primary[500],
      error: designTokens.colors.error[500],
    },
    
    shadow: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    },
  },
};

// Dark theme for accessibility
export const darkTheme: Theme = {
  ...designTokens,
  
  semantic: {
    background: {
      primary: '#0f172a',
      secondary: '#1e293b',
      chat: '#1e293b',
      message: {
        user: designTokens.colors.primary[600],
        bot: '#334155',
        system: '#475569',
      },
    },
    
    text: {
      primary: '#f1f5f9',
      secondary: '#cbd5e1',
      muted: '#94a3b8',
      inverse: '#0f172a',
    },
    
    border: {
      default: '#475569',
      focus: designTokens.colors.primary[400],
      error: designTokens.colors.error[400],
    },
  },
};
```

### Responsive Design Patterns

#### Mobile-First Breakpoints

```typescript
export const breakpoints = {
  // Indonesian mobile device statistics
  sm: '360px', // Small phones (common in Indonesia)
  md: '414px', // Large phones (iPhone Plus, Android flagships)
  lg: '768px', // Tablets
  xl: '1024px', // Desktop (rare for primary usage)
  '2xl': '1280px', // Large desktop
};

// Responsive utilities
export const useResponsive = () => {
  const [isMobile] = useMediaQuery('(max-width: 768px)');
  const [isTablet] = useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
  const [isDesktop] = useMediaQuery('(min-width: 1024px)');
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    // Indonesian-specific: Most users are mobile-only
    isPrimaryDevice: isMobile,
  };
};
```

#### Layout Components

```typescript
// Mobile-optimized layout
export const MobileLayout: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Fixed header for easy thumb access */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="Suara.id" className="w-8 h-8" />
            <h1 className="font-semibold text-lg">Suara.id</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <LanguageSelector />
            <NotificationButton />
            <UserMenu />
          </div>
        </div>
      </header>
      
      {/* Main content with top padding for fixed header */}
      <main className="flex-1 pt-16 pb-safe">
        {children}
      </main>
      
      {/* Bottom navigation for mobile */}
      <BottomNavigation />
    </div>
  );
};

// Safe area handling for iOS devices
export const SafeAreaProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  useEffect(() => {
    // Add safe area CSS variables for iOS
    const updateSafeArea = () => {
      const safeAreaTop = 
        getComputedStyle(document.documentElement)
          .getPropertyValue('--sat') || '0px';
      const safeAreaBottom = 
        getComputedStyle(document.documentElement)
          .getPropertyValue('--sab') || '0px';
      
      document.documentElement.style.setProperty('--safe-area-top', safeAreaTop);
      document.documentElement.style.setProperty('--safe-area-bottom', safeAreaBottom);
    };
    
    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);
    
    return () => window.removeEventListener('resize', updateSafeArea);
  }, []);
  
  return <>{children}</>;
};
```

### Performance Optimization

#### Component Lazy Loading

```typescript
// Lazy load heavy components
export const MapView = lazy(() => import('./MapView'));
export const CameraCapture = lazy(() => import('./CameraCapture'));
export const VoiceRecorder = lazy(() => import('./VoiceRecorder'));

// Wrapper with Indonesian loading text
export const LazyComponent: React.FC<{
  component: React.ComponentType;
  fallback?: React.ReactNode;
}> = ({ 
  component: Component, 
  fallback 
}) => {
  return (
    <Suspense
      fallback={
        fallback || (
          <div className="flex items-center justify-center p-4">
            <Loader className="w-6 h-6 animate-spin mr-2" />
            <span className="text-sm text-gray-600">Memuat...</span>
          </div>
        )
      }
    >
      <Component />
    </Suspense>
  );
};
```

#### Image Optimization

```typescript
// Optimized image component for Indonesian connections
export const OptimizedImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}> = ({ src, alt, className, priority = false }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-gray-400" />
        </div>
      )}
      
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-200",
          isLoading ? "opacity-0" : "opacity-100",
          hasError && "hidden"
        )}
      />
      
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <ImageIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Gambar tidak dapat dimuat</p>
          </div>
        </div>
      )}
    </div>
  );
};
```

### Future Considerations

#### 1. **Enhanced Accessibility**
- **Screen Reader**: Complete ARIA implementation for visually impaired users
- **Voice Navigation**: Voice commands for hands-free operation
- **High Contrast**: Enhanced contrast modes for low vision users
- **Text Size**: Dynamic text scaling for elderly users

#### 2. **Progressive Web App Features**
- **Offline UI**: Offline-first design patterns
- **Background Sync**: Queue submissions when offline
- **App-like Experience**: Native app feel with web technology
- **Install Prompts**: Encourage PWA installation

#### 3. **Cultural Adaptations**
- **Regional Customization**: Province-specific UI adaptations
- **Local Holidays**: Context-aware seasonal themes
- **Cultural Colors**: Region-specific color preferences
- **Typography**: Support for additional Indonesian scripts

This UI architecture provides a solid foundation for building accessible, performant, and culturally appropriate interfaces for Indonesian users while maintaining flexibility for future enhancements.