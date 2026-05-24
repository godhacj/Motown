// Background image rotation removed. Images are preserved in their folders.
// Backgrounds are now handled by CSS theme variables.
// This file is kept to avoid breaking any lingering imports.
export function useImageRotator() {
  return { currentImage: null, images: [], imageIndex: 0 }
}
export default useImageRotator
