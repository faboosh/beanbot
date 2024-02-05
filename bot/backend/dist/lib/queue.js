function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
class AsyncTaskQueue {
    async enqueue(taskId, task) {
        // Check if the task is already in progress
        if (!this.taskQueue[taskId]) {
            // If not, create a new task entry
            const newTask = {
                promise: new Promise(()=>{}),
                subscribers: []
            };
            this.taskQueue[taskId] = newTask;
            newTask.promise = (async ()=>{
                try {
                    // Execute the task
                    const result = await task();
                    // Notify all subscribers of success
                    newTask.subscribers.forEach((subscriber)=>subscriber(null, result));
                    return result;
                } catch (error) {
                    // Notify all subscribers of the error
                    newTask.subscribers.forEach((subscriber)=>subscriber(error));
                    throw error;
                } finally{
                    // Clean up the task queue
                    delete this.taskQueue[taskId];
                }
            })();
        }
        // Return a promise that resolves or rejects when the task is complete
        return new Promise((resolve, reject)=>{
            this.taskQueue[taskId].subscribers.push((error, result)=>{
                if (error) reject(error);
                else resolve(result);
            });
        });
    }
    constructor(){
        _define_property(this, "taskQueue", {});
    }
}
export default AsyncTaskQueue;
