export function uint8ToBase64(uint8Array: Uint8Array) {
  let binary = "";
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return window.btoa(binary);
}

export async function fileToBase64(file: File) {
  const base64 = uint8ToBase64(new Uint8Array(await file.arrayBuffer()));
  const base64Url = `data:${file.type};base64, ${base64}`;

  return base64Url;
}
