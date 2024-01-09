// get selection from user
(() => {
  const containerId = 'fe26f81e-9f24-48e6-b036-284fb800e51f';
  document.getElementById(containerId)?.remove();

  const container = document.createElement(containerId);
  container.id = containerId;
  container.style = `
    display: block;
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    cursor: crosshair;
  `;
  const capturer = document.createElement(containerId);
  container.appendChild(capturer);
  capturer.style = `
    display: block;
    width: 100%;
    height: 100%;
    background: black;
    opacity: 0.3;
  `;
  let savedX, savedY;

  const mousedown = (event) => {
    event.preventDefault();
    event.stopPropagation();
    savedX = event.clientX;
    savedY = event.clientY;
  };
  const mouseup = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof savedX === 'number' && typeof savedY === 'number') {
      setTimeout(() => {
        sendMessage(
          Math.min(savedX, event.clientX),
          Math.min(savedY, event.clientY),
          Math.abs(savedX - event.clientX),
          Math.abs(savedY - event.clientY)
        );
      }, 200);
      container.remove();
    }
  };
  container.onmousemove = (event) => {
    if (typeof savedX === 'number' && typeof savedY === 'number') {
      capturer.style.clipPath = generateClipPath(
        Math.min(savedX, event.clientX),
        Math.min(savedY, event.clientY),
        Math.abs(savedX - event.clientX),
        Math.abs(savedY - event.clientY)
      );
    }
  };
  capturer.onmousedown = mousedown;
  container.onmousedown = mousedown;
  capturer.onmouseup = mouseup;
  container.onmouseup = mouseup;

  document.body.appendChild(container);

  function generateClipPath(left, top, width, height) {
    const bottom = top + height;
    const right = left + width;
    return `polygon(evenodd, 0% 0%, 0% 100%, ${left}px 100%, ${left}px ${bottom}px, ${right}px ${bottom}px, ${right}px ${top}px, ${left}px ${top}px, ${left}px 100%, 100% 100%, 100% 0%)`;
  }

  function sendMessage(left, top, width, height) {
    window.chromeMessageHandler = chromeMessageHandler;
    return chrome.runtime.sendMessage({ type: 'capture', details: {
      left, top, width, height, windowWidth: window.innerWidth
    } });
  }

  const chromeMessageHandler = async (message) => {
    switch (message.type) {
      case 'captured-image':
        const image = await snipImage(
          message.image,
          message.details.left,
          message.details.top,
          message.details.width,
          message.details.height,
          message.details.windowWidth
        );

        // send to iframe for OCR
        frame.contentWindow.postMessage(image, '*');
        break;
    }
  };

  async function snipImage (dataUrl, left, top, width, height, windowWidth) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const devicePixelRatio = img.width / windowWidth;
        const canvas = document.createElement('canvas');
        canvas.width = width * devicePixelRatio;
        canvas.height = height * devicePixelRatio;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(
          img,
          left * devicePixelRatio,
          top * devicePixelRatio,
          width * devicePixelRatio,
          height * devicePixelRatio,
          0,
          0,
          width * devicePixelRatio,
          height * devicePixelRatio
        );
        const snippedUrl = canvas.toDataURL('image/png');
        resolve(snippedUrl);
      };
      img.onerror = reject;
    });
  }

  // load sandboxed iframe
  const frameId = 'fe26f81e-9f24-48e6-b036-284fb800e51e';
  document.getElementById(frameId)?.remove();

  const frame = document.createElement('iframe');
  frame.id = frameId;
  frame.style = 'display: none';
  frame.src = chrome.runtime.getURL('iframe.html');

  document.body.appendChild(frame);

  function frameMessageListener(event) {
    if (event.origin === 'null') { // origin is sandboxed
      handleFoundText(event.data.text);
      cleanup();
    }
  }
  window.addEventListener('message', frameMessageListener);

  function cleanup() {
    if (window.chromeMessageHandler === chromeMessageHandler) {
      delete window.chromeMessageHandler;
    }
    window.removeEventListener('message', frameMessageListener);
    frame.remove();
    container.remove();
  }

  function handleFoundText(text) {
    console.log(text);
  }
})();
