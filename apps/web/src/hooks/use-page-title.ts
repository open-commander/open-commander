import { useEffect } from "react";

const BASE_TITLE = "Open Commander";

/**
 * Sets the document title with the Open Commander prefix.
 * @param subtitle - Optional subtitle to append after the base title
 */
export function usePageTitle(subtitle?: string | null) {
  useEffect(() => {
    document.title = subtitle ? `${BASE_TITLE} | ${subtitle}` : BASE_TITLE;
  }, [subtitle]);
}
