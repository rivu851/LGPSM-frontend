import { useRef } from "react";

/**
 * Props for a modal's backdrop that close it only on a real click on the backdrop. A click that starts inside the dialog
 * (for example dragging to select the text of an input) and is released over the backdrop is not a click on the backdrop,
 * and must not close the dialog and lose what was typed.
 */
export function useOverlayClose(onClose: () => void, disabled = false) {
  const pressedOnOverlay = useRef(false);
  return {
    onMouseDown: (e: React.MouseEvent) => { pressedOnOverlay.current = e.target === e.currentTarget; },
    onClick: (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && pressedOnOverlay.current && !disabled) onClose();
      pressedOnOverlay.current = false;
    },
  };
}
