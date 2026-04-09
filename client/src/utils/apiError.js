export const getErrorMessage = (error, fallbackMessage = "Something went wrong.") =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data ||
  error?.message ||
  fallbackMessage;
