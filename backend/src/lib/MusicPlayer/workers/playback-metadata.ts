import { Worker } from "worker_threads";

// Create a new worker thread
const worker = new Worker(__filename);

// Listen for messages from the worker thread
worker.on("message", (message) => {
  console.log("Received message from worker:", message);
});

// Send a message to the worker thread
worker.postMessage("Hello from the main thread!");
