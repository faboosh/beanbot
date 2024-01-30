function perf(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const start = performance.now();
    const result = originalMethod.apply(this, args);

    if (result instanceof Promise) {
      return result.then((res) => {
        const end = performance.now();
        const executionTime = Math.round(end - start);
        console.log(
          `Method ${propertyKey} executed in ${executionTime.toFixed(3)} ms`
        );
        return res;
      });
    } else {
      const end = performance.now();
      const executionTime = Math.round(end - start);
      console.log(
        `Method ${propertyKey} executed in ${executionTime.toFixed(3)} ms`
      );
      return result;
    }
  };

  return descriptor;
}

export default perf;
