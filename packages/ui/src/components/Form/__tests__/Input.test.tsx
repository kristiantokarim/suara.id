import React from 'react';
import { render, screen } from '../../../utils/test-utils';
import userEvent from '@testing-library/user-event';
import { Input } from '../Input';
import { mockFormData, indonesianPhoneInputs, typeIndonesianText } from '../../../utils/test-utils';

describe('Input Component', () => {
  describe('Rendering', () => {
    it('renders with basic props', () => {
      render(<Input placeholder="Enter text" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'Enter text');
    });

    it('renders with label', () => {
      render(<Input label="Nomor Telepon" />);
      
      expect(screen.getByLabelText('Nomor Telepon')).toBeInTheDocument();
      expect(screen.getByText('Nomor Telepon')).toBeInTheDocument();
    });

    it('renders with required indicator', () => {
      render(<Input label="Required Field" required />);
      
      expect(screen.getByText('*')).toBeInTheDocument();
      expect(screen.getByText('*')).toHaveAttribute('aria-label', 'wajib diisi');
    });

    it('renders with help text', () => {
      render(<Input helpText="Contoh: 08123456789" />);
      
      expect(screen.getByText('Contoh: 08123456789')).toBeInTheDocument();
    });

    it('renders with error message', () => {
      render(<Input error="Format nomor telepon tidak valid" />);
      
      const errorMessage = screen.getByText('Format nomor telepon tidak valid');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });

    it('hides help text when error is shown', () => {
      render(
        <Input 
          helpText="This should be hidden" 
          error="Error message" 
        />
      );
      
      expect(screen.queryByText('This should be hidden')).not.toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('renders with left icon', () => {
      const leftIcon = <span data-testid="phone-icon">📱</span>;
      render(<Input leftIcon={leftIcon} />);
      
      expect(screen.getByTestId('phone-icon')).toBeInTheDocument();
    });

    it('renders with right icon', () => {
      const rightIcon = <span data-testid="check-icon">✓</span>;
      render(<Input rightIcon={rightIcon} />);
      
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('adjusts padding for icons', () => {
      const leftIcon = <span data-testid="left-icon">L</span>;
      const rightIcon = <span data-testid="right-icon">R</span>;
      
      const { rerender } = render(<Input leftIcon={leftIcon} />);
      let input = screen.getByRole('textbox');
      expect(input).toHaveClass('pl-10');
      
      rerender(<Input rightIcon={rightIcon} />);
      input = screen.getByRole('textbox');
      expect(input).toHaveClass('pr-10');
      
      rerender(<Input leftIcon={leftIcon} rightIcon={rightIcon} />);
      input = screen.getByRole('textbox');
      expect(input).toHaveClass('pl-10', 'pr-10');
    });
  });

  describe('User Interaction', () => {
    it('accepts text input', async () => {
      const user = userEvent.setup();
      render(<Input placeholder="Type here" />);
      
      const input = screen.getByRole('textbox');
      await typeIndonesianText(user, input, 'Test input');
      
      expect(input).toHaveValue('Test input');
    });

    it('calls onChange handler', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      
      render(<Input onChange={handleChange} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'abc');
      
      expect(handleChange).toHaveBeenCalledTimes(3); // One for each character
    });

    it('handles controlled input', async () => {
      const user = userEvent.setup();
      const ControlledInput = () => {
        const [value, setValue] = React.useState('');
        return (
          <Input 
            value={value} 
            onChange={(e) => setValue(e.target.value)}
            data-testid="controlled-input"
          />
        );
      };
      
      render(<ControlledInput />);
      
      const input = screen.getByTestId('controlled-input');
      await user.type(input, 'controlled');
      
      expect(input).toHaveValue('controlled');
    });

    it('handles disabled state', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      
      render(<Input disabled onChange={handleChange} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      
      await user.type(input, 'should not work');
      expect(handleChange).not.toHaveBeenCalled();
      expect(input).toHaveValue('');
    });
  });

  describe('Indonesian Phone Number Input', () => {
    it('handles various Indonesian phone formats', async () => {
      const user = userEvent.setup();
      
      for (const phoneTest of indonesianPhoneInputs) {
        const { unmount } = render(
          <Input 
            type="tel" 
            label="Nomor Telepon"
            placeholder="08123456789"
          />
        );
        
        const input = screen.getByLabelText('Nomor Telepon');
        await typeIndonesianText(user, input, phoneTest.input);
        
        expect(input).toHaveValue(phoneTest.input);
        unmount();
      }
    });

    it('shows phone validation error in Indonesian', () => {
      render(
        <Input 
          type="tel" 
          label="Nomor Telepon"
          error="Format nomor telepon tidak valid"
          value="123"
        />
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('Format nomor telepon tidak valid')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <Input 
          label="Test Input"
          helpText="Help text"
          required
        />
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby');
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('sets aria-invalid when error is present', () => {
      render(<Input error="Error message" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('connects label with input using htmlFor', () => {
      render(<Input label="Connected Label" />);
      
      const label = screen.getByText('Connected Label');
      const input = screen.getByRole('textbox');
      
      expect(label).toHaveAttribute('for');
      expect(input).toHaveAttribute('id');
      expect(label.getAttribute('for')).toBe(input.getAttribute('id'));
    });

    it('connects error message with input', () => {
      render(<Input error="Error description" />);
      
      const input = screen.getByRole('textbox');
      const errorMessage = screen.getByText('Error description');
      
      expect(input).toHaveAttribute('aria-describedby');
      expect(errorMessage).toHaveAttribute('id');
      expect(input.getAttribute('aria-describedby')).toContain(errorMessage.getAttribute('id'));
    });

    it('connects help text with input', () => {
      render(<Input helpText="Help description" />);
      
      const input = screen.getByRole('textbox');
      const helpText = screen.getByText('Help description');
      
      expect(input).toHaveAttribute('aria-describedby');
      expect(helpText).toHaveAttribute('id');
      expect(input.getAttribute('aria-describedby')).toContain(helpText.getAttribute('id'));
    });
  });

  describe('Indonesian Context', () => {
    it('works with Indonesian labels and placeholders', () => {
      const indonesianLabels = [
        'Nomor Telepon',
        'Alamat Email',
        'Nama Lengkap',
        'Alamat Rumah',
      ];
      
      indonesianLabels.forEach((label) => {
        const { unmount } = render(<Input label={label} />);
        expect(screen.getByLabelText(label)).toBeInTheDocument();
        unmount();
      });
    });

    it('displays Indonesian error messages', () => {
      const indonesianErrors = [
        'Format nomor telepon tidak valid',
        'Email harus diisi',
        'Nama tidak boleh kosong',
        'Alamat terlalu pendek',
      ];
      
      indonesianErrors.forEach((error) => {
        const { unmount } = render(<Input error={error} />);
        expect(screen.getByText(error)).toBeInTheDocument();
        unmount();
      });
    });

    it('shows Indonesian help text', () => {
      render(
        <Input 
          label="Nomor Telepon"
          helpText="Contoh: 08123456789 atau +628123456789"
        />
      );
      
      expect(screen.getByText('Contoh: 08123456789 atau +628123456789')).toBeInTheDocument();
    });

    it('handles Indonesian text input correctly', async () => {
      const user = userEvent.setup();
      render(<Input placeholder="Ketik pesan Anda..." />);
      
      const input = screen.getByRole('textbox');
      const indonesianText = 'Jalan rusak parah di depan rumah saya';
      
      await typeIndonesianText(user, input, indonesianText);
      expect(input).toHaveValue(indonesianText);
    });
  });

  describe('Input Types', () => {
    it('handles different input types', () => {
      const inputTypes = [
        { type: 'tel', label: 'Phone' },
        { type: 'email', label: 'Email' },
        { type: 'password', label: 'Password' },
        { type: 'text', label: 'Text' },
      ];
      
      inputTypes.forEach(({ type, label }) => {
        const { unmount } = render(<Input type={type} label={label} />);
        const input = screen.getByRole(type === 'password' ? 'textbox' : 'textbox');
        expect(input).toHaveAttribute('type', type);
        unmount();
      });
    });

    it('handles email validation patterns', () => {
      render(<Input type="email" value={mockFormData.invalidEmail} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveValue(mockFormData.invalidEmail);
    });
  });

  describe('Edge Cases', () => {
    it('handles very long text', async () => {
      const user = userEvent.setup();
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      const longText = 'Very long text that exceeds normal input length '.repeat(10);
      
      await typeIndonesianText(user, input, longText);
      expect(input).toHaveValue(longText);
    });

    it('handles special characters in Indonesian text', async () => {
      const user = userEvent.setup();
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      const specialText = 'Àáâãäåæçèéêë ñóôõö ùúûü 123!@#$%';
      
      await typeIndonesianText(user, input, specialText);
      expect(input).toHaveValue(specialText);
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);
      
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it('handles custom className', () => {
      render(<Input className="custom-input-class" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-input-class');
    });

    it('handles container custom className', () => {
      render(<Input containerClassName="custom-container-class" />);
      
      // Check if the container div has the custom class
      const container = screen.getByRole('textbox').closest('div');
      expect(container).toHaveClass('custom-container-class');
    });
  });
});