window.addEventListener('message', async (event) => {
  const text = await recognize(event.data);
  event.source.postMessage({ text }, event.origin);
});

const recognize = async (image) => {
  const worker = await Tesseract.createWorker('srp');
  const result = await worker.recognize(image);
  const text = result.data.text;
  await worker.terminate();
  return text;
};
