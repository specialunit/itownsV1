import proj4 from 'proj4';

proj4.defs('EPSG:4978', '+proj=geocent +datum=WGS84 +units=m +no_defs');

function isString(s) {
    return typeof s === 'string' || s instanceof String;
}

function mustBeString(crs) {
    if (!isString(crs)) {
        throw new Error(`Crs parameter value must be a string: '${crs}'`);
    }
}

function isTms(crs) {
    return isString(crs) && crs.startsWith('TMS');
}

function isEpsg(crs) {
    return isString(crs) && crs.startsWith('EPSG');
}

function formatToTms(crs) {
    mustBeString(crs);
    return isTms(crs) ? crs : `TMS:${crs.match(/\d+/)[0]}`;
}

function formatToEPSG(crs) {
    mustBeString(crs);
    return isEpsg(crs) ? crs : `EPSG:${crs.match(/\d+/)[0]}`;
}

const UNIT = {
    DEGREE: 1,
    METER: 2,
    FOOT: 3,
};

function is4326(crs) {
    return crs === 'EPSG:4326';
}

function isGeocentric(crs) {
    mustBeString(crs);
    const projection = proj4.defs(crs);
    return !projection ? false : projection.projName == 'geocent';
}

function _unitFromProj4Unit(projunit) {
    if (projunit === 'degrees') {
        return UNIT.DEGREE;
    } else if (projunit === 'm' || projunit === 'meter') {
        return UNIT.METER;
    } else if (projunit === 'foot') {
        return UNIT.FOOT;
    } else {
        return undefined;
    }
}

function toUnit(crs) {
    mustBeString(crs);
    switch (crs) {
        case 'EPSG:4326' : return UNIT.DEGREE;
        case 'EPSG:4978' : return UNIT.METER;
        default: {
            const p = proj4.defs(crs.startsWith('TMS') ? formatToEPSG(crs) : crs);
            if (!p) {
                return undefined;
            }
            return _unitFromProj4Unit(p.units);
        }
    }
}

function toUnitWithError(crs) {
    mustBeString(crs);
    const u = toUnit(crs);
    if (u === undefined) {
        throw new Error(`No unit found for crs: '${crs}'`);
    }
    return u;
}

/**
 * This module provides basic methods to manipulate a CRS (as a string).
 *
 * @module CRS
 */
export default {
    /**
     * Units that can be used for a CRS.
     *
     * @enum {number}
     */
    UNIT,

    /**
     * Assert that the CRS is valid one.
     *
     * @param {string} crs - The CRS to validate.
     *
     * @throws {Error} if the CRS is not valid.
     */
    isValid(crs) {
        toUnitWithError(crs);
    },

    /**
     * Assert that the CRS is geographic.
     *
     * @param {string} crs - The CRS to validate.
     * @return {boolean}
     * @throws {Error} if the CRS is not valid.
     */
    isGeographic(crs) {
        return (toUnitWithError(crs) == UNIT.DEGREE);
    },

    /**
     * Assert that the CRS is using metric units.
     *
     * @param {string} crs - The CRS to validate.
     * @return {boolean}
     * @throws {Error} if the CRS is not valid.
     */
    isMetricUnit(crs) {
        return (toUnit(crs) == UNIT.METER);
    },

    /**
     * Get the unit to use with the CRS.
     *
     * @param {string} crs - The CRS to get the unit from.
     * @return {number} Either `UNIT.METER`, `UNIT.DEGREE`, `UNIT.FOOT` or `undefined`.
     */
    toUnit,

    /**
     * Is the CRS EPSG:4326 ?
     *
     * @param {string} crs - The CRS to test.
     * @return {boolean}
     */
    is4326,
    /**
     * Is the CRS geocentric ?
     * if crs isn't defined the method returns false.
     *
     * @param {string} crs - The CRS to test.
     * @return {boolean}
     */
    isGeocentric,

    /**
     * Give a reasonnable epsilon to use with this CRS.
     *
     * @param {string} crs - The CRS to use.
     * @return {number} 0.01 if the CRS is EPSG:4326, 0.001 otherwise.
     */
    reasonnableEpsilon(crs) {
        if (is4326(crs)) {
            return 0.01;
        } else {
            return 0.001;
        }
    },
    /**
     * format crs to European Petroleum Survey Group notation : EPSG:XXXX.
     *
     * @param      {string}  crs     The crs to format
     * @return     {string}  formated crs
     */
    formatToEPSG,
    /**
     * format crs to tile matrix set notation : TMS:XXXX.
     *
     * @param      {string}  crs     The crs to format
     * @return     {string}  formated crs
     */
    formatToTms,
    isTms,
    isEpsg,
    tms_3857: 'TMS:3857',
    tms_4326: 'TMS:4326',
    /**
     * Define a proj4 projection as a string and reference.
     *
     * @param {string}  code    code is the projection's SRS code (only used internally by the Proj4js library)
     * @param {string}  proj4def is the Proj4 definition string for the projection to use
     * @return {undefined}
     */
    defs: (code, proj4def) => proj4.defs(code, proj4def),
};
