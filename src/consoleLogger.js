export default function consoleLogger(type, data) {
    const logMethodName = {
        error : 'error',
        info  : 'info'
    }[type && type.toLowerCase()] || 'debug';

    console[logMethodName](data);
}
