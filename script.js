const G_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzeXfwbFMaC8WH3th-aw5_PtMGTlz6UHMC5S5tWs9j1FW-G_Fszldy9QqiY5Zps-mFGQg/exec";

const floor = document.getElementById("floor");
const container = document.getElementById("floorContainer");
const searchBox = document.getElementById("searchBox");
const suggestions = document.getElementById("suggestions");
const panel = document.getElementById("sidePanel");
const panelContent = document.getElementById("panelContent");

let allData = [];
let zoomLevel = 1;

/* =========================
   🧼 CLEAN TEXT
========================= */
function cleanText(val) {
    if (!val) return "";
    let text = String(val).replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
    const lower = text.toLowerCase();
    if (["-", "n/a", "na", "null", "undefined"].includes(lower)) return "";
    return text;
}

/* =========================
   🔥 NORMALIZE ID
========================= */
function normalizeId(id) {
    return String(id || "").replace(/\u00A0/g, "").replace(/\s+/g, "").trim().toLowerCase();
}

/* =========================
   🔍 FALLBACK ANALYZER
========================= */
function analyzeStatus(text) {
    const raw = cleanText(text);
    if (!raw) return "available";
    if (raw.toLowerCase().includes("agent")) return "agent";
    if (/[a-zA-Z]/.test(raw)) {
        return /[A-Z]/.test(raw) ? "sold" : "booked";
    }
    return "available";
}

/* =========================
   🎯 STATUS FROM SHEET
========================= */
function getStatusFromSheet(row) {
    let status = cleanText(row.status).toLowerCase();
    if (status === "available") return "available";
    if (status === "booked") return "booked";
    if (status === "sold") return "sold";
    if (status.includes("agent")) return "agent";

    const fallbackText = [cleanText(row.helper), cleanText(row.exhibitor)].join(" ");
    return analyzeStatus(fallbackText);
}

function getColor(status){
    return {
        available:"#3b82f6",
        sold:"#ef4444",
        booked:"#eab308",
        agent:"#22c55e"
    }[status];
}

/* =========================
   LOAD DATA
========================= */
async function loadData() {
    const res = await fetch(`${G_SCRIPT_URL}?cmd=read&t=${Date.now()}`);
    const raw = await res.json();
    const expanded = [];

    raw.forEach(row => {
        if (!row.boothid) return;
        const booths = String(row.boothid).split(",");
        booths.forEach(id => {
            const boothIdClean = normalizeId(id);
            const finalStatus = getStatusFromSheet(row);
            expanded.push({
                boothid: boothIdClean,
                status: finalStatus,
                exhibitor: cleanText(row.exhibitor)
            });
        });
    });

    allData = expanded;
    renderFloor();
}

function getVariants(baseId) {
    return allData.filter(x => normalizeId(x.boothid).startsWith(normalizeId(baseId) + "-"));
}

function formatDisplayId(id) {
    return id.replace(/-([a-z])$/, (_, c) => "-" + c.toUpperCase());
}

/* =========================
   HALL CONFIG
========================= */
const hallConfig = [
  {name:"Hall 5", start:5001, end:5078},
  {name:"Hall 6", start:6001, end:6189},
  {name:"Hall 7", start:7001, end:7196},
  {name:"Hall 8", start:8001, end:8181},
  {name:"Hall 9", start:9001, end:9191},
  {name:"Hall 10", start:1001, end:1151},
  {name:"Ambulance", start:"A", end:"Z"}
];

