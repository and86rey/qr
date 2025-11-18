<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QR Code for CV – Offline</title>
  <script src="qr.js"></script>
  <style>
    body {font-family:Calibri,Arial,sans-serif; text-align:center; padding:60px 20px; background:#f8f8f8; line-height:1.6;}
    h1 {font-size:28pt; margin:0 0 15px; font-weight:bold;}
    p {color:#333; margin:15px 0 30px;}
    input {width:90%; max-width:600px; padding:16px; font-size:18px; margin:25px auto; display:block; border:1px solid #ccc; border-radius:6px;}
    button {padding:16px 50px; font-size:18px; background:#000; color:#fff; border:none; border-radius:6px; cursor:pointer;}
    button:hover {background:#333;}
  </style>
</head>
<body>

  <h1>QR Code for CV</h1>
  <p>Paste any link → download exact 80×80 px QR (identical to printed CV)</p>

  <input type="text" id="url" placeholder="https://www.linkedin.com/in/..." autofocus>

  <button onclick="generate()">Generate & Download QR</button>

  <script>
    function generate() {
      let url = document.getElementById("url").value.trim();
      if (!url) return alert("Please paste a link first");
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;

      const div = document.createElement("div");
      div.style.position = "absolute";
      div.style.left = "-9999px";
      document.body.appendChild(div);

      new QRCode(div, {
        text: url,
        width: 80,
        height: 80,
        colorDark: "#000000",
        colorLight: "#FFFFFF",
        correctLevel: QRCode.CorrectLevel.H
      });

      setTimeout(() => {
        const canvas = div.querySelector("canvas");
        canvas.toBlob(blob => {
          const a = document.createElement("a");
          a.download = "qr-cv.png";
          a.href = URL.createObjectURL(blob);
          a.click();
          document.body.removeChild(div);
        }, "image/png");
      }, 200);
    }

    document.getElementById("url").addEventListener("keypress", e => {
      if (e.key === "Enter") generate();
    });
  </script>

</body>
</html>
