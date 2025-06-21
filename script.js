document.getElementById("inputForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const rawInput = document.getElementById("referenceString").value.trim();

  // Validation: only digits separated by spaces allowed
  if (!/^\d+(\s+\d+)*$/.test(rawInput)) {
    alert("Error: Reference string must contain only digits separated by spaces. Example: 7 0 1 2 0 3");
    return; // stop processing if invalid input
  }

  const refStr = rawInput.split(/\s+/).map(Number);
  const frameSize = parseInt(document.getElementById("frameSize").value);
  const output = document.getElementById("outputSection");
  output.innerHTML = ''; // clear previous results

  const allResults = [];

  const fifoResult = simulateFIFO(refStr, frameSize);
  allResults.push({ name: "FIFO", result: fifoResult });

  const lruResult = simulateLRU(refStr, frameSize);
  allResults.push({ name: "LRU", result: lruResult });

  const optResult = simulateOPT(refStr, frameSize);
  allResults.push({ name: "Optimal", result: optResult });

  const lfuResult = simulateLFU(refStr, frameSize);
  allResults.push({ name: "LFU", result: lfuResult });

  const mruResult = simulateMRU(refStr, frameSize);
  allResults.push({ name: "MRU", result: mruResult });

  allResults.forEach(({ name, result }) => {
    displayResults(name, result, refStr);
  });

  displayComparisonTable(allResults);
});

function displayResults(name, result, refStr) {
  const section = document.getElementById("outputSection");
  const total = result.hits + result.misses;
  const hitRatio = result.hits / total;
  const missRatio = result.misses / total;

  const div = document.createElement("div");
  div.innerHTML = `
    <h2>${name}</h2>
    ${generateTableHTML(result.steps, refStr)}
    <p><strong>Hits:</strong> ${result.hits} | <strong>Misses:</strong> ${result.misses}</p>
    <p><strong>Hit Ratio:</strong> ${hitRatio.toFixed(2)} (${(hitRatio * 100).toFixed(2)}%) | 
       <strong>Miss Ratio:</strong> ${missRatio.toFixed(2)} (${(missRatio * 100).toFixed(2)}%)</p>
    <hr>`;
  section.appendChild(div);
}

function displayComparisonTable(allResults) {
  const section = document.getElementById("outputSection");
  const table = document.createElement("table");
  table.style.marginTop = "40px";
  table.style.borderCollapse = "collapse";
  table.style.width = "100%";

  let html = `<thead>
    <tr>
      <th>Algorithm</th>
      <th>Hits</th>
      <th>Misses</th>
      <th>Hit Ratio (%)</th>
      <th>Miss Ratio (%)</th>
    </tr>
  </thead><tbody>`;

  allResults.forEach(({ name, result }) => {
    const total = result.hits + result.misses;
    const hitRatioPct = ((result.hits / total) * 100).toFixed(2);
    const missRatioPct = ((result.misses / total) * 100).toFixed(2);

    html += `<tr>
      <td>${name}</td>
      <td>${result.hits}</td>
      <td>${result.misses}</td>
      <td>${hitRatioPct}</td>
      <td>${missRatioPct}</td>
    </tr>`;
  });

  html += "</tbody>";
  table.innerHTML = html;

  // Style headers and cells
  table.querySelectorAll("th").forEach(th => {
    th.style.padding = "10px";
    th.style.border = "1px solid #00e5ff";
    th.style.backgroundColor = "#003a4d";
    th.style.color = "#00e5ff";
  });
  table.querySelectorAll("td").forEach(td => {
    td.style.padding = "10px";
    td.style.border = "1px solid #00e5ff";
    td.style.textAlign = "center";
    td.style.color = "#b0e7ff";
  });

  const heading = document.createElement("h2");
  heading.textContent = "Final Comparison";
  heading.style.marginTop = "40px";
  heading.style.color = "#00e5ff";
  section.appendChild(heading);
  section.appendChild(table);

  // Summary best algo
  const bestAlgo = getBestAlgorithm(allResults);
  const summary = document.createElement("p");
  summary.style.marginTop = "20px";
  summary.style.fontWeight = "bold";
  summary.style.color = "#00e5ff";
  summary.textContent = `For the given reference string and frame size, the ${bestAlgo} algorithm is the best.`;
  section.appendChild(summary);
}

function getBestAlgorithm(allResults) {
  let best = allResults[0];
  allResults.forEach(ar => {
    const total = ar.result.hits + ar.result.misses;
    const hitRatio = ar.result.hits / total;
    const bestTotal = best.result.hits + best.result.misses;
    const bestHitRatio = best.result.hits / bestTotal;
    if (hitRatio > bestHitRatio) {
      best = ar;
    }
  });
  return best.name;
}

