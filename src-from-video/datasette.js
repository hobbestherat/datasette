let samplingInterval = 0;
const millis = 1 / 1000;
const micros = millis / 1000;
const S = 1;
const M = 2;
const L = 3;
const PAL_S = 272.4 * micros;
const PAL_M = 408 * micros;
const PAL_L = 697.6 * micros;
async function loadAudio(url) {
    const response = await fetch(url);
    const fileBytes = await response.arrayBuffer();
    const audiContext = new AudioContext();
    const audioBuffer = await audiContext.decodeAudioData(fileBytes);
    samplingInterval = 1 / audioBuffer.sampleRate;
    const samples = audioBuffer.getChannelData(0);
    return samples;
}
function drawBuffer(data, offset) {
    let canvas = document.getElementById('canvas');
    let context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    let m = canvas.height / 2;
    context.beginPath();
    context.moveTo(0, m);
    for (let i = 0; i < canvas.width; i++) {
        context.lineTo(i, m + m * data[offset + i]);
        if (Math.sign(data[offset + i]) >= 0 && (Math.sign(data[offset + i]) !== Math.sign(data[offset + i + 1]))) {
            context.fillRect(i, m, 2, 5);
        }
    }
    context.stroke();
}
function samplesToHighLowIntervals(data, sampleInterval) {
    let last = 0;
    let current = 0;
    let intervals = [];
    for (let i = 0; i < data.length - 1; i++) {
        current += sampleInterval;
        if (Math.sign(data[i]) >= 0 && (Math.sign(data[i]) !== Math.sign(data[i + 1]))) {
            intervals.push(current - last);
            last = current;
        }
    }
    return intervals;
}
function classify(intervals) {
    let classified = [];
    const srange = [100 * micros, (PAL_S + PAL_M) / 2];
    const mrange = [(PAL_S + PAL_M) / 2, (PAL_M + PAL_L) / 2];
    const lrange = [(PAL_M + PAL_L) / 2, 900 * micros];
    function inRange(range, value) {
        return value >= range[0] && value < range[1];
    }
    for (const interval of intervals) {
        if (inRange(srange, interval)) {
            classified.push(S);
        }
        else if (inRange(mrange, interval)) {
            classified.push(M);
        }
        else if (inRange(lrange, interval)) {
            classified.push(L);
        }
    }
    return classified;
}
function decode(classified) {
    let i = 0;
    let parityError = 0;
    let result = [];
    function getBit() {
        let a = classified[i];
        i++;
        let b = classified[i];
        i++;
        if (a == S && b == M) {
            return 0;
        }
        if (a == M && b == S) {
            return 1;
        }
        //error
        return 0;
    }
    while (i < classified.length - 1) {
        if (classified[i] == L && classified[i + 1] == M) {
            i += 2;
            // read a byte
            let byte = 0;
            let parity = 1;
            for (let j = 0; j < 8; j++) {
                const bit = getBit();
                byte += (1 << j) * bit;
                parity = parity ^ bit;
            }
            if (parity == getBit()) {
                result.push(byte);
            }
            else {
                parityError++;
            }
        }
        else {
            i++;
        }
    }
    return result;
}
let offset = 0;
const samples = await loadAudio('tape.wav');
let intervals = samplesToHighLowIntervals(samples, samplingInterval);
function calcHistogram(data, min, max, bucketSize) {
    let histogram = new Array(Math.floor((max - min) / bucketSize + 1)).fill(0);
    for (const sample of data) {
        if (sample < min)
            continue;
        if (sample > max)
            continue;
        histogram[Math.floor((sample - min) / bucketSize)]++;
    }
    return histogram;
}
let histogram = calcHistogram(intervals, 0, 800 * micros, samplingInterval);
console.log(samplingInterval);
console.log(histogram.map((x, index) => '' + (index * samplingInterval / micros).toFixed(2) + '=>' + x));
let classified = classify(intervals);
let decoded = decode(classified);
console.log(decoded.filter(x => x >= 32 && x < 128).map(x => String.fromCharCode(x)).join(''));
drawBuffer(samples, 0);
let nextButton = document.getElementById('next');
nextButton.onclick = () => {
    offset += 1000;
    drawBuffer(samples, offset);
};
let prevButton = document.getElementById('prev');
prevButton.onclick = () => {
    offset -= 1000;
    drawBuffer(samples, offset);
};
export {};
//# sourceMappingURL=datasette.js.map
