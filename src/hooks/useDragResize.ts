import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Custom hook for handling drag-to-resize functionality.
 * Manages mouse events and width constraints for resizable panels.
 *
 * @param initialWidth - Initial width of the panel
 * @param minWidth - Minimum allowed width
 * @param maxWidth - Maximum allowed width
 * @param getOffset - Function to get the offset for relative positioning
 * @returns Object with current width and drag start function
 */
export function useDragResize(
  initialWidth: number,
  minWidth: number,
  maxWidth: number,
  getOffset: () => number = () => 0
) {
  const [width, setWidth] = useState(initialWidth);
  const isDraggingRef = useRef(false);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const newWidth = e.clientX - getOffset();
        if (newWidth >= minWidth && newWidth <= maxWidth) {
          setWidth(newWidth);
        }
      }
    },
    [minWidth, maxWidth, getOffset]
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    document.body.style.cursor = 'default';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const startDrag = useCallback(() => {
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
  }, []);

  return { width, startDrag };
}