/* =========================
   RENDER (UPDATED FOR SUMMARY BAR)
========================= */
function renderFloor() {
    floor.innerHTML = "";

    hallConfig.forEach(hall => {
        const hallDiv = document.createElement("div");
        hallDiv.className = "hall";

        // Header containing Title and the Count Bar
        const headerRow = document.createElement("div");
        headerRow.className = "hall-header";

        const title = document.createElement("h3");
        title.innerText = hall.name;
        headerRow.appendChild(title);

        const summary = document.createElement("div");
        summary.className = "hall-summary";
        
        const boothElements = [];
        if (hall.name === "Ambulance") {
            for (let i = 65; i <= 90; i++) {
                boothElements.push(createBooth(String.fromCharCode(i)));
            }
        } else {
            for (let i = hall.start; i <= hall.end; i++) {
                const baseId = String(i);
                const variants = getVariants(baseId);
                if (variants.length > 0) {
                    variants.forEach(v => boothElements.push(createBooth(v.boothid)));
                } else {
                    boothElements.push(createBooth(baseId));
                }
            }
        }

        // Calculate Totals for this Hall
        const counts = { available: 0, sold: 0, booked: 0, agent: 0 };
        boothElements.forEach(el => {
            const status = el.className.split(" ")[1];
            if(counts[status] !== undefined) counts[status]++;
        });

        // Create the Count Chips (Available, Sold, Booked, Agent)
        Object.keys(counts).forEach(status => {
            const chip = document.createElement("div");
            chip.className = "count-chip";
            chip.innerHTML = `<span class="dot ${status}"></span> <strong>${counts[status]}</strong>`;
            summary.appendChild(chip);
        });

        headerRow.appendChild(summary);
        hallDiv.appendChild(headerRow);

        const grid = document.createElement("div");
        grid.className = "grid";
        boothElements.forEach(be => grid.appendChild(be));

        hallDiv.appendChild(grid);
        floor.appendChild(hallDiv);
    });
}

function createBooth(id) {
    const normId = normalizeId(id);
    const displayId = formatDisplayId(id);
    const b = document.createElement("div");
    b.className = "booth available";
    b.innerText = displayId;
    b.dataset.id = normId;

    const matches = allData.filter(x => x.boothid === normId);
    let finalStatus = "available";
    let exhibitorName = "";

    if (matches.length) {
        if (matches.some(x => x.status === "agent")) finalStatus = "agent";
        else if (matches.some(x => x.status === "sold")) finalStatus = "sold";
        else if (matches.some(x => x.status === "booked")) finalStatus = "booked";
        exhibitorName = matches.map(x => x.exhibitor).filter(Boolean).join(", ");
    }

    b.className = "booth " + finalStatus;
    b.dataset.tooltip = `${displayId} • ${finalStatus.toUpperCase()}${exhibitorName ? " • " + exhibitorName : ""}`;

    b.onclick = (e) => {
        e.stopPropagation();
        panel.classList.remove("hidden");
        panelContent.innerHTML = `
            <b>Booth:</b> ${displayId}<br>
            <b>Status:</b> <span style="color:${getColor(finalStatus)}">${finalStatus.toUpperCase()}</span><br>
            <b>Exhibitor:</b> ${exhibitorName || "-"}
        `;
    };
    return b;
}

/* =========================
   SEARCH & DRAG & ZOOM (UNCHANGED)
========================= */
searchBox.addEventListener("input", () => {
    const val = searchBox.value.toLowerCase();
    const result = allData.filter(x => x.boothid.includes(val) || (x.exhibitor || "").toLowerCase().includes(val));
    suggestions.innerHTML = "";
    suggestions.style.display = result.length ? "block" : "none";
    result.forEach(x => {
        const div = document.createElement("div");
        div.className = "suggestionItem";
        div.innerText = `${formatDisplayId(x.boothid)} - ${x.exhibitor}`;
        div.onclick = () => {
            const el = document.querySelector(`[data-id='${x.boothid}']`);
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
                document.querySelectorAll(".highlight, .blink").forEach(b => b.classList.remove("highlight", "blink"));
                el.classList.add("highlight", "blink");
                setTimeout(() => el.classList.remove("highlight", "blink"), 5000);
                el.click();
            }
            suggestions.style.display = "none";
        };
        suggestions.appendChild(div);
    });
});

let isDown = false, startX, startY, scrollLeft, scrollTop;
container.addEventListener("mousedown", (e) => {
    isDown = true;
    startX = e.pageX; startY = e.pageY;
    scrollLeft = container.scrollLeft; scrollTop = container.scrollTop;
});
container.addEventListener("mouseup", () => isDown = false);
container.addEventListener("mouseleave", () => isDown = false);
container.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    container.scrollLeft = scrollLeft - (e.pageX - startX);
    container.scrollTop = scrollTop - (e.pageY - startY);
});

document.getElementById("zoomIn").onclick = () => { zoomLevel += 0.1; floor.style.transform = `scale(${zoomLevel})`; };
document.getElementById("zoomOut").onclick = () => { zoomLevel = Math.max(0.3, zoomLevel - 0.1); floor.style.transform = `scale(${zoomLevel})`; };

document.addEventListener("click", () => {
    panel.classList.add("hidden");
    suggestions.style.display = "none";
});

loadData();
