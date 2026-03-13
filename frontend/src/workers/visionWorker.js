let faceLandmarker = null;
let initTried = false;

async function initModels() {
  if (initTried) return;
  initTried = true;

  try {
    const vision = await import("@mediapipe/tasks-vision");
    const filesetResolver = await vision.FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
    );

    faceLandmarker = await vision.FaceLandmarker.createFromOptions(
      filesetResolver,
      {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        },
        runningMode: "IMAGE",
        numFaces: 2,
      },
    );
  } catch {
    faceLandmarker = null;
  }
}

function estimateFocusVariance(imageData) {
  const data = imageData.data;
  if (!data || data.length < 4) return null;

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  // Approximate edge energy from neighboring pixels, similar to Laplacian variance intent.
  for (let i = 0; i + 8 < data.length; i += 16) {
    const gray1 = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const gray2 =
      0.299 * data[i + 4] + 0.587 * data[i + 5] + 0.114 * data[i + 6];
    const diff = Math.abs(gray1 - gray2);
    sum += diff;
    sumSq += diff * diff;
    count += 1;
  }

  if (count === 0) return null;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

self.onmessage = async (message) => {
  const { type } = message.data || {};

  if (type === "init") {
    await initModels();
    self.postMessage({ type: "ready" });
    return;
  }

  if (type !== "frame") return;

  await initModels();

  const frame = message.data.frame;
  const offscreen = new OffscreenCanvas(frame.width, frame.height);
  const ctx = offscreen.getContext("2d");
  ctx.drawImage(frame, 0, 0);
  const imageData = ctx.getImageData(0, 0, frame.width, frame.height);
  frame.close();

  let faceCount = 0;
  let gazeOffset = 0;
  let provider = "fallback";

  if (faceLandmarker) {
    const detected = faceLandmarker.detect(offscreen);
    const landmarksList = detected.faceLandmarks || [];
    faceCount = landmarksList.length;
    provider = "mediapipe";

    if (landmarksList[0] && landmarksList[0][1]) {
      gazeOffset = Math.abs(landmarksList[0][1].x - 0.5);
    }
  }

  const focusVariance = estimateFocusVariance(imageData);

  self.postMessage({
    type: "analysis",
    result: {
      faceCount,
      gazeOffset,
      focusVariance,
      provider,
    },
  });
};
