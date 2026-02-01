# Bug Investigation: Magnifier (Lupe) not working

## Bug Summary
The magnifier functionality in the Flipbook viewer is either not working or providing an incorrect zoom experience. Based on the code analysis, the magnifier shows a shrunken image instead of a zoomed-in one and does not correctly handle double-page spreads.

## Root Cause Analysis
1.  **Incorrect Zoom Calculation**: In `FlipbookViewer.tsx`, the `backgroundSize` of the magnifier lens is set to `${100 / magnifierZoom}%`. For a `magnifierZoom` of 2, this results in `50%`, making the image half the size of the lens (minification instead of magnification).
2.  **Spread Mode Support**: The current implementation only uses `imageUrls[currentPage]`. In landscape (double-page) mode, `currentPage` usually points to the left page of the spread. If the user hovers over the right page, the magnifier still shows the left page.
3.  **Coordinate Mapping**: `magnifierPosition.x` and `y` are calculated relative to the entire flipbook container (0-100%). When used as `backgroundPosition` for a single-page image in a double-page spread, the coordinates are incorrectly mapped.
4.  **Z-Index and Events**: While `pointer-events-none` is used on the lens, the event listener is on a parent div, which is correct, but we must ensure the `StPageFlip` library doesn't consume the events when the magnifier is active. The code already sets `useMouseEvents: !magnifierActive`, which is a good start.

## Affected Components
- `apps/frontend/app/app/components/FlipbookViewer.tsx`

## Proposed Solution
1.  **Refactor `handleMagnifierMove`**:
    *   Query the current orientation and page index from the `StPageFlip` instance.
    *   Determine if the mouse is over the left or right page in landscape mode.
    *   Select the correct `imageUrls[index]`.
    *   Calculate local X and Y percentages (0-100%) within the active page.
2.  **Fix Lens Styling**:
    *   Calculate `backgroundSize` based on the actual displayed size of the page and the desired zoom factor.
    *   Formula: `backgroundSize = (displayedPageWidth * magnifierZoom / lensWidth) * 100%`.
3.  **Refine Activation**: Ensure the magnifier lens only shows when it has valid coordinates and is over the content.

## Implementation Notes
The magnifier has been refactored to support spread mode and correct zoom calculation:
1.  **State Update**: Added `activeImageUrl` and `pageWidthInContainer` to `magnifierPosition` state to track which page is hovered and its displayed width.
2.  **Logic Improvement**: `handleMagnifierMove` now determines orientation and identifies the specific page being hovered in landscape mode. It correctly maps mouse coordinates to local X/Y percentages within the active page.
3.  **Lens Refinement**:
    *   `backgroundImage` uses the `activeImageUrl`.
    *   `backgroundSize` is calculated as `(pageWidthInContainer * magnifierZoom / lensWidth) * 100%`, ensuring consistent magnification regardless of display size or orientation.
4.  **Edge Cases**: Handled single-page views (cover and back cover) in landscape mode by centering the page bounds.

## Test Results
- **Portrait Mode**: Magnifier correctly covers the whole page width.
- **Landscape Mode (Cover)**: Magnifier only activates over the centered cover page.
- **Landscape Mode (Spread)**: Magnifier correctly switches between left and right page images and coordinates when crossing the center line.
- **Zoom Accuracy**: Image in lens appears at the expected magnification level.
