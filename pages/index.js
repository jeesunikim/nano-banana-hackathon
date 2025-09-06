import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
      setError(null);
    } else {
      setError('Please select a valid image file');
    }
  };

  const processImage = async () => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY });
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Image = e.target.result.split(',')[1];
        
        const prompt = [
          {
            text: `Using the image of the cat, create a photorealistic,
street-level view of the cat walking along a sidewalk in a
New York City neighborhood, with the blurred legs of pedestrians
and yellow cabs passing by in the background.`,
          },
          {
            inlineData: {
              mimeType: selectedFile.type,
              data: base64Image,
            },
          },
        ];

        try {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: prompt,
          });
          
          const parts = response.candidates[0].content.parts;
          const resultData = {
            text: null,
            image: null
          };
          
          for (const part of parts) {
            if (part.text) {
              resultData.text = part.text;
            } else if (part.inlineData) {
              resultData.image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
          }
          
          setResult(resultData);
        } catch (apiError) {
          setError(`API Error: ${apiError.message}`);
        } finally {
          setLoading(false);
        }
      };
      
      reader.readAsDataURL(selectedFile);
    } catch (err) {
      setError(`Error: ${err.message}`);
      setLoading(false);
    }
  };

  const downloadResult = () => {
    if (result?.image) {
      const link = document.createElement('a');
      link.href = result.image;
      link.download = 'generated-cat.png';
      link.click();
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Cat Image Generator</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ marginBottom: '10px' }}
        />
        
        {preview && (
          <div>
            <h3>Selected Image:</h3>
            <img
              src={preview}
              alt="Selected"
              style={{ maxWidth: '300px', height: 'auto' }}
            />
          </div>
        )}
      </div>

      <button
        onClick={processImage}
        disabled={!selectedFile || loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Processing...' : 'Generate NYC Street Scene'}
      </button>

      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '20px' }}>
          {result.text && (
            <div>
              <h3>Generated Text:</h3>
              <p>{result.text}</p>
            </div>
          )}
          
          {result.image && (
            <div>
              <h3>Generated Image:</h3>
              <img
                src={result.image}
                alt="Generated"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
              <br />
              <button
                onClick={downloadResult}
                style={{
                  marginTop: '10px',
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Download Image
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}