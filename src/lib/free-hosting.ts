// Alternative free image hosting options

// Option 1: Imgur API (completely free, no registration needed)
export async function uploadToImgur(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch('https://api.imgur.com/3/image', {
    method: 'POST',
    headers: {
      'Authorization': 'Client-ID YOUR_IMGUR_CLIENT_ID' // Get from https://api.imgur.com/oauth2/addclient
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error('Imgur upload failed');
  }

  const data = await response.json();
  return data.data.link;
}

// Option 2: GitHub as image host (free with GitHub account)
export async function uploadToGitHub(file: File, token: string, repo: string): Promise<string> {
  const base64 = await fileToBase64(file);
  const filename = `portfolio-${Date.now()}-${file.name}`;

  const response = await fetch(`https://api.github.com/repos/${repo}/contents/portfolio-images/${filename}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Upload portfolio image: ${filename}`,
      content: base64.split(',')[1], // Remove data:image/jpeg;base64, prefix
    }),
  });

  if (!response.ok) {
    throw new Error('GitHub upload failed');
  }

  const data = await response.json();
  return data.content.download_url;
}

// Helper function to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

// Option 3: PostImages.org (free, anonymous upload)
export async function uploadToPostImages(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', 'free'); // Free tier

  const response = await fetch('https://postimages.org/api/rest', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('PostImages upload failed');
  }

  const data = await response.json();
  return data.url; // Direct image URL
}