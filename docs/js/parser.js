// const DEBUG = localStorage.getItem('debug') === 'true' || new URLSearchParams(window.location.search).get('debug') === 'true';
const DEBUG = false;
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
async function handleFileSelection(files) {
    if (files.length > 0) {
        console.log('Handling file selection');
        // document.body.classList.toggle('dark-theme');
        document.getElementById('parser').style.display = 'block';
        document.getElementById('sudoku-board').style.display = 'none';
        document.getElementById('processedImageContainer').style.display = 'flex';
        document.getElementsByClassName('processingMessage')[0].style.display = 'block';
        document.getElementsByClassName('upload-btn')[0].style.display = 'none';
        document.getElementById('cropping-actions').style.display = 'block';
        document.getElementById('tutorial-popup').style.display = 'none';
        document.getElementById('input-board').style.display = 'none';
        document.getElementsByClassName('solve-button')[0].style.display = 'none';
        await initiateCropping(files[0]);
    }
}

function resetUI() {
    document.getElementById('parser').style.display = 'none';
    document.getElementsByClassName('upload-btn')[0].style.display = 'inline-block';
    document.getElementById('cropping-actions').style.display = 'none';
    document.getElementById('sudoku-board').style.display = 'grid';
    document.getElementById('processedImageContainer').style.display = 'none';
    document.getElementById('input-board').style.display = 'block';
    document.getElementsByClassName('solve-button')[0].style.display = 'block';
    // document.body.classList.remove('dark-theme');
}

