/**
 * Performance Optimized Components
 * Lazy loading and memoization utilities
 */

import { lazy, Suspense, memo } from 'react';

// Lazy load heavy components
export function lazyLoad<T extends object>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFn);
  
  return function LazyWrapper(props: T) {
    return (
      <Suspense fallback={fallback || <LoadingSkeleton />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Loading skeleton component
export function LoadingSkeleton({ className = 'h-4 w-full' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-muted rounded ${className}`}
      aria-hidden="true"
    />
  );
}

// Optimized card wrapper
export const OptimizedCard = memo(function OptimizedCard({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-lg border bg-card ${className}`} {...props}>
      {children}
    </div>
  );
});

// Optimized list item
export const OptimizedListItem = memo(function OptimizedListItem({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 hover:bg-muted/50 transition-colors ${onClick ? 'cursor-pointer' : ''} ${className || ''}`}
    >
      {children}
    </div>
  );
});

// Debounce hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
