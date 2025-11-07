import { useState, useCallback } from 'react';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

interface FormValidationConfig {
  [key: string]: ValidationRule;
}

interface FormErrors {
  [key: string]: string | null;
}

export const useFormValidation = (config: FormValidationConfig) => {
  const [errors, setErrors] = useState<FormErrors>({});

  const validateField = useCallback((name: string, value: string): string | null => {
    const rule = config[name];
    if (!rule) return null;

    if (rule.required && (!value || value.trim() === '')) {
      return `${name} is required`;
    }

    if (value && rule.minLength && value.length < rule.minLength) {
      return `${name} must be at least ${rule.minLength} characters`;
    }

    if (value && rule.maxLength && value.length > rule.maxLength) {
      return `${name} must be no more than ${rule.maxLength} characters`;
    }

    if (value && rule.pattern && !rule.pattern.test(value)) {
      return `${name} format is invalid`;
    }

    if (value && rule.custom) {
      return rule.custom(value);
    }

    return null;
  }, [config]);

  const validateForm = useCallback((data: Record<string, string>): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    Object.keys(config).forEach(key => {
      const error = validateField(key, data[key] || '');
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [config, validateField]);

  const validateSingleField = useCallback((name: string, value: string) => {
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
    return error === null;
  }, [validateField]);

  const clearError = useCallback((name: string) => {
    setErrors(prev => ({ ...prev, [name]: null }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    errors,
    validateForm,
    validateSingleField,
    clearError,
    clearAllErrors,
  };
};
