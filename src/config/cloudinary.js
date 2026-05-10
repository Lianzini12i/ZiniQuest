export const CLOUDINARY_CLOUD_NAME = 'dqrzzcqvn'; 
export const CLOUDINARY_UPLOAD_PRESET = 'g00osckd';     

export async function uploadImageToCloudinary(imageUri) {
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'profile.jpg',
  });
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  const data = await response.json();
  if (data.secure_url) return data.secure_url;
  throw new Error('Cloudinary upload failed');
}