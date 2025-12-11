export class AppError extends Error {
  public code?: string;
  public status?: number;
  public details?: any;

  constructor(message: string, code?: string, status?: number, details?: any) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const handleApiError = (error: any): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR', 500);
  }

  return new AppError('An unexpected error occurred', 'UNKNOWN_ERROR', 500);
};

export const logError = (error: AppError, context?: string) => {
  console.error(`[${context || 'App'}] Error:`, {
    message: error.message,
    code: error.code,
    status: error.status,
    details: error.details,
    stack: error.stack,
  });
};

export const formatErrorMessage = (error: AppError): string => {
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Network connection failed. Please check your internet connection.';
    case 'VALIDATION_ERROR':
      return 'Please check your input and try again.';
    case 'AUTHENTICATION_ERROR':
      return 'Authentication failed. Please sign in again.';
    case 'PERMISSION_ERROR':
      return 'You do not have permission to perform this action.';
    case 'NOT_FOUND':
      return 'The requested resource was not found.';
    case 'SERVER_ERROR':
      return 'Server error occurred. Please try again later.';
    default:
      return error.message || 'An unexpected error occurred.';
  }
};
