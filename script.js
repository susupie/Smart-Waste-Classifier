const URL_PATH = "model/";

let model, webcam, maxPredictions;
let isWebcamActive = false;
let animationId = null;

async function loadModel() {
    const modelURL = URL_PATH + "model.json";
    const metadataURL = URL_PATH + "metadata.json";

    try {
        document.getElementById("result").innerText = "Loading Model... Please wait.";
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        document.getElementById("result").innerText = "Model Loaded! Ready to classify.";
    } catch (e) {
        document.getElementById("result").innerText = "Error: Could not load model. Check paths/CORS.";
        console.error(e);
    }
}

loadModel();

async function initWebcam() {
    if (isWebcamActive) {
        alert("Webcam is already running! Stop it first.");
        return;
    }

    const flip = true;
    webcam = new tmImage.Webcam(300, 300, flip);
    await webcam.setup();
    await webcam.play();

    const container = document.getElementById("webcam-container");
    container.innerHTML = "";
    container.appendChild(webcam.canvas);

    isWebcamActive = true;
    document.querySelector(".btn-stop").classList.add("active");

    loop();
}

function stopWebcam() {
    if (!isWebcamActive || !webcam) {
        return;
    }

    webcam.stop();
    isWebcamActive = false;
    document.getElementById("webcam-container").innerHTML = "";
    document.querySelector(".btn-stop").classList.remove("active");
    document.getElementById("result").innerText = "Webcam stopped.";

    if (animationId) {
        cancelAnimationFrame(animationId);
    }
}

async function loop() {
    if (!isWebcamActive) return;

    webcam.update();
    await predict();
    animationId = window.requestAnimationFrame(loop);
}

async function predict() {
    const prediction = await model.predict(webcam.canvas);
    showResult(prediction);
}

async function predictUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function() {
        const img = new Image();
        img.src = reader.result;
        img.onload = async function() {
            const preview = document.getElementById("image-preview");
            preview.innerHTML = "";
            preview.appendChild(img);
            preview.classList.add("has-image");
            document.querySelector(".btn-remove-photo").classList.add("active");

            const prediction = await model.predict(img);
            showResult(prediction);
        };
    };
    reader.readAsDataURL(file);
}

function removePhoto() {
    const preview = document.getElementById("image-preview");
    preview.innerHTML = '<span class="preview-placeholder">Upload a photo to preview it here.</span>';
    preview.classList.remove("has-image");
    document.getElementById("upload").value = "";
    document.querySelector(".btn-remove-photo").classList.remove("active");
    document.getElementById("result").innerHTML = "No image selected. Choose a photo or use the webcam.";
    document.getElementById("result").className = "";
}

function showResult(prediction) {
    let highest = prediction.reduce((a, b) => a.probability > b.probability ? a : b);
    const resultElement = document.getElementById("result");

    if (highest.probability > 0.5) {
        resultElement.innerHTML = `<div><strong>Predicted:</strong><br>${highest.className}<br><strong>Confidence:</strong> ${(highest.probability * 100).toFixed(1)}%</div>`;
        resultElement.className = "success";
    } else {
        resultElement.innerHTML = `<div style="color: #666;"><i class="bi bi-hourglass-split" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>Analyzing...</div>`;
        resultElement.className = "scanning";
    }
}