const clones = [];

class Interceptor {

    /**
     * @type {Array<{path: string, args: Array<*>}>}
     * @private
     */
    #calls;

    constructor() {
        this.#calls = [];
    }

    /**
     * @returns {Array<{path: string, args: Array<*>}>}
     */
    get list() {
        return this.#calls;
    }

    /**
     * @returns {void}
     */
    reset() {
        this.#calls = [];
    }

    /**
     * @param {string} sPath
     * @param {Array<*>} aArguments
     */
    addCall(sPath, aArguments) {
        this.#calls.push({
            path: sPath,
            args: aArguments
        });
    }

    /**
     * @param {string} names
     */
    removeCalls(...names) {
        this.#calls = this.#calls.filter((call) => {
            return !names.includes(call.path);
        });
    }

    /**
     * @param {string} names
     */
    filter(...names) {
        this.#calls = this.#calls.filter((call) => {
            return names.includes(call.path);
        });
    }

}

export const testUtils = {

    clone: (...libs) => {
        libs.forEach((lib) => {
            const props = {};
            clones.push(props);
            for (let prop in lib) {
                props[prop] = lib[prop];
            }
        });
    },

    restore: (...libs) => {
        libs.forEach((lib, index) => {
            const props = clones[index];
            for (let prop in lib) {
                lib[prop] = props[prop];
            }
        });
        clones.length = 0;
    },

    Interceptor: Interceptor

};
