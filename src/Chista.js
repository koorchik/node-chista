/* eslint max-params:0 */

import serviceUtils from './serviceUtils';
import consoleLogger from './consoleLogger';

export default class Chista {
    constructor({
        defaultParamsBuilder = () => ({}),
        defaultContextBuilder = req => cloneDeep(req.session && req.session.context ? req.session.context : {}),
        defaultLogger = consoleLogger
    }) {
        this.defaultParamsBuilder  = defaultParamsBuilder;
        this.defaultContextBuilder = defaultContextBuilder;
        this.defaultLogger         = defaultLogger;
    }

    runService(serviceClass, { context = {}, params = {}, logger = this.defaultLogger }) {
        return serviceUtils.runService(serviceClass, { context, params, logger });
    }

    makeServiceRunner(
        serviceClass,
        paramsBuilder  = this.defaultParamsBuilder,
        contextBuilder = this.defaultContextBuilder,
        logger         = this.defaultLogger
    ) {
        return serviceUtils.makeServiceRunner(serviceClass, paramsBuilder, contextBuilder, logger);
    }

    renderPromiseAsJson(req, res, promise, logger = this.defaultLogger) {
        return serviceUtils.renderPromiseAsJson(req, res, promise, logger);
    }
}

/* istanbul ignore next */
function cloneDeep(data) {
    return JSON.parse(JSON.stringify(data));
}
