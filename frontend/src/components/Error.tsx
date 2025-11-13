interface ErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function Error({ message = 'An error occurred', onRetry }: ErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="text-red-600 text-6xl mb-4">⚠️</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Error</h3>
      <p className="text-gray-600 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

