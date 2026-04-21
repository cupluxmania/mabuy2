const G_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzeXfwbFMaC8WH3th-aw5_PtMGTlz6UHMC5S5tWs9j1FW-G_Fszldy9QqiY5Zps-mFGQg/exec";

const floor = document.getElementById("floor");
const container = document.getElementById("floorContainer");
const searchBox = document.getElementById("searchBox");
const suggestions = document.getElementById("suggestions");
const panel = document.getElementById("sidePanel");
const panelContent = document.getElementById("panelContent");

let allData = [];
let zoomLevel = 1;
let DEBUG = false;

/* =========================
   🧼 CLEAN TEXT
========================= */
function cleanText(val) {
    if (!val) return "";

    let text = String(val)
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const lower = text.toLowerCase();

    if (["-", "n/a", "na", "null", "undefined"].includes(lower)) {
        return "";
    }

    return text;
}

/* =========================
   🔥 NORMALIZE ID
========================= */
function normalizeId(id) {
    return String(id || "")
        .replace(/\u00A0/g, "")
        .replace(/\s+/g, "")
        .trim()
        .toLowerCase();
}

/* =========================
   🔍 FALLBACK ANALYZER (ONLY IF STATUS EMPTY)
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
   🎯 STATUS FROM SHEET (MAIN SOURCE)
========================= */
function getStatusFromSheet(row) {

    let status = cleanText(row.status).toLowerCase();

    if (status === "available") return "available";
    if (status === "booked") return "booked";
    if (status === "sold") return "sold";
    if (status.includes("agent")) return "agent";

    // 🔁 fallback only if empty or invalid
    const fallbackText = [
        cleanText(row.helper),
        cleanText(row.exhibitor)
    ].join(" ");

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
                exhibitor: cleanText(row.exhibitor),
                debug: {
                    raw: row.status,
                    reason: "FROM SHEET"
                }
            });
        });
    });

    allData = expanded;
    renderFloor();
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
   RENDER
========================= */
function renderFloor() {
    floor.innerHTML = "";

    hallConfig.forEach(hall => {

        const hallDiv = document.createElement("div");
        hallDiv.className = "hall";

        const title = document.createElement("h3");
        title.innerText = hall.name;
        hallDiv.appendChild(title);

        const grid = document.createElement("div");
        grid.className = "grid";

        if (hall.name === "Ambulance") {
            for (let i = 65; i <= 90; i++) {
                grid.appendChild(createBooth(String.fromCharCode(i)));
            }
        } else {
            for (let i = hall.start; i <= hall.end; i++) {
                grid.appendChild(createBooth(String(i)));
            }
        }

        hallDiv.appendChild(grid);
        floor.appendChild(hallDiv);
    });
}

/* =========================
   CREATE BOOTH
========================= */
function createBooth(id) {

    const normId = normalizeId(id);

    const b = document.createElement("div");
    b.className = "booth available";
    b.innerText = id;
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
    b.dataset.tooltip = `${finalStatus.toUpperCase()} ${exhibitorName ? "• " + exhibitorName : ""}`;

    b.onclick = (e) => {
        e.stopPropagation();

        panel.classList.remove("hidden");
        panelContent.innerHTML = `
            <b>Booth:</b> ${id}<br>
            <b>Status:</b> <span style="color:${getColor(finalStatus)}">${finalStatus.toUpperCase()}</span><br>
            <b>Exhibitor:</b> ${exhibitorName || "-"}
        `;
    };

    return b;
}

/* =========================
   SEARCH
========================= */
searchBox.addEventListener("input", () => {

    const val = searchBox.value.toLowerCase();

    const result = allData.filter(x =>
        x.boothid.includes(val) ||
        (x.exhibitor || "").toLowerCase().includes(val)
    );

    suggestions.innerHTML = "";
    suggestions.style.display = result.length ? "block" : "none";

    result.forEach(x => {

        const div = document.createElement("div");
        div.className = "suggestionItem";
        div.innerText = `${x.boothid} - ${x.exhibitor}`;

        div.onclick = () => {
            const el = document.querySelector(`[data-id='${x.boothid}']`);
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.click();
            }
            suggestions.style.display = "none";
        };

        suggestions.appendChild(div);
    });
});

/* =========================
   DRAG
========================= */
let isDown = false, startX, startY, scrollLeft, scrollTop;

container.addEventListener("mousedown", (e) => {
    isDown = true;
    startX = e.pageX;
    startY = e.pageY;
    scrollLeft = container.scrollLeft;
    scrollTop = container.scrollTop;
});

container.addEventListener("mouseup", () => isDown = false);
container.addEventListener("mouseleave", () => isDown = false);

container.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    container.scrollLeft = scrollLeft - (e.pageX - startX);
    container.scrollTop = scrollTop - (e.pageY - startY);
});

/* =========================
   ZOOM
========================= */
document.getElementById("zoomIn").onclick = () => {
    zoomLevel += 0.1;
    floor.style.transform = `scale(${zoomLevel})`;
};
document.getElementById("zoomOut").onclick = () => {
    zoomLevel = Math.max(0.3, zoomLevel - 0.1);
    floor.style.transform = `scale(${zoomLevel})`;
};

/* =========================
   CLOSE
========================= */
document.addEventListener("click", () => {
    panel.classList.add("hidden");
    suggestions.style.display = "none";
});

loadData();
