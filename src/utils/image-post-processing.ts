import { fileToBase64 } from "./encoding";

/**
 * Processes an image file to create a "scanned document" effect.
 * The process involves converting the image to grayscale and increasing its contrast.
 * @param imageFile The original image file to process.
 * @param type The desired output MIME type, e.g., 'image/png' or 'image/jpeg'.
 * @param quality For JPEG output, the quality level (0-1).
 * @returns A promise that resolves with the processed File object and its Object URL.
 */
export const binarizeImageFile = async (
  imageFile: File,
  type: "image/png" | "image/jpeg" = "image/png",
  quality?: number,
): Promise<{ file: File; url: string }> => {
  return new Promise((resolve, reject) => {
    // 1. Setup: Create canvas and load the image
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", {
      // Opt-in to a non-alpha canvas for potential performance improvement
      // as we don't need transparency for a scanned document effect.
      alpha: false,
    });

    if (!ctx) {
      return reject(new Error("Failed to get Canvas context"));
    }

    const img = new Image();
    const originalUrl = URL.createObjectURL(imageFile);

    img.onload = () => {
      // 2. Initial Draw: Set canvas dimensions and draw the original image
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Immediately revoke the object URL to free up memory
      URL.revokeObjectURL(originalUrl);

      // 3. Pixel Manipulation: Get the image data to apply filters
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data; // This is a Uint8ClampedArray: [R, G, B, A, R, G, B, A, ...]

        // Loop through every pixel (4 bytes at a time: R, G, B, A)
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Step A: Convert to grayscale using the luminosity method (standard formula)
          // This weights colors according to human perception.
          const grayscale = 0.299 * r + 0.587 * g + 0.114 * b;

          // Step B: Increase contrast.
          // We'll use a simple threshold. If the gray value is above a certain point,
          // make it pure white (255). Otherwise, make it pure black (0).
          // You can adjust the threshold to get the best result for your documents.
          // A value around 128 is a neutral starting point. A higher value makes more pixels black.
          const threshold = 150; // Tweak this value (100-180) for best results
          const contrastValue = grayscale > threshold ? 255 : 0;

          // Set the new RGB values for the pixel. All are set to the same
          // value to maintain the grayscale (or in this case, black and white) effect.
          data[i] = contrastValue; // Red channel
          data[i + 1] = contrastValue; // Green channel
          data[i + 2] = contrastValue; // Blue channel
          // Alpha channel (data[i + 3]) is left untouched.
        }

        // 4. Put the modified pixel data back onto the canvas
        ctx.putImageData(imageData, 0, 0);
      } catch (error) {
        // This can happen if the image is from a different origin (CORS issue)
        // and the canvas becomes "tainted".
        console.error("Could not process pixel data:", error);
        return reject(
          new Error(
            "Failed to process image pixels. Check for CORS issues if loading cross-origin images.",
          ),
        );
      }

      // 5. Export: Convert the canvas content back to a Blob, then a File
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error("Failed to create Blob from canvas"));
          }

          // Create a new filename for the processed file
          const fileName = `scanned_${imageFile.name.split(".")[0] || "document"}.png`;
          const newFile = new File([blob], fileName, { type });
          fileToBase64(newFile).then((newUrl) => {
            // Resolve the promise with the new file and its URL
            resolve({ file: newFile, url: newUrl });
          });
        },
        type,
        quality,
      );
    };

    img.onerror = (err) => {
      // Clean up the URL if image loading fails
      URL.revokeObjectURL(originalUrl);
      reject(err);
    };

    // Start the loading process
    img.src = originalUrl;
  });
};
