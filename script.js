/**
 * Graphing Engine
 */
class Graph {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.container = this.canvas.parentElement;

        // Viewport boundaries
        this.xMin = -10;
        this.xMax = 10;
        this.yMin = -10;
        this.yMax = 10;

        // Panning State
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // Resize handling
        window.addEventListener('resize', () => this.resize());
        setTimeout(() => this.resize(), 0);

        // Interaction
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        // Zooming
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

        // Panning / Dragging
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrag());
        this.canvas.addEventListener('mouseleave', () => this.stopDrag());
    }

    resize() {
        if (!this.container) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.draw();
    }

    setAxes(xMin, xMax, yMin, yMax) {
        this.xMin = parseFloat(xMin);
        this.xMax = parseFloat(xMax);
        this.yMin = parseFloat(yMin);
        this.yMax = parseFloat(yMax);
        this.draw();
    }

    // Coordinate Transforms
    mapX(x) {
        return (x - this.xMin) / (this.xMax - this.xMin) * this.canvas.width;
    }

    mapY(y) {
        return this.canvas.height - (y - this.yMin) / (this.yMax - this.yMin) * this.canvas.height;
    }

    invMapX(pixelX) {
        return this.xMin + (pixelX / this.canvas.width) * (this.xMax - this.xMin);
    }

    invMapY(pixelY) {
        return this.yMax - (pixelY / this.canvas.height) * (this.yMax - this.yMin);
    }

    drawArrow(fromX, fromY, toX, toY) {
        const headlen = 10;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx);
        this.ctx.moveTo(fromX, fromY);
        this.ctx.lineTo(toX, toY);
        this.ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        this.ctx.moveTo(toX, toY);
        this.ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    }

    drawGrid() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid Lines
        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = 1;

        const xRange = this.xMax - this.xMin;
        const yRange = this.yMax - this.yMin;

        let xStep = 1;
        while ((this.canvas.width / (xRange / xStep)) < 40) xStep *= 2;

        let yStep = 1;
        while ((this.canvas.height / (yRange / yStep)) < 40) yStep *= 2;

        this.ctx.beginPath();

        let startX = Math.floor(this.xMin / xStep) * xStep;
        for (let x = startX; x <= this.xMax; x += xStep) {
            const px = this.mapX(x);
            this.ctx.moveTo(px, 0);
            this.ctx.lineTo(px, this.canvas.height);
        }

        let startY = Math.floor(this.yMin / yStep) * yStep;
        for (let y = startY; y <= this.yMax; y += yStep) {
            const py = this.mapY(y);
            this.ctx.moveTo(0, py);
            this.ctx.lineTo(this.canvas.width, py);
        }
        this.ctx.stroke();

        // Axes (Darker)
        this.ctx.strokeStyle = '#64748b';
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = '#64748b';
        this.ctx.font = '10px sans-serif';
        this.ctx.beginPath();

        let yAxisX = null;
        if (this.xMin <= 0 && this.xMax >= 0) {
            yAxisX = this.mapX(0);
            this.ctx.moveTo(yAxisX, this.canvas.height);
            this.drawArrow(yAxisX, this.canvas.height, yAxisX, 0);
        }

        let xAxisY = null;
        if (this.yMin <= 0 && this.yMax >= 0) {
            xAxisY = this.mapY(0);
            this.ctx.moveTo(0, xAxisY);
            this.drawArrow(0, xAxisY, this.canvas.width, xAxisY);
        }
        this.ctx.stroke();

        // Draw Labels
        this.ctx.fillStyle = '#475569';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';

        for (let x = startX; x <= this.xMax; x += xStep) {
            if (Math.abs(x) < 0.0001) continue;
            const px = this.mapX(x);
            const py = xAxisY !== null ? xAxisY + 5 : this.canvas.height - 15;
            this.ctx.fillText(x.toString(), px, py);
        }

        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'middle';
        for (let y = startY; y <= this.yMax; y += yStep) {
            if (Math.abs(y) < 0.0001) continue;
            const py = this.mapY(y);
            const px = yAxisX !== null ? yAxisX - 5 : 25;
            this.ctx.fillText(y.toString(), px, py);
        }

        if (xAxisY !== null && yAxisX !== null) {
            this.ctx.fillText('0', yAxisX - 5, xAxisY + 5);
        }
    }

    drawFunction(func, color = '#6366f1') {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();

        let started = false;

        for (let px = 0; px <= this.canvas.width; px++) {
            const x = this.invMapX(px);
            const y = func(x);

            const py = this.mapY(y);

            if (Number.isFinite(py) && Math.abs(py) < this.canvas.height * 2) {
                if (!started) {
                    this.ctx.moveTo(px, py);
                    started = true;
                } else {
                    this.ctx.lineTo(px, py);
                }
            } else {
                started = false;
            }
        }
        this.ctx.stroke();
    }

    drawPoints(points) {
        this.ctx.fillStyle = '#22c55e';
        for (let p of points) {
            const px = this.mapX(p.x);
            const py = this.mapY(p.y);
            if (px >= -10 && px <= this.canvas.width + 10 && py >= -10 && py <= this.canvas.height + 10) {
                this.ctx.beginPath();
                this.ctx.arc(px, py, 5, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    draw() {
        if (!this.ctx) return;
        this.drawGrid();

        if (window.app && window.app.currentFunction) {
            if (window.app.showCurve) {
                this.drawFunction(window.app.currentFunction);
            }
        }

        if (window.app && window.app.pointsToDraw.length > 0) {
            this.drawPoints(window.app.pointsToDraw);
        }
    }

    handleMouseDown(e) {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.canvas.style.cursor = 'grabbing';
    }

    stopDrag() {
        this.isDragging = false;
        this.canvas.style.cursor = 'crosshair';
    }

    handleMouseMove(e) {
        // Handle Dragging / Panning
        if (this.isDragging) {
            const dxPixels = e.clientX - this.lastMouseX;
            const dyPixels = e.clientY - this.lastMouseY;

            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;

            // Convert pixels to units
            const xRange = this.xMax - this.xMin;
            const yRange = this.yMax - this.yMin;

            const dxUnits = (dxPixels / this.canvas.width) * xRange;
            const dyUnits = (dyPixels / this.canvas.height) * yRange;

            this.xMin -= dxUnits;
            this.xMax -= dxUnits;

            this.yMin += dyUnits;
            this.yMax += dyUnits;

            if (window.app) {
                window.app.syncAxesInputs(this.xMin, this.xMax, this.yMin, this.yMax);
            }
            this.draw();
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;

        const x = this.invMapX(px);
        const y = this.invMapY(py);

        const coordsDisplay = document.getElementById('coords-display');
        if (coordsDisplay) {
            coordsDisplay.innerText = `x: ${x.toFixed(2)}, y: ${y.toFixed(2)}`;
        }

        if (window.app && window.app.currentFunction && window.app.showCurve) {
            const curveY = window.app.currentFunction(x);

            if (Math.abs(y - curveY) < (this.yMax - this.yMin) * 0.05) {
                this.draw();

                const cPx = px;
                const cPy = this.mapY(curveY);

                this.ctx.save();
                this.ctx.fillStyle = '#cc00cc';
                this.ctx.beginPath();
                this.ctx.arc(cPx, cPy, 6, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.font = '12px sans-serif';
                this.ctx.fillStyle = '#cc00cc';
                this.ctx.fillText(`(${x.toFixed(2)}, ${curveY.toFixed(2)})`, cPx + 10, cPy - 10);
                this.ctx.restore();
            } else {
                this.draw();
            }
        }
    }

    handleWheel(e) {
        e.preventDefault();
        const zoomFactor = 1.1;
        const direction = e.deltaY > 0 ? 1 : -1;

        let rangeX = this.xMax - this.xMin;
        let rangeY = this.yMax - this.yMin;

        if (direction === 1) {
            rangeX *= zoomFactor;
            rangeY *= zoomFactor;
        } else {
            rangeX /= zoomFactor;
            rangeY /= zoomFactor;
        }

        const centerX = (this.xMax + this.xMin) / 2;
        const centerY = (this.yMax + this.yMin) / 2;

        this.xMin = centerX - rangeX / 2;
        this.xMax = centerX + rangeX / 2;
        this.yMin = centerY - rangeY / 2;
        this.yMax = centerY + rangeY / 2;

        if (window.app) {
            window.app.syncAxesInputs(this.xMin, this.xMax, this.yMin, this.yMax);
        }

        this.draw();
    }
}

/**
 * Application Logic
 */
class App {
    constructor() {
        this.graph = new Graph('graph-canvas');

        // State
        this.a = 1;
        this.b = 0;
        this.c = 0;
        this.d = 0;
        this.e = 0;

        this.pointsToDraw = [];
        this.showCurve = false;

        this.currentFunction = null;

        // Initialize
        this.initializeEventListeners();
        this.updateAxes();
        this.updateFunction(); // Parse initial function
        this.generateTable(); // Generate initial table
    }

    initializeEventListeners() {
        // Button Listeners
        const btnUpdate = document.getElementById('btn-update-axes');
        if (btnUpdate) btnUpdate.addEventListener('click', () => this.updateAxes());

        const btnGen = document.getElementById('btn-gen-table');
        if (btnGen) btnGen.addEventListener('click', () => {
            this.updateFunction(); // Parse before generating
            this.generateTable();
        });

        const btnTrace = document.getElementById('btn-trace');
        if (btnTrace) btnTrace.addEventListener('click', () => this.tracePoints());

        // Input Listeners for Auto-Update
        const inputs = ['coeff-a', 'coeff-b', 'coeff-c', 'coeff-d', 'coeff-e', 'function-input'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => {
                    this.updateFunction();
                });
            }
        });
    }

    syncAxesInputs(xMin, xMax, yMin, yMax) {
        const elXMin = document.getElementById('x-min');
        const elXMax = document.getElementById('x-max');
        const elYMin = document.getElementById('y-min');
        const elYMax = document.getElementById('y-max');

        if (elXMin) elXMin.value = Math.round(xMin * 100) / 100;
        if (elXMax) elXMax.value = Math.round(xMax * 100) / 100;
        if (elYMin) elYMin.value = Math.round(yMin * 100) / 100;
        if (elYMax) elYMax.value = Math.round(yMax * 100) / 100;
    }

    updateAxes() {
        const xMin = document.getElementById('x-min').value;
        const xMax = document.getElementById('x-max').value;
        const yMin = document.getElementById('y-min').value;
        const yMax = document.getElementById('y-max').value;
        this.graph.setAxes(xMin, xMax, yMin, yMax);
    }

    updateFunction() {
        // Read Coefficients
        this.a = parseFloat(document.getElementById('coeff-a').value) || 0;
        this.b = parseFloat(document.getElementById('coeff-b').value) || 0;
        this.c = parseFloat(document.getElementById('coeff-c').value) || 0;
        this.d = parseFloat(document.getElementById('coeff-d').value) || 0;
        this.e = parseFloat(document.getElementById('coeff-e').value) || 0;

        // Read Function String
        let funcStr = document.getElementById('function-input').value;

        // Simple sanitization / preparation
        // Replace '^' with '**' for powers
        funcStr = funcStr.replace(/\^/g, '**');

        try {
            const body = `
                const sin = Math.sin; const cos = Math.cos; const tan = Math.tan;
                const abs = Math.abs; const sqrt = Math.sqrt; const log = Math.log;
                const PI = Math.PI; const E = Math.E;
                return ${funcStr};
            `;

            const generatedFunc = new Function('x', 'a', 'b', 'c', 'd', 'e', body);

            // Test it
            generatedFunc(0, this.a, this.b, this.c, this.d, this.e);

            // If success, set it
            this.currentFunction = (x) => {
                try {
                    return generatedFunc(x, this.a, this.b, this.c, this.d, this.e);
                } catch (e) {
                    return NaN;
                }
            };

            // Clear error style
            document.getElementById('function-input').style.borderColor = '';

            // Redraw if needed (e.g. if tracing was on)
            this.showCurve = false;
            this.graph.draw();

        } catch (err) {
            console.error("Invalid function", err);
            // Mark input as invalid
            document.getElementById('function-input').style.borderColor = 'red';
            this.currentFunction = null;
        }
    }

    generateTable() {
        if (!this.currentFunction) return;

        const tableBody = document.querySelector('#values-table tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';
        this.pointsToDraw = [];
        this.showCurve = false;
        this.graph.draw();

        // Step size determination
        const xMin = parseFloat(document.getElementById('x-min').value);
        const xMax = parseFloat(document.getElementById('x-max').value);

        let range = xMax - xMin;
        let step = Math.round(range / 8);
        if (step < 1) step = 1;

        let start = Math.ceil(xMin);

        for (let x = start; x <= xMax; x += step) {
            const trueY = this.currentFunction(x);

            const row = document.createElement('tr');

            const cellX = document.createElement('td');
            cellX.textContent = x;

            const cellY = document.createElement('td');

            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'table-input';
            input.dataset.x = x;
            input.dataset.trueY = trueY;

            if (isNaN(trueY)) {
                input.placeholder = "Undef";
                input.disabled = true;
            } else {
                input.addEventListener('input', (e) => this.validateInput(e.target));
            }

            cellY.appendChild(input);
            row.appendChild(cellX);
            row.appendChild(cellY);
            tableBody.appendChild(row);
        }
    }

    validateInput(inputElement) {
        const entered = parseFloat(inputElement.value);
        const correct = parseFloat(inputElement.dataset.trueY);

        if (isNaN(entered)) {
            inputElement.classList.remove('correct', 'incorrect');
            return;
        }

        // Allow some tolerance
        if (Math.abs(entered - correct) < 0.05) {
            inputElement.classList.add('correct');
            inputElement.classList.remove('incorrect');

            const x = parseFloat(inputElement.dataset.x);
            const y = correct;

            if (!this.pointsToDraw.find(p => p.x === x)) {
                this.pointsToDraw.push({ x, y });

                this.checkAndScale(x, y);

                this.graph.draw();
            }
        } else {
            inputElement.classList.add('incorrect');
            inputElement.classList.remove('correct');
        }
    }

    checkAndScale(x, y) {
        let changed = false;
        const padding = 2;

        if (x < this.graph.xMin) {
            this.graph.xMin = x - padding;
            changed = true;
        }
        if (x > this.graph.xMax) {
            this.graph.xMax = x + padding;
            changed = true;
        }
        if (y < this.graph.yMin) {
            this.graph.yMin = y - padding;
            changed = true;
        }
        if (y > this.graph.yMax) {
            this.graph.yMax = y + padding;
            changed = true;
        }

        if (changed) {
            this.syncAxesInputs(this.graph.xMin, this.graph.xMax, this.graph.yMin, this.graph.yMax);
        }
    }

    tracePoints() {
        if (!this.currentFunction) return;
        this.showCurve = true;
        this.graph.draw();
    }
}

// Global instance
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
