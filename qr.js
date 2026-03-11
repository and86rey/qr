// ===== BEGIN: qrcode.min.js (MIT, davidshimjs/qrcodejs) =====
// Copy the entire contents of qrcode.min.js from:
// https://github.com/davidshimjs/qrcodejs/blob/master/qrcode.min.js
// Paste it here, replacing THIS comment.
// After pasting, `QRCode` and `QRCode.CorrectLevel` will be available globally.
// ===== END: qrcode.min.js =====


// ===== BEGIN: App wrapper for your MVP =====
(function () {
    const input  = document.getElementById('text');
    const button = document.getElementById('generateBtn');
    const canvas = document.getElementById('qrCanvas');
    const dl     = document.getElementById('dl');

    const SIZE   = 340; // final PNG size

    function generate() {
        const text = input.value || ' ';

        // Temporary container for qrcode.js
        const tmp = document.createElement('div');

        // Create QR into a hidden div using qrcode.js API
        const qr = new QRCode(tmp, {
            text: text,
            width: SIZE,
            height: SIZE,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        // qrcode.js will create a canvas or img element inside tmp
        const innerCanvas = tmp.querySelector('canvas');
        const innerImg    = tmp.querySelector('img');

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, SIZE, SIZE);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, SIZE, SIZE);

        if (innerCanvas) {
            ctx.drawImage(innerCanvas, 0, 0, SIZE, SIZE);
            updateDownload();
        } else if (innerImg) {
            innerImg.onload = function () {
                ctx.drawImage(innerImg, 0, 0, SIZE, SIZE);
                updateDownload();
            };
        }
    }

    function updateDownload() {
        dl.href = canvas.toDataURL("image/png");
        dl.style.display = "inline-block";
    }

    if (button) {
        button.addEventListener('click', generate);
    }

    // Initial QR for default URL
    try {
        generate();
    } catch (e) {
        console.warn('QRCode library not loaded correctly:', e);
    }
})();
// ===== END: App wrapper =====
