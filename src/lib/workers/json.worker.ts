/// <reference lib="webworker" />

self.onmessage = async (e: MessageEvent<File>) => {
    const file = e.data;

    if (!file) {
        self.postMessage({ error: 'No file provided' });
        return;
    }

    try {
        const text = await file.text();
        const data = JSON.parse(text);
        self.postMessage({ data });
    } catch (error) {
        self.postMessage({ error: 'Failed to parse JSON' });
    }
};
