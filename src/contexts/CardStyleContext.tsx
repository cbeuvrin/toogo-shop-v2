import { createContext, useContext } from "react";

/**
 * Global, store-wide product-card typography (font family + size) plus the
 * editor click-to-edit hook. Provided once by the live store (Tienda) and once
 * by the visual editor preview (StorePreview), so every ProductCard / inline
 * card picks it up without prop drilling through each template.
 */
export interface CardStyleValue {
  /** fontFamily + fontSize applied to the card title (and family to the price). */
  style?: React.CSSProperties;
  /** True inside the visual editor — makes the card title clickable to edit. */
  isEditorMode?: boolean;
  /** Opens the card-text editor (only set in the editor preview). */
  onEditText?: () => void;
}

export const CardStyleContext = createContext<CardStyleValue | null>(null);

export const useCardStyle = (): CardStyleValue => useContext(CardStyleContext) || {};
