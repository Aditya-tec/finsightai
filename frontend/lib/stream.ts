import { streamUrl } from "./api";

export function openThoughtStream(
  query: string,
  onMessage: (msg: string) => void,
  onDone?: () => void
) {
  const es = new EventSource(streamUrl(query));
  es.onmessage = (event) => {
    const text = event.data;
    onMessage(text);
    if (text === "DONE") {
      es.close();
      onDone?.();
    }
  };
  es.onerror = () => {
    es.close();
    onDone?.();
  };
  return es;
}