function generateTableHTML(steps, refStr) {
  let html = '<table><tr><th>Step</th>';
  refStr.forEach(val => html += `<th>${val}</th>`);
  html += '</tr>';

  const maxFrame = Math.max(...steps.map(s => s.frames.length));
  for (let i = 0; i < maxFrame; i++) {
    html += `<tr><td>Frame ${i + 1}</td>`;
    steps.forEach(s => {
      html += `<td>${s.frames[i] !== undefined ? s.frames[i] : ''}</td>`;
    });
    html += '</tr>';
  }

  html += '<tr><td>Hit/Miss</td>';
  steps.forEach(s => {
    html += `<td style="color:${s.hit ? 'green' : 'red'}">${s.hit ? 'Hit' : 'Miss'}</td>`;
  });
  html += '</tr></table>';
  return html;
}

// FIFO Algorithm (correct as is)
function simulateFIFO(refStr, frameSize) {
  let frames = [];
  let queue = [];
  let steps = [];
  let hits = 0;

  refStr.forEach(page => {
    let hit = frames.includes(page);
    if (hit) {
      hits++;
    } else {
      if (frames.length < frameSize) {
        frames.push(page);
        queue.push(page);
      } else {
        const toRemove = queue.shift();
        const idx = frames.indexOf(toRemove);
        frames[idx] = page;
        queue.push(page);
      }
    }
    steps.push({ frames: [...frames], hit });
  });

  return { steps, hits, misses: refStr.length - hits };
}

// LRU Algorithm (fixed update order)
function simulateLRU(refStr, frameSize) {
  let frames = [];
  let recent = new Map(); // page -> last used index
  let steps = [];
  let hits = 0;

  refStr.forEach((page, index) => {
    let hit = frames.includes(page);

    if (hit) {
      hits++;
    } else {
      if (frames.length < frameSize) {
        frames.push(page);
      } else {
        // Find LRU page (smallest last used index)
        let lruIndex = Infinity;
        let toRemove = null;
        for (let f of frames) {
          let lastUsed = recent.has(f) ? recent.get(f) : -1;
          if (lastUsed < lruIndex) {
            lruIndex = lastUsed;
            toRemove = f;
          }
        }
        let idx = frames.indexOf(toRemove);
        frames[idx] = page;
      }
    }
    recent.set(page, index);
    steps.push({ frames: [...frames], hit });
  });

  return { steps, hits, misses: refStr.length - hits };
}

// Optimal Algorithm (fixed victim selection)
function simulateOPT(refStr, frameSize) {
  let frames = [];
  let steps = [];
  let hits = 0;

  for (let i = 0; i < refStr.length; i++) {
    const page = refStr[i];
    let hit = frames.includes(page);

    if (hit) {
      hits++;
    } else {
      if (frames.length < frameSize) {
        frames.push(page);
      } else {
        let future = refStr.slice(i + 1);
        let indexMap = frames.map(f => {
          let idx = future.indexOf(f);
          return idx === -1 ? Infinity : idx;
        });
        let maxIndex = Math.max(...indexMap);
        let victim = indexMap.indexOf(maxIndex);
        // **Replace victim page with current page**
        frames[victim] = page;
      }
    }
    steps.push({ frames: [...frames], hit });
  }

  return { steps, hits, misses: refStr.length - hits };
}


// LFU Algorithm (fix tie break: remove oldest in frames among candidates)
function simulateLFU(refStr, frameSize) {
  let frames = [];
  let freq = new Map();
  let steps = [];
  let hits = 0;

  refStr.forEach(page => {
    let hit = frames.includes(page);

    if (hit) {
      hits++;
      freq.set(page, (freq.get(page) || 0) + 1);
    } else {
      if (frames.length < frameSize) {
        frames.push(page);
        freq.set(page, 1);
      } else {
        // Find least frequently used count
        let minFreq = Infinity;
        frames.forEach(p => {
          let f = freq.get(p) || 0;
          if (f < minFreq) minFreq = f;
        });
        // Collect all pages with min freq
        let candidates = frames.filter(p => (freq.get(p) || 0) === minFreq);
        // Remove oldest among candidates (first appearing in frames)
        let toRemove = candidates[0];
        let idx = frames.indexOf(toRemove);
        frames[idx] = page;
        freq.delete(toRemove);
        freq.set(page, 1);
      }
    }
    steps.push({ frames: [...frames], hit });
  });

  return { steps, hits, misses: refStr.length - hits };
}

// MRU Algorithm (fix for never used pages)
function simulateMRU(refStr, frameSize) {
  let frames = [];
  let recent = new Map(); // page -> last used index
  let steps = [];
  let hits = 0;

  refStr.forEach((page, index) => {
    let hit = frames.includes(page);

    if (hit) {
      hits++;
    } else {
      if (frames.length < frameSize) {
        frames.push(page);
      } else {
        // Find MRU page (max last used index)
        let mruIndex = -1;
        let toRemove = null;
        for (let f of frames) {
          let lastUsed = recent.has(f) ? recent.get(f) : -1;
          if (lastUsed > mruIndex) {
            mruIndex = lastUsed;
            toRemove = f;
          }
        }
        let idx = frames.indexOf(toRemove);
        frames[idx] = page;
      }
    }
    recent.set(page, index);
    steps.push({ frames: [...frames], hit });
  });

  return { steps, hits, misses: refStr.length - hits };
}
