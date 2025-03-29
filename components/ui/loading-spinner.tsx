interface LoadingSpinnerProps {
  txt?: string;
}

export function LoadingSpinner({ txt = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      <p className="mt-4 text-gray-400">{txt}</p>
    </div>
  );
}
