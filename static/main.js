console.log("hello javascript");

const ws = new WebSocket("ws://localhost:3000");

ws.onopen = function () {
  // ws.send("client sends data to server");
};

function handleChunk(chunk, metadata) {
  if (metadata.decoderConfig) {
    console.log("decoderConfig", metadata.decoderConfig);
  }

  const chunkdata = new Uint8Array(chunk.byteLength);
  chunk.copyTo(chunkdata);

  const timestamp = chunk.timestamp;
  const isKey = chunk.data === "key";

  ws.send(chunkdata);
}

function handleError(error) {
  console.log(error);
}

const encoderInit = {
  output: handleChunk,
  error: handleError,
};
const encoder = new VideoEncoder(encoderInit);

const encoderConfig = {
  codec: "avc1.4d002a",
  width: 640,
  height: 480,
  bitrate: 2_000_000,
  framerate: 30,
};
encoder.configure(encoderConfig);

navigator.mediaDevices
  .getUserMedia({ video: true })
  .then(async (mediaStream) => {
    let frameCounter = 0;

    const videoTrack = mediaStream.getVideoTracks()[0];
    const trackProcessor = new MediaStreamTrackProcessor({ track: videoTrack });

    const reader = trackProcessor.readable.getReader();
    while (true) {
      const result = await reader.read();

      if (result.done) break;

      const frame = result.value;
      if (encoder.encodeQueueSize > 2) {
        frame.close();
      } else {
        frameCounter++;
        const shouldInsertKeyframe = frameCounter % 150 === 0;
        encoder.encode(frame, { keyFrame: shouldInsertKeyframe });
        frame.close();
      }
    }
  });
