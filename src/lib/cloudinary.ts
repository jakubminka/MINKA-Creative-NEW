// Cloudinary configuration - FREE TIER (25GB storage, 25GB monthly bandwidth)
// Zaregistruj se na https://cloudinary.com/ a získej cloud name a upload preset
export const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo';
export const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'portfolio-preset';

export async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Upload failed: ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.secure_url;
}