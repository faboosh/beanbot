import { Worker } from "worker_threads";
import { logMessage } from "../../log";

// Create a new worker thread
const worker = new Worker(__filename);

// Listen for messages from the worker thread
worker.on("message", (message) => {
  logMessage("Received message from worker:", message);
});

// Send a message to the worker thread
worker.postMessage("Hello from the main thread!");
