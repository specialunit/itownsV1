/**
 * Generated On: 2016-02-25
 * Class: CoordStars
 * Description: get coord of stars like earth...
 */
import Coordinates from './Coordinates';

const CoordStars = {

    getSunPosition() {
        const m = Math;
        const PI = m.PI;
        const sin = m.sin;
        const cos = m.cos;
        const tan = m.tan;
        const asin = m.asin;
        const atan = m.atan2;

        const rad = PI / 180;
        const dayMs = 1000 * 60 * 60 * 24;
        const J1970 = 2440588;
        const J2000 = 2451545;
        const e = rad * 23.4397; // obliquity of the Earth

        function toJulian(date: Date | number) {
            return date.valueOf() / dayMs - 0.5 + J1970;
        }

        function toDays(date: Date | number) {
            return toJulian(date) - J2000;
        }

        function getRightAscension(l: number, b: number) {
            return atan(sin(l) * cos(e) - tan(b) * sin(e), cos(l));
        }

        function getDeclination(l: number, b: number) {
            return asin(sin(b) * cos(e) + cos(b) * sin(e) * sin(l));
        }

        function getAzimuth(H: number, phi: number, dec: number) {
            return atan(sin(H), cos(H) * sin(phi) - tan(dec) * cos(phi));
        }

        function getAltitude(H: number, phi: number, dec: number) {
            return asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(H));
        }

        function getSiderealTime(d: number, lw: number) {
            return rad * (280.16 + 360.9856235 * d) - lw;
        }

        function getSolarMeanAnomaly(d: number) {
            return rad * (357.5291 + 0.98560028 * d);
        }

        function getEquationOfCenter(M: number) {
            return rad * (1.9148 * sin(M) + 0.0200 * sin(2 * M) + 0.0003 * sin(3 * M));
        }

        function getEclipticLongitude(M: number, C: number) {
            const P = rad * 102.9372; // perihelion of the Earth
            return M + C + P + PI;
        }

        return function getSunPosition(date: Date | number, lat: number, lon: number) {
            const lw = rad * -lon;
            const phi = rad * lat;
            const d = toDays(date);
            const M = getSolarMeanAnomaly(d);
            const C = getEquationOfCenter(M);
            const L = getEclipticLongitude(M, C);
            const D = getDeclination(L, 0);
            const A = getRightAscension(L, 0);
            const t = getSiderealTime(d, lw);
            const H = t - A;

            return {
                EclipticLongitude: L,
                declinaison: D,
                ascension: A,
                H,
                SiderealTime: t,
                altitude: getAltitude(H, phi, D),
                azimuth: getAzimuth(H, phi, D) + PI / 2, // + PI// - PI/2
                // origin: north !!! not like original Mourner code but more
                // classical ref
            };
        };
    },

    // Return scene coordinate ({x,y,z}) of sun
    getSunPositionInScene(date: Date | number, lat: number, lon: number) {
        if (typeof date !== 'number') {
            date = date.valueOf();
        }
        const sun = CoordStars.getSunPosition()(date, lat, lon);
        const dayMilliSec = 24 * 3600000;
        const longitude = sun.ascension +
            ((date % dayMilliSec) / dayMilliSec) * -360 + 180; // cause midday
        const coSunCarto = new Coordinates('EPSG:4326', longitude, lat, 50000000)
            .as('EPSG:4978').toVector3();

        return coSunCarto;
    },


};

export default CoordStars;
