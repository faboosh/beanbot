const padZero = (num)=>{
    return num.toString().padStart(2, "0");
};
const nowToHHMMSS = ()=>{
    const now = new Date();
    return `${padZero(now.getHours())}:${padZero(now.getMinutes())}:${padZero(now.getSeconds())}`;
};
const logError = (...args)=>{
    console.error(`[${nowToHHMMSS()}]`, ...args);
};
const logMessage = (...args)=>{
    console.log(`[${nowToHHMMSS()}]`, ...args);
};
const logWarning = (...args)=>{
    console.warn(`[${nowToHHMMSS()}]`, ...args);
};
function log(target, propertyName, propertyDesciptor) {
    const method = propertyDesciptor.value;
    propertyDesciptor.value = function(...args) {
        // Log method name and arguments
        logMessage(`Calling method: ${propertyName}`);
        logMessage("Arguments:", args);
        // Check if the method is asynchronous
        const isAsync = method.constructor.name === "AsyncFunction";
        // Handle asynchronous method
        if (isAsync) {
            return method.apply(this, args).then((result)=>{
                // Log the return value
                logMessage(`Return value from ${propertyName}:`, result);
                return result;
            }).catch((error)=>{
                // Handle or rethrow the error
                logError(`Error in ${propertyName}:`, error);
                throw error;
            });
        } else {
            const result = method.apply(this, args);
            // Log the return value
            logMessage(`Return value from ${propertyName}:`, result);
            return result;
        }
    };
    return propertyDesciptor;
}
export { log, logError, logMessage, logWarning };
