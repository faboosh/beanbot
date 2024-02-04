const padZero = (num: number) => {
  return num.toString().padStart(2, "0");
};

const nowToHHMMSS = () => {
  const now = new Date();
  return `${padZero(now.getHours())}:${padZero(now.getMinutes())}:${padZero(
    now.getSeconds()
  )}`;
};

const logError = (...args: any[]) => {
  console.error(`[${nowToHHMMSS()}]`, ...args);
};

const logMessage = (...args: any[]) => {
  console.log(`[${nowToHHMMSS()}]`, ...args);
};

const logWarning = (...args: any[]) => {
  console.warn(`[${nowToHHMMSS()}]`, ...args);
};

function log(
  target: any,
  propertyName: string,
  propertyDesciptor: PropertyDescriptor
): PropertyDescriptor {
  const method = propertyDesciptor.value;

  propertyDesciptor.value = function (...args: any[]) {
    // Log method name and arguments
    logMessage(`Calling method: ${propertyName}`);
    logMessage("Arguments:", args);

    // Check if the method is asynchronous
    const isAsync = method.constructor.name === "AsyncFunction";

    // Handle asynchronous method
    if (isAsync) {
      return method
        .apply(this, args)
        .then((result: any) => {
          // Log the return value
          logMessage(`Return value from ${propertyName}:`, result);
          return result;
        })
        .catch((error: any) => {
          // Handle or rethrow the error
          logError(`Error in ${propertyName}:`, error);
          throw error;
        });
    }

    // Handle synchronous method
    else {
      const result = method.apply(this, args);
      // Log the return value
      logMessage(`Return value from ${propertyName}:`, result);
      return result;
    }
  };

  return propertyDesciptor;
}

export { log, logError, logMessage, logWarning };
