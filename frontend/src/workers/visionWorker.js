let faceLandmarker = null;
let initTried = false;
let previousFaceCenter = null;

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

function estimateFocusVariance(data) {
  if (!data || data.length < 4) return null;

  let sum = 0;
  let sumSq = 0;
  let count = 0;

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

function fallbackAnalysis(pixelData, width, height) {
  let skinCount = 0;
  let sumX = 0;
  let sumY = 0;
  const step = 6;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const red = pixelData[idx];
      const green = pixelData[idx + 1];
      const blue = pixelData[idx + 2];
      const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
      const blueChroma = -0.169 * red - 0.331 * green + 0.5 * blue + 128;
      const redChroma = 0.5 * red - 0.419 * green - 0.081 * blue + 128;

      if (
        luminance > 80
        && blueChroma >= 77
        && blueChroma <= 127
        && redChroma >= 133
        && redChroma <= 175
      ) {
        skinCount += 1;
        sumX += x;
        sumY += y;
      }
    }
  }

  const sampledPixels = Math.ceil(width / step) * Math.ceil(height / step);
  const faceCount = skinCount / sampledPixels > 0.025 ? 1 : 0;

  let gazeOffset = 0;
  let headOffset = 0;
  let headMovementDelta = 0;

  if (faceCount > 0 && skinCount > 0) {
    const centerX = sumX / skinCount / width;
    const centerY = sumY / skinCount / height;

    gazeOffset = Math.abs(centerX - 0.5);
    headOffset = Math.hypot(centerX - 0.5, centerY - 0.5);

    if (previousFaceCenter) {
      headMovementDelta = Math.hypot(
        centerX - previousFaceCenter.x,
        centerY - previousFaceCenter.y,
      );
    }

    previousFaceCenter = { x: centerX, y: centerY };
  } else {
    previousFaceCenter = null;
  }

  return {
    faceCount,
    gazeOffset,
    headOffset,
    headMovementDelta,
    provider: "fallback-cpu",
  };
}

self.onmessage = async (message) => {
  const { type, frame } = message.data || {};

  if (type === "init") {
    await initModels();
    self.postMessage({ type: "ready" });
    return;
  }

  if (type !== "frame" || !frame) return;

  await initModels();

  const width = frame.width;
  const height = frame.height;
  const offscreen = new OffscreenCanvas(width, height);
  const ctx = offscreen.getContext("2d");

  if (!ctx) {
    frame.close();
    self.postMessage({
      type: "analysis",
      result: {
        faceCount: 0,
        gazeOffset: 0,
        headOffset: 0,
        headMovementDelta: 0,
        focusVariance: null,
        provider: "fallback-cpu",
      },
    });
    return;
  }

  ctx.drawImage(frame, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  const focusVariance = estimateFocusVariance(imageData.data);

  let result;

  if (faceLandmarker) {
    try {
      const detected = faceLandmarker.detect(frame);
      const landmarksList = detected.faceLandmarks || [];
      const faceCount = landmarksList.length;
      let gazeOffset = 0;
      let headOffset = 0;
      let headMovementDelta = 0;

      if (landmarksList[0] && landmarksList[0][1]) {
        const nosePoint = landmarksList[0][1];
        gazeOffset = Math.abs(nosePoint.x - 0.5);
        headOffset = Math.hypot(nosePoint.x - 0.5, nosePoint.y - 0.5);

        if (previousFaceCenter) {
          headMovementDelta = Math.hypot(
            nosePoint.x - previousFaceCenter.x,
            nosePoint.y - previousFaceCenter.y,
          );
        }

        previousFaceCenter = { x: nosePoint.x, y: nosePoint.y };
      } else if (faceCount === 0) {
        previousFaceCenter = null;
      }

      result = {
        faceCount,
        gazeOffset,
        headOffset,
        headMovementDelta,
        provider: "mediapipe",
      };
    } catch {
      result = fallbackAnalysis(imageData.data, width, height);
    }
  } else {
    result = fallbackAnalysis(imageData.data, width, height);
  }

  frame.close();

  self.postMessage({
    type: "analysis",
    result: {
      ...result,
      focusVariance,
    },
  });
};
