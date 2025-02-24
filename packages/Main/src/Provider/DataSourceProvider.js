export default {
    executeCommand(command) {
        const layer = command.layer;
        const src = command.extentsSource;
        const dst = command.extentsDestination || src;
        const promises = src.map((from, i) => (layer.getData(from, dst[i])));

        // partialLoading sets the return promise as fulfilled if at least one sub-promise is fulfilled
        // It waits until all promises are resolved
        if (command.partialLoading) {
            return Promise.allSettled(promises)
                .then((results) => {
                    const anyFulfilledPromise = results.find(promise => promise.status === 'fulfilled');
                    if (!anyFulfilledPromise) {
                        // All promises failed -> reject
                        return Promise.reject(new Error('Failed to load any data'));
                    }
                    return results.map(prom => (prom.value ? prom.value : null));
                });
        }

        // Without partialLoading, the return promise is rejected as soon as any sub-promise is rejected
        return Promise.all(promises);
    },
};
