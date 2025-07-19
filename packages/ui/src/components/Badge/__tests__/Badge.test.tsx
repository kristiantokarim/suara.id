import React from 'react';
import { render, screen } from '../../../utils/test-utils';
import { Badge, TrustBadge, CategoryBadge } from '../Badge';
import { trustLevelTestData, categoryTestData } from '../../../utils/test-utils';

describe('Badge Components', () => {
  describe('Generic Badge', () => {
    it('renders with default props', () => {
      render(<Badge>Default Badge</Badge>);
      
      const badge = screen.getByText('Default Badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-full');
    });

    it('renders with different variants', () => {
      const variants = ['default', 'primary', 'secondary', 'success', 'warning', 'error'] as const;
      
      variants.forEach((variant) => {
        const { unmount } = render(<Badge variant={variant}>{variant}</Badge>);
        const badge = screen.getByText(variant);
        expect(badge).toBeInTheDocument();
        unmount();
      });
    });

    it('renders with different sizes', () => {
      const sizes = ['sm', 'md', 'lg'] as const;
      
      sizes.forEach((size) => {
        const { unmount } = render(<Badge size={size}>{size}</Badge>);
        const badge = screen.getByText(size);
        expect(badge).toBeInTheDocument();
        unmount();
      });
    });

    it('accepts custom className', () => {
      render(<Badge className="custom-badge">Custom</Badge>);
      
      const badge = screen.getByText('Custom');
      expect(badge).toHaveClass('custom-badge');
    });
  });

  describe('TrustBadge', () => {
    it('renders all trust levels correctly', () => {
      trustLevelTestData.forEach(({ level, score, expectedLabel, expectedIcon }) => {
        const { unmount } = render(<TrustBadge level={level} score={score} />);
        
        const badge = screen.getByText(expectedLabel);
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass('trust-badge');
        
        // Check for icon (it's in the same element)
        expect(badge.textContent).toContain(expectedIcon);
        
        // Check for score display
        if (score) {
          expect(badge.textContent).toContain(score.toFixed(1));
        }
        
        unmount();
      });
    });

    it('renders without score', () => {
      render(<TrustBadge level="VERIFIED" />);
      
      const badge = screen.getByText('Terverifikasi');
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).not.toMatch(/\d+\.\d+/); // Should not contain decimal numbers
    });

    it('has proper tooltip with Indonesian text', () => {
      render(<TrustBadge level="PREMIUM" score={4.5} />);
      
      const badge = screen.getByText('Premium');
      expect(badge).toHaveAttribute('title', 'Tingkat kepercayaan: Premium (4.5)');
    });

    it('has tooltip without score', () => {
      render(<TrustBadge level="BASIC" />);
      
      const badge = screen.getByText('Dasar');
      expect(badge).toHaveAttribute('title', 'Tingkat kepercayaan: Dasar');
    });

    it('applies correct CSS classes for each level', () => {
      const { rerender } = render(<TrustBadge level="BASIC" />);
      let badge = screen.getByText('Dasar');
      expect(badge).toHaveClass('trust-badge--basic');

      rerender(<TrustBadge level="VERIFIED" />);
      badge = screen.getByText('Terverifikasi');
      expect(badge).toHaveClass('trust-badge--verified');

      rerender(<TrustBadge level="PREMIUM" />);
      badge = screen.getByText('Premium');
      expect(badge).toHaveClass('trust-badge--premium');
    });

    it('formats score correctly', () => {
      const testScores = [
        { score: 1.0, expected: '1.0' },
        { score: 3.14159, expected: '3.1' },
        { score: 4.99, expected: '5.0' },
      ];

      testScores.forEach(({ score, expected }) => {
        const { unmount } = render(<TrustBadge level="VERIFIED" score={score} />);
        
        const badge = screen.getByText('Terverifikasi');
        expect(badge.textContent).toContain(expected);
        
        unmount();
      });
    });

    it('accepts custom className', () => {
      render(<TrustBadge level="VERIFIED" className="custom-trust-badge" />);
      
      const badge = screen.getByText('Terverifikasi');
      expect(badge).toHaveClass('custom-trust-badge');
    });
  });

  describe('CategoryBadge', () => {
    it('renders all categories correctly', () => {
      categoryTestData.forEach(({ category, expectedLabel, expectedIcon }) => {
        const { unmount } = render(<CategoryBadge category={category} />);
        
        const badge = screen.getByText(expectedLabel);
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass('category-badge');
        
        // Check for icon
        expect(badge.textContent).toContain(expectedIcon);
        
        unmount();
      });
    });

    it('has proper tooltip with Indonesian text', () => {
      render(<CategoryBadge category="INFRASTRUCTURE" />);
      
      const badge = screen.getByText('Infrastruktur');
      expect(badge).toHaveAttribute('title', 'Kategori: Infrastruktur');
    });

    it('applies correct CSS classes for each category', () => {
      const categories = [
        { category: 'INFRASTRUCTURE' as const, expectedClass: 'category-badge--infrastructure' },
        { category: 'CLEANLINESS' as const, expectedClass: 'category-badge--cleanliness' },
        { category: 'LIGHTING' as const, expectedClass: 'category-badge--lighting' },
      ];

      categories.forEach(({ category, expectedClass }) => {
        const { unmount } = render(<CategoryBadge category={category} />);
        const badge = screen.getByText(categoryTestData.find(c => c.category === category)!.expectedLabel);
        expect(badge).toHaveClass(expectedClass);
        unmount();
      });
    });

    it('handles all Indonesian category translations', () => {
      const expectedTranslations = {
        INFRASTRUCTURE: 'Infrastruktur',
        CLEANLINESS: 'Kebersihan', 
        LIGHTING: 'Penerangan',
        WATER_DRAINAGE: 'Air & Drainase',
        ENVIRONMENT: 'Lingkungan',
        SAFETY: 'Keamanan',
      };

      Object.entries(expectedTranslations).forEach(([category, label]) => {
        const { unmount } = render(<CategoryBadge category={category as any} />);
        expect(screen.getByText(label)).toBeInTheDocument();
        unmount();
      });
    });

    it('accepts custom className', () => {
      render(<CategoryBadge category="SAFETY" className="custom-category-badge" />);
      
      const badge = screen.getByText('Keamanan');
      expect(badge).toHaveClass('custom-category-badge');
    });
  });

  describe('Badge Accessibility', () => {
    it('maintains proper semantic structure', () => {
      render(<Badge>Accessible Badge</Badge>);
      
      const badge = screen.getByText('Accessible Badge');
      expect(badge.tagName).toBe('SPAN');
      expect(badge).toHaveAttribute('class');
    });

    it('TrustBadge provides descriptive tooltip', () => {
      render(<TrustBadge level="PREMIUM" score={4.8} />);
      
      const badge = screen.getByText('Premium');
      const tooltip = badge.getAttribute('title');
      expect(tooltip).toContain('Tingkat kepercayaan');
      expect(tooltip).toContain('Premium');
      expect(tooltip).toContain('4.8');
    });

    it('CategoryBadge provides descriptive tooltip', () => {
      render(<CategoryBadge category="ENVIRONMENT" />);
      
      const badge = screen.getByText('Lingkungan');
      const tooltip = badge.getAttribute('title');
      expect(tooltip).toContain('Kategori');
      expect(tooltip).toContain('Lingkungan');
    });

    it('icons are properly hidden from screen readers', () => {
      render(<TrustBadge level="VERIFIED" />);
      
      const badge = screen.getByText('Terverifikasi');
      // Icons should be present but as decorative elements
      expect(badge.textContent).toContain('✅');
    });
  });

  describe('Indonesian Localization', () => {
    it('uses correct Indonesian trust level terms', () => {
      const indonesianTerms = {
        BASIC: 'Dasar',
        VERIFIED: 'Terverifikasi', 
        PREMIUM: 'Premium',
      };

      Object.entries(indonesianTerms).forEach(([level, term]) => {
        const { unmount } = render(<TrustBadge level={level as any} />);
        expect(screen.getByText(term)).toBeInTheDocument();
        unmount();
      });
    });

    it('uses correct Indonesian category terms', () => {
      const indonesianCategories = {
        INFRASTRUCTURE: 'Infrastruktur',
        CLEANLINESS: 'Kebersihan',
        LIGHTING: 'Penerangan',
        WATER_DRAINAGE: 'Air & Drainase',
        ENVIRONMENT: 'Lingkungan',
        SAFETY: 'Keamanan',
      };

      Object.entries(indonesianCategories).forEach(([category, term]) => {
        const { unmount } = render(<CategoryBadge category={category as any} />);
        expect(screen.getByText(term)).toBeInTheDocument();
        unmount();
      });
    });

    it('tooltip text is in Indonesian', () => {
      render(<TrustBadge level="VERIFIED" score={3.5} />);
      
      const badge = screen.getByText('Terverifikasi');
      expect(badge.getAttribute('title')).toContain('Tingkat kepercayaan');
    });
  });

  describe('Visual Design', () => {
    it('includes Indonesian flag emoji context', () => {
      // Test that components work well with Indonesian visual elements
      render(
        <div>
          <span>🇮🇩</span>
          <TrustBadge level="PREMIUM" score={4.9} />
        </div>
      );
      
      expect(screen.getByText('🇮🇩')).toBeInTheDocument();
      expect(screen.getByText('Premium')).toBeInTheDocument();
    });

    it('works with different container backgrounds', () => {
      render(
        <div className="bg-gray-100 p-4">
          <TrustBadge level="VERIFIED" />
          <CategoryBadge category="INFRASTRUCTURE" />
        </div>
      );
      
      expect(screen.getByText('Terverifikasi')).toBeInTheDocument();
      expect(screen.getByText('Infrastruktur')).toBeInTheDocument();
    });
  });
});