let cropper;
function initiateCropping(file) {

    console.log('Initiating cropping');
    return new Promise((resolve, reject) => {
        if (!file) {
            alert("Please upload an image first.");
            reject(new Error("No file uploaded."));
            return;
        }

        let reader = new FileReader();
        reader.onload = function (event) {
            const img = new Image();
            img.onload = function () {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                cropper = new Cropper(canvas, {
                    aspectRatio: 1,
                    viewMode: 1,
                    autoCropArea: 0.98,
                    movable: true,
                    zoomable: true,
                    rotatable: true,
                    scalable: true,
                    data: {
                        width: canvas.width * 0.98,
                        height: canvas.height * 0.98,
                        x: canvas.width * 0.01,
                        y: canvas.height * 0.01,
                    },
                    ready: function () {
                        updateGridLines();
                    },
                    cropmove: function () {
                        updateGridLines();
                    },
                    cropend: function () {
                        updateGridLines();
                    }
                });

                document.getElementById('confirmCrop').style.display = 'inline';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}


function updateGridLines() {
    const cropBox = document.querySelector('#parser > div.cropper-container.cropper-bg > div.cropper-crop-box > span.cropper-face.cropper-move');
    if (!cropBox) return;

    const numLines = 9; // Adjust the number of grid lines here
    const gridStyle = `
#parser > div.cropper-container.cropper-bg > div.cropper-crop-box::before {
    content: '';
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-size: ${100 / numLines}% ${100 / numLines}%;
    background-position: center;
    background-image: linear-gradient(to right, red 1px, transparent 1px), linear-gradient(to bottom, red 1px, transparent 1px);
    pointer-events: none;
    z-index: 1;
}
    `;

    let styleTag = document.getElementById('cropperGridLinesStyle');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'cropperGridLinesStyle';
        document.head.appendChild(styleTag);
    }

    styleTag.innerHTML = gridStyle;
}

document.getElementById('confirmCrop').addEventListener('click', async function () {
    console.log('Confirming crop');
    if (DEBUG) {
    document.getElementById('sudoku-board').style.display = 'none';
    }
    else {
        document.getElementById('sudoku-board').style.display = 'grid';
        document.getElementById('parser').style.display = 'none';
    }
    if (cropper) {
        let croppedCanvas = cropper.getCroppedCanvas();
        if (!croppedCanvas) {
            // Perform your reset actions here
            croppedCanvas = document.createElement('canvas');
            // You can also set default properties for the new canvas if necessary
        }

        const croppedImageDataURL = croppedCanvas ? croppedCanvas.toDataURL() : '';
        const croppedImg = new Image();
        croppedImg.onload = async function () {
            canvas.width = croppedImg.width;
            canvas.height = croppedImg.height;
            ctx.drawImage(croppedImg, 0, 0);
            // Draw white lines over where the red marks were
            // Adjust the logic based on your grid
            const numLines = 9; // Number of grid lines, adjust based on your grid
            const lineWidth = 10; // Width of the grid lines
            const segmentWidth = canvas.width / numLines;
            const segmentHeight = canvas.height / numLines;

            ctx.fillStyle = 'white'

            for (let i = 1; i < numLines; i++) {
                // Draw over vertical lines
                ctx.fillRect(segmentWidth * i - lineWidth / 2, 0, lineWidth, canvas.height);
                // Draw over horizontal lines
                ctx.fillRect(0, segmentHeight * i - lineWidth / 2, canvas.width, lineWidth);
            }

            // Continue with the rest of the processing
            await processImage(canvas.toDataURL());
            const boardStr = await extractSudokuBoard(ctx, canvas.width, canvas.height, progressCallback);

            resetUI();
        };
        croppedImg.src = croppedImageDataURL;
        document.getElementById('confirmCrop').style.display = 'none';
    }
});
function processImage(src) {
    return new Promise((resolve, reject) => {
        if (!src) {
            alert("Please upload an image first.");
            reject(new Error("No image source provided."));
            return;
        }
        // make black and white and extream contrast (black and white)


        const img = new Image();
        img.onload = function () {
            const MAX_WIDTH = 540;
            let targetWidth = img.width;
            let targetHeight = img.height;
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            // Binarize and enhance the image

            let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            imageData = binarizeImage(imageData);

            ctx.putImageData(imageData, 0, 0);

            const processedImageSrc = canvas.toDataURL();
            resolve(processedImageSrc);
        };
        img.onerror = function (err) {
            reject(new Error("Failed to load image: " + err.message));
        };
        img.src = src;
    });
}

function binarizeImage(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const avg = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11; // Grayscale
        const binarized = avg <= 150 ? 0 : 255;
        data[i] = binarized;
        data[i + 1] = binarized;
        data[i + 2] = binarized;
    }
    return imageData;
}


function setupWebWorkers(numWorkers) {
    const workers = [];
    for (let i = 0; i < numWorkers; i++) {
        let scriptUrl = '/AlphaSudokuGo/worker.js';
        if (location.hostname === 'localhost') {
            scriptUrl = '/worker.js';
        }
        const worker = new Worker(scriptUrl);
        workers.push({ worker: worker, busy: false });
    }
    return workers;
}
async function extractSudokuBoard(ctx, width, height, progressCallback) {
// Ensure DEBUG is defined

console.log('Extracting Sudoku board');
const cellWidth = Math.floor(width / 9);
const cellHeight = Math.floor(height / 9);
console.log('Cell width:', cellWidth, 'Cell height:', cellHeight);
let boardStr = Array(81).fill('.'); // Initialize board string with placeholders
const tasks = [];
const centerRegionSize = 0.5; // Sample the central 50% of the cell
for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
        const offsetX = (cellWidth * (1 - centerRegionSize)) / 2;
        const offsetY = (cellHeight * (1 - centerRegionSize)) / 2;
        const centerWidth = cellWidth * centerRegionSize;
        const centerHeight = cellHeight * centerRegionSize;

        const centerImageData = ctx.getImageData(col * cellWidth + offsetX, row * cellHeight + offsetY, centerWidth, centerHeight).data;

        let isEmpty = true;
        // Loop through each pixel's color data (RGBA)
        for (let i = 0; i < centerImageData.length; i += 4) {
            // Assuming an "empty" cell is white or transparent
            if (!(centerImageData[i] === 255 && centerImageData[i + 1] === 255 && centerImageData[i + 2] === 255) && centerImageData[i + 3] !== 0) {
                isEmpty = false;
                if (DEBUG) {
                    console.log('Non-empty cell found at:', row, col);
                    ctx.fillStyle = 'green';
                    ctx.fillRect(col * cellWidth + offsetX, row * cellHeight + offsetY, centerWidth, centerHeight);
                }
                break;
            }
        }
 if (!isEmpty) {
                const cellImageData = ctx.getImageData(col * cellWidth, row * cellHeight, cellWidth, cellHeight).data;
                tasks.push({ width: cellWidth, height: cellHeight, imageData: cellImageData, row, col });
            }
        }
    }

    if (DEBUG) {

        tasks.forEach(task => {
            // Set border color
            ctx.strokeStyle = 'red';
            // Set fill color with some transparency
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';

            // Fill the task area with color
            ctx.fillRect(task.col * cellWidth, task.row * cellHeight, task.width, task.height);
            // Draw the border around the task area
            ctx.strokeRect(task.col * cellWidth, task.row * cellHeight, task.width, task.height);

            console.log('Task:', task);
        });
    }
    if (tasks.length === 0) {
        console.log('No tasks to process.');
        return boardStr.join(''); // Return the initial board string if no tasks are created
    }
    // make the canvas visible
    if (DEBUG) {
    document.getElementById('sudoku-board').style.display = 'none';
    document.getElementById('parser').style.display = 'flex';

    // wait for user to see the tasks areas and proceed after 5 seconds
    await new Promise(resolve => setTimeout(resolve, 500000));
    // hide the sudoku board
    }



    const numWorkers = Math.min(tasks.length, navigator.hardwareConcurrency) || 1;
    const workers = setupWebWorkers(numWorkers);

    const getAvailableWorker = () => workers.find(worker => !worker.busy);

    let completedTasks = 0;
    const totalTasks = tasks.length;

    await Promise.all(tasks.map(task => new Promise(resolve => {
        const attemptToProcessTask = () => {
            const workerInfo = getAvailableWorker();
            if (workerInfo) {
                workerInfo.busy = true;
                workerInfo.worker.postMessage(task);
                workerInfo.worker.onmessage = (e) => {
                    boardStr[task.row * 9 + task.col] = e.data.result;
                    updateBoard(boardStr.join(''));
                    workerInfo.busy = false;
                    completedTasks++;
                    if (progressCallback) {
                        const progressPercent = (completedTasks / totalTasks) * 100;
                        progressCallback(progressPercent);
                        console.log(`Progress: ${progressPercent}%`);
                    }
                    resolve();
                    if (completedTasks === totalTasks) {
                        console.log('All tasks completed');
                        resetUI();
                        solveSudoku();
                        document.getElementsByClassName('solve-button')[0].style.fill = 'green';
                        workers.forEach(worker => worker.worker.terminate());
                        if (typeof cropper !== 'undefined') {
                            cropper.destroy();
                        }
                    }
                };
            } else {
                setTimeout(attemptToProcessTask, 100);
            }
        };
        attemptToProcessTask();
    })));

    return boardStr.join('');
}



async function progressCallback(progress) {
    document.querySelector('.processingMessage').textContent = `Extraction progress: ${progress.toFixed(2)}%`;
}
function readBoard() {
    const inputBoard = document.getElementById('input-board');

    return inputBoard.value.trim();
}