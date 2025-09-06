import { useState } from "react";
import { GoogleGenAI } from "@google/genai";
import { fal } from "@fal-ai/client";

fal.config({
  proxyUrl: "/api/fal/proxy",
});

export default function Home() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [introNanoPreview, setIntroNanoPreview] = useState<any>(null);
  // const [endNanoPreview, setEndNanoPreview] = useState<any>(null);
  const [nanoResult, setNanoResult] = useState<any>(null);
  const [nanoLoading, setNanoLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);

  const [veoLoading, setVeoLoading] = useState(false);
  const [veoVideo, setVeoVideo] = useState<any>(null);

  const [issuePrompt, setIssuePrompt] = useState<string>("");
  const [solutionPrompt, setSolutionPrompt] = useState<string>("");
  const [videoPrompt, setVideoPrompt] = useState<string>("");

  console.log("Issue Prompt:", issuePrompt);
  console.log("Solution Prompt:", solutionPrompt);
  console.log("Video Prompt:", videoPrompt);

  // Nano Banana Image
  const handleIntroSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      const reader = new FileReader();

      reader.onload = (e) => {
        if (e.target) {
          setIntroNanoPreview(e.target.result);
        }
      };
      reader.readAsDataURL(file);
      setError(null);
    } else {
      setError("Please select a valid image file");
    }
  };

  // const handleEndSelect = (event) => {
  //   const file = event.target.files[0];
  //   if (file && file.type.startsWith("image/")) {
  //     setSelectedFile(file);
  //     const reader = new FileReader();

  //     reader.onload = (e) => {
  //       if (e.target) {
  //         setEndNanoPreview(e.target.result);
  //       }
  //     };
  //     reader.readAsDataURL(file);
  //     setError(null);
  //   } else {
  //     setError("Please select a valid image file");
  //   }
  // };

  const handleIssuePrompt = (event: React.ChangeEvent<HTMLInputElement>) => {
    const prompt = event.target.value;

    setIssuePrompt(prompt);
  };

  const handleSolutionPrompt = (event: React.ChangeEvent<HTMLInputElement>) => {
    const prompt = event.target.value;

    setSolutionPrompt(prompt);
  };

  const handleVideoPrompt = (event: React.ChangeEvent<HTMLInputElement>) => {
    const prompt = event.target.value;

    setVideoPrompt(prompt);
  };

  const processNanoImage = async () => {
    if (!selectedFile) {
      setError("Please select an image first");
      return;
    }

    setNanoLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY,
      });

      const reader = new FileReader();
      reader.onload = async (e) => {
        let base64Image = "";
        if (!e.target) {
          setError("Failed to read the file");
          setNanoLoading(false);
          return;
        }
        if (e.target.result) {
          base64Image = e.target.result.split(",")[1];
        }

        const prompt = [
          {
            text: `issue: ${issuePrompt}. ideal: ${solutionPrompt}. Generate a high-quality image that addresses the issue and reflects the ideal outcome.`,
          },
          {
            inlineData: {
              mimeType: selectedFile.type,
              data: base64Image,
            },
          },
        ];

        try {
          const response: any = await ai.models.generateContent({
            model: "gemini-2.5-flash-image-preview",
            contents: prompt,
          });

          const parts = response.candidates[0].content.parts;
          const resultData: { text: null | string; image: null | string } = {
            text: null,
            image: null,
          };

          for (const part of parts) {
            if (part.text) {
              resultData.text = part.text;
            } else if (part.inlineData) {
              resultData.image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
          }

          setNanoResult(resultData);
        } catch (apiError) {
          setError(`API Error: ${apiError.message}`);
        } finally {
          setNanoLoading(false);
        }
      };

      reader.readAsDataURL(selectedFile);
    } catch (err) {
      setError(`Error: ${err.message}`);
      setNanoLoading(false);
    }
  };

  console.log("nanoResult :", nanoResult);

  const uploadBase64ToFal = async (base64Data: string) => {
    // Convert base64 to blob
    const response = await fetch(base64Data);
    const blob = await response.blob();

    // Upload to fal.ai storage
    const file = new File([blob], "generated-image.png", { type: "image/png" });
    const url = await fal.storage.upload(file);

    return url;
  };

  const processVideoByVeo = async () => {
    console.log("processVideoByVeo");
    console.log("nanoResult.image: ", nanoResult.image);

    try {
      setVeoLoading(true);

      // Upload the base64 image to fal.ai storage first
      const imageUrl = await uploadBase64ToFal(nanoResult.image);
      console.log("Uploaded image URL:", imageUrl);

      const result = await fal.subscribe("fal-ai/veo2/image-to-video", {
        input: {
          prompt: videoPrompt,
          image_url: imageUrl,
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log) => log.message).forEach(console.log);
          }
        },
      });

      setVeoVideo(result.data);
      console.log("veoVide:", veoVideo);
      console.log(result.requestId);
    } catch (error) {
      console.error("Video generation error:", error);
      setError(`Video generation failed: ${error.message}`);
    } finally {
      setVeoLoading(false);
    }
  };

  const downloadResult = () => {
    if (nanoResult?.image) {
      const link = document.createElement("a");
      link.href = nanoResult.image;
      link.download = "generated.png";
      link.click();
    }
  };

  return (
    <div
      className="flex h-screen bg-background"
      style={{
        display: "flex",
        flexDirection: "row",
        margin: "0 auto",
        padding: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "50%",
          padding: "20px",
        }}
      >
        <h1>Fix YouTube Video Scene</h1>

        <p>
          Select an image from a YouTube scene you’d like to change. This will
          define the ideal images that serve as the foundation for your
          transformation.
        </p>

        <div
          className="flex"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <div className="w-1/2">
            <input
              type="file"
              accept="image/*"
              onChange={handleIntroSelect}
              style={{ marginBottom: "10px" }}
            />

            {error && (
              <div style={{ color: "red", marginTop: "10px" }}>{error}</div>
            )}

            {introNanoPreview && (
              <div className="">
                <h3>Selected Start Point of the Video:</h3>
                <img
                  src={introNanoPreview}
                  alt="Selected"
                  style={{ maxWidth: "300px", height: "auto" }}
                />
                <h4>What's wrong with the scene?</h4>
              </div>
            )}
          </div>

          {/* <div className="w-1/2">
            <input
              type="file"
              accept="image/*"
              onChange={handleEndSelect}
              style={{ marginBottom: "10px" }}
            />

            {endNanoPreview && (
              <div className="">
                <h3>Selected End Point of the Video:</h3>
                <img
                  src={endNanoPreview}
                  alt="Selected"
                  style={{ maxWidth: "300px", height: "auto" }}
                />
                <p>End Scene</p>
              </div>
            )}
          </div> */}
          <label>What is wrong with the image?</label>
          <input
            type="text"
            onChange={handleIssuePrompt}
            value={issuePrompt}
            style={{ width: "auto", padding: "10px", marginBottom: "20px" }}
          />

          <label>What is the ideal outcome?</label>
          <input
            type="text"
            onChange={handleSolutionPrompt}
            value={solutionPrompt}
            style={{ width: "auto", padding: "10px", marginBottom: "20px" }}
          />

          <div style={{ display: "flex" }}>
            <button
              onClick={processNanoImage}
              disabled={!selectedFile || nanoLoading}
              style={{
                padding: "10px 20px",
                backgroundColor: nanoLoading ? "#ccc" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: nanoLoading ? "not-allowed" : "pointer",
              }}
            >
              {nanoLoading ? "Processing..." : "Fix your scene"}
            </button>

            <button
              onClick={() => {
                setNanoResult(null);
              }}
              style={{
                padding: "10px 20px",
                marginLeft: "10px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          width: "50%",
          display: "flex",
          flexDirection: "column",
          padding: "20px",
        }}
      >
        {nanoResult && (
          <div>
            {/* {nanoResult.text && (
              <div>
                <h3>Generated Text:</h3>
                <p>{nanoResult.text}</p>
              </div>
            )} */}

            {nanoResult.image && (
              <div>
                <div>
                  <h2>Generated Image:</h2>
                  <img
                    src={nanoResult.image}
                    alt="Generated"
                    style={{ maxWidth: "100%", height: "auto" }}
                  />
                  <br />
                  <div style={{ display: "flex" }}>
                    <button
                      onClick={downloadResult}
                      style={{
                        padding: "10px 20px",
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Download Image
                    </button>
                    <button
                      onClick={() => {
                        setNanoResult(null);
                      }}
                      style={{
                        marginLeft: "10px",
                        padding: "10px 20px",
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  <h3>
                    Are you happy with the image? If so, let's create a video
                  </h3>

                  <label>
                    Describe the video flow you'd like. Add your subject, its
                    action, and your preferred style to generate the scene.
                  </label>
                  <input
                    type="text"
                    onChange={handleVideoPrompt}
                    value={videoPrompt}
                    style={{
                      width: "auto",
                      padding: "10px",
                      marginBottom: "20px",
                    }}
                  />

                  <button
                    onClick={processVideoByVeo}
                    disabled={!nanoResult.image || veoLoading}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: veoLoading ? "#ccc" : "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: veoLoading ? "not-allowed" : "pointer",
                    }}
                  >
                    {veoLoading ? "Processing..." : "Generate a video"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* <p>
          Add two images that represent your ideal transformation — a starting
          point and an endpoint. Our generator will turn them into a smooth
          video, bringing your vision to life for YouTube.
        </p> */}

        {veoVideo && (
          <div style={{ marginTop: "20px" }}>
            <h3>Generated Video:</h3>
            <video
              src={veoVideo.video.url}
              controls
              style={{ maxWidth: "100%", height: "auto" }}
            />
            <br />
            <a
              href={veoVideo.video.url}
              download="generated-video.mp4"
              style={{
                marginTop: "10px",
                display: "inline-block",
                padding: "10px 20px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              Download Video
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
