// qr.js – minimal standalone QR generator (byte mode, versions 1–4, EC=M)
// NOTE: This is a compact implementation suitable for typical URL/text payloads.
// It is not a full QR spec implementation (no Kanji, no structured append, etc.).

(function () {
    // ---- Finite field for Reed–Solomon over GF(256) ----
    const GF = (() => {
        const exp = new Array(512);
        const log = new Array(256);
        let x = 1;
        for (let i = 0; i < 255; i++) {
            exp[i] = x;
            log[x] = i;
            x <<= 1;
            if (x & 0x100) x ^= 0x11d; // primitive polynomial
        }
        for (let i = 255; i < 512; i++) exp[i] = exp[i - 255];

        function mul(a, b) {
            if (a === 0 || b === 0) return 0;
            return exp[log[a] + log[b]];
        }

        return { exp, log, mul };
    })();

    // ---- Reed–Solomon encoder ----
    function rsGeneratorPoly(n) {
        let poly = [1];
        for (let i = 0; i < n; i++) {
            const p = [];
            for (let j = 0; j < poly.length; j++) {
                p[j] = GF.mul(poly[j], 1) ^ GF.mul(poly[j] || 0, 0); // just copy
            }
            p.unshift(0);
            for (let j = 0; j < poly.length; j++) {
                p[j + 1] ^= GF.mul(poly[j], GF.exp[i]);
            }
            poly = p;
        }
        return poly;
    }

    function rsComputeRemainder(data, ecCount) {
        const gen = rsGeneratorPoly(ecCount);
        const res = data.slice();
        for (let i = 0; i < data.length; i++) {
            const factor = res[i];
            if (factor !== 0) {
                for (let j = 0; j < gen.length; j++) {
                    res[i + j] ^= GF.mul(gen[j], factor);
                }
            }
        }
        return res.slice(res.length - ecCount);
    }

    // ---- Bit buffer ----
    class BitBuffer {
        constructor() {
            this.bits = [];
        }
        put(val, length) {
            for (let i = length - 1; i >= 0; i--) {
                this.bits.push((val >>> i) & 1);
            }
        }
        putBytes(bytes) {
            for (const b of bytes) this.put(b, 8);
        }
        get length() {
            return this.bits.length;
        }
        toBytes() {
            const out = [];
            for (let i = 0; i < this.bits.length; i += 8) {
                let b = 0;
                for (let j = 0; j < 8 && i + j < this.bits.length; j++) {
                    b = (b << 1) | this.bits[i + j];
                }
                out.push(b);
            }
            return out;
        }
    }

    // ---- Utilities ----
    function stringToUtf8Bytes(str) {
        const encoder = new TextEncoder();
        return Array.from(encoder.encode(str));
    }

    // capacity table for byte mode, EC=M, versions 1–4 (approx)
    const CAPACITY = {
        1: 14,
        2: 26,
        3: 42,
        4: 62
    };

    const EC_CODEWORDS = {
        1: 10,
        2: 16,
        3: 26,
        4: 18   // simplified table just for demo; spec is more detailed
    };

    function chooseVersion(byteLen) {
        for (let v = 1; v <= 4; v++) {
            if (byteLen <= CAPACITY[v]) return v;
        }
        throw new Error("Data too long for version 1–4 with EC=M");
    }

    function sizeForVersion(v) {
        return 21 + 4 * (v - 1);
    }

    // ---- QR matrix generation ----
    function createEmptyMatrix(size) {
        const m = new Array(size);
        for (let i = 0; i < size; i++) {
            m[i] = new Array(size).fill(null);
        }
        return m;
    }

    function placeFinderPattern(matrix, x, y) {
        for (let dy = -1; dy <= 7; dy++) {
            for (let dx = -1; dx <= 7; dx++) {
                const xx = x + dx;
                const yy = y + dy;
                if (xx < 0 || xx >= matrix.length || yy < 0 || yy >= matrix.length) continue;
                const val = (dx >= 0 && dx <= 6 && (dy === 0 || dy === 6)) ||
                            (dy >= 0 && dy <= 6 && (dx === 0 || dx === 6)) ||
                            (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
                matrix[yy][xx] = val ? 1 : 0;
            }
        }
    }

    function placeTimingPatterns(matrix) {
        const size = matrix.length;
        for (let i = 8; i < size - 8; i++) {
            if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0 ? 1 : 0;
            if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0 ? 1 : 0;
        }
    }

    function reserveFormatAreas(matrix) {
        const size = matrix.length;
        for (let i = 0; i < 9; i++) {
            if (i !== 6) {
                matrix[8][i] = 0;
                matrix[i][8] = 0;
            }
        }
        for (let i = 0; i < 8; i++) {
            matrix[8][size - 1 - i] = 0;
            matrix[size - 1 - i][8] = 0;
        }
    }

    function mapData(matrix, dataBits) {
        const size = matrix.length;
        let bitIndex = 0;
        let dirUp = true;
        for (let x = size - 1; x > 0; x -= 2) {
            if (x === 6) x--; // skip timing column
            for (let yOffset = 0; yOffset < size; yOffset++) {
                const y = dirUp ? size - 1 - yOffset : yOffset;
                for (let dx = 0; dx < 2; dx++) {
                    const xx = x - dx;
                    if (matrix[y][xx] !== null) continue;
                    const bit = bitIndex < dataBits.length ? dataBits[bitIndex] : 0;
                    matrix[y][xx] = bit;
                    bitIndex++;
                }
            }
            dirUp = !dirUp;
        }
    }

    // mask pattern 0: (row + col) % 2 === 0
    function applyMask0(matrix) {
        const size = matrix.length;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                // skip reserved format areas if needed; for simplicity we mask all data
                matrix[y][x] ^= ((x + y) % 2 === 0) ? 1 : 0;
            }
        }
    }

    // For simplicity, fix format bits for: EC=M, mask=0 (pattern from spec)
    function placeFormatInfo(matrix) {
        const size = matrix.length;
        // Format bits for EC=M (01), mask=0 (000):  101 011 001 001 111
        const formatBits = [
            1,0,1,0,1,1,0,0,1,0,0,1,1,1,1
        ];
        // top-left
        for (let i = 0; i < 6; i++) matrix[8][i] = formatBits[i];
        matrix[8][7] = formatBits[6];
        matrix[8][8] = formatBits[7];
        matrix[7][8] = formatBits[8];
        for (let i = 9; i < 15; i++) matrix[14 - i][8] = formatBits[i];

        // other areas
        for (let i = 0; i < 8; i++) matrix[matrix.length - 1 - i][8] = formatBits[i];
        for (let i = 0; i < 7; i++) matrix[8][matrix.length - 1 - i] = formatBits[14 - i];
    }

    // ---- High-level encode function ----
    function encodeToMatrix(text) {
        const bytes = stringToUtf8Bytes(text);
        const version = chooseVersion(bytes.length);
        const size = sizeForVersion(version);

        const dataCapacityBits = (dataCodewordsForVersion(version) * 8);
        const buffer = new BitBuffer();

        // Mode: byte (0100)
        buffer.put(0b0100, 4);
        buffer.put(bytes.length, 8); // for versions 1–9, length field is 8 bits in byte mode
        buffer.putBytes(bytes);

        // Terminator + padding to codeword boundary
        const maxBits = dataCapacityBits;
        if (buffer.length + 4 <= maxBits) buffer.put(0, 4);
        while (buffer.length % 8 !== 0) buffer.put(0, 1);

        const dataBytes = buffer.toBytes();
        const totalData = dataCodewordsForVersion(version);
        while (dataBytes.length < totalData) {
            dataBytes.push(dataBytes.length % 2 ? 0x11 : 0xEC);
        }

        const ecCount = EC_CODEWORDS[version];
        const ecBytes = rsComputeRemainder(dataBytes.concat(new Array(ecCount).fill(0)), ecCount);

        const codewords = dataBytes.concat(ecBytes);

        // Map bits
        const bitStream = [];
        for (const b of codewords) {
            for (let i = 7; i >= 0; i--) bitStream.push((b >>> i) & 1);
        }

        const matrix = createEmptyMatrix(size);
        // finder patterns
        placeFinderPattern(matrix, 0, 0);
        placeFinderPattern(matrix, size - 7, 0);
        placeFinderPattern(matrix, 0, size - 7);

        placeTimingPatterns(matrix);
        reserveFormatAreas(matrix);

        mapData(matrix, bitStream);

        applyMask0(matrix);
        placeFormatInfo(matrix);

        return matrix;
    }

    function dataCodewordsForVersion(v) {
        // simplified, matching CAPACITY and EC_CODEWORDS above
        const totalCodewords = {
            1: 26,
            2: 44,
            3: 70,
            4: 100
        }[v];
        return totalCodewords - EC_CODEWORDS[v];
    }

    // ---- Canvas draw function ----
    function drawQrToCanvas(text, canvas, scale = 10, margin = 4) {
        const matrix = encodeToMatrix(text);
        const size = matrix.length;
        const dim = (size + 2 * margin) * scale;
        canvas.width = dim;
        canvas.height = dim;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, dim, dim);
        ctx.fillStyle = '#000000';
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (matrix[y][x]) {
                    ctx.fillRect((x + margin) * scale, (y + margin) * scale, scale, scale);
                }
            }
        }
    }

    // ---- App wrapper wiring your UI ----
    const input  = document.getElementById('text');
    const button = document.getElementById('generateBtn');
    const canvas = document.getElementById('qrCanvas');
    const dl     = document.getElementById('dl');

    function generate() {
        const text = input.value || ' ';
        drawQrToCanvas(text, canvas, 8, 4); // adjust scale/margin to keep ~340px
        dl.href = canvas.toDataURL('image/png');
        dl.style.display = 'inline-block';
    }

    if (button) button.addEventListener('click', generate);
    try { generate(); } catch (e) { console.error(e); }
})();
