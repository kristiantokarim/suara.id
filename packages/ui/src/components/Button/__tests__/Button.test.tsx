import React from 'react';
import { render, screen } from '../../../utils/test-utils';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Button>Kirim Laporan</Button>);
      
      const button = screen.getByRole('button', { name: 'Kirim Laporan' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('btn', 'btn--primary', 'btn--md');
    });

    it('renders with different variants', () => {
      const { rerender } = render(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn--secondary');

      rerender(<Button variant="danger">Danger</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn--danger');

      rerender(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn--ghost');
    });

    it('renders with different sizes', () => {
      const { rerender } = render(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn--sm');

      rerender(<Button size="lg">Large</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn--lg');
    });

    it('renders with full width', () => {
      render(<Button fullWidth>Full Width</Button>);
      expect(screen.getByRole('button')).toHaveClass('w-full');
    });

    it('renders with custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });

  describe('Icons and Loading States', () => {
    it('renders with left icon', () => {
      const leftIcon = <span data-testid="left-icon">📱</span>;
      render(<Button leftIcon={leftIcon}>With Left Icon</Button>);
      
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByText('With Left Icon')).toBeInTheDocument();
    });

    it('renders with right icon', () => {
      const rightIcon = <span data-testid="right-icon">→</span>;
      render(<Button rightIcon={rightIcon}>With Right Icon</Button>);
      
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
      expect(screen.getByText('With Right Icon')).toBeInTheDocument();
    });

    it('shows loading state correctly', () => {
      render(<Button loading>Loading Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByText('Memuat...')).toBeInTheDocument(); // Indonesian loading text
      expect(button.querySelector('.loading-spinner')).toBeInTheDocument();
    });

    it('hides icons when loading', () => {
      const leftIcon = <span data-testid="left-icon">📱</span>;
      const rightIcon = <span data-testid="right-icon">→</span>;
      
      render(
        <Button loading leftIcon={leftIcon} rightIcon={rightIcon}>
          Loading
        </Button>
      );
      
      expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
      expect(screen.getByText('Memuat...')).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('calls onClick handler when clicked', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      render(<Button onClick={handleClick}>Clickable</Button>);
      
      const button = screen.getByRole('button', { name: 'Clickable' });
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      render(<Button onClick={handleClick} disabled>Disabled</Button>);
      
      const button = screen.getByRole('button', { name: 'Disabled' });
      await user.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
      expect(button).toBeDisabled();
    });

    it('does not call onClick when loading', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      render(<Button onClick={handleClick} loading>Loading</Button>);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
      expect(button).toBeDisabled();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      render(<Button onClick={handleClick}>Keyboard</Button>);
      
      const button = screen.getByRole('button', { name: 'Keyboard' });
      button.focus();
      expect(button).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      await user.keyboard(' '); // Space key
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('has proper button role and accessibility attributes', () => {
      render(<Button>Accessible Button</Button>);
      
      const button = screen.getByRole('button', { name: 'Accessible Button' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'button');
    });

    it('shows loading state to screen readers', () => {
      render(<Button loading>Loading Button</Button>);
      
      // Screen reader text should be present
      expect(screen.getByText('Memuat...')).toBeInTheDocument();
      expect(screen.getByText('Memuat...')).toHaveClass('sr-only');
    });

    it('maintains focus visibility', () => {
      render(<Button>Focus Test</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      
      // Should have focus styles (tested via class presence)
      expect(button).toHaveClass('focus:ring-2');
    });

    it('meets minimum touch target size (44px)', () => {
      render(<Button>Touch Target</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('touch-target');
    });
  });

  describe('Indonesian Context', () => {
    it('uses Indonesian loading text', () => {
      render(<Button loading>Loading</Button>);
      expect(screen.getByText('Memuat...')).toBeInTheDocument();
    });

    it('works with Indonesian button text', () => {
      const indonesianTexts = [
        'Kirim Laporan',
        'Tambah Foto',
        'Bagikan Lokasi',
        'Verifikasi Akun',
        'Simpan Perubahan',
      ];

      indonesianTexts.forEach((text) => {
        const { unmount } = render(<Button>{text}</Button>);
        expect(screen.getByRole('button', { name: text })).toBeInTheDocument();
        unmount();
      });
    });

    it('handles long Indonesian text appropriately', () => {
      const longText = 'Kirim Laporan Masalah Infrastruktur Jalan';
      render(<Button>{longText}</Button>);
      
      const button = screen.getByRole('button', { name: longText });
      expect(button).toBeInTheDocument();
      expect(button.textContent).toBe(longText);
    });
  });

  describe('Form Integration', () => {
    it('works as submit button in forms', async () => {
      const user = userEvent.setup();
      const handleSubmit = jest.fn((e) => e.preventDefault());
      
      render(
        <form onSubmit={handleSubmit}>
          <Button type="submit">Submit Form</Button>
        </form>
      );
      
      const button = screen.getByRole('button', { name: 'Submit Form' });
      await user.click(button);
      
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    it('can be disabled in form context', () => {
      render(
        <form>
          <Button type="submit" disabled>Disabled Submit</Button>
        </form>
      );
      
      const button = screen.getByRole('button', { name: 'Disabled Submit' });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty children gracefully', () => {
      render(<Button>{''}</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button.textContent).toBe('');
    });

    it('handles multiple children', () => {
      render(
        <Button>
          <span>Multiple</span>
          <span>Children</span>
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(screen.getByText('Multiple')).toBeInTheDocument();
      expect(screen.getByText('Children')).toBeInTheDocument();
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Ref Test</Button>);
      
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current?.textContent).toBe('Ref Test');
    });
  });
});