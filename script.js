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
   NORMALIZE
========================= */
function normalizeId(id) {
    return String(id).replace(/\s+/g, "").toLowerCase();
}

/* =========================
   LOAD DATA
========================= */
async function loadData() {
    try {
        const res = await fetch(`${G_SCRIPT_URL}?cmd=read&t=${Date.now()}`);
        const raw = await res.json();

        const expanded = [];

        raw.forEach(row => {
            if (!row.boothid) return;

            const booths = String(row.boothid).split(",");

            booths.forEach(id => {
                expanded.push({
                    boothid: id.trim(),
                    status: (row.status || "available").toLowerCase(),
                    exhibitor: (row.exhibitor || "").trim()
                });
            });
        });

        allData = expanded;
        renderFloor();

    } catch (e) {
        console.error("Load error:", e);
    }
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
  {name:"Hall 10", start:1001, end:1151}
];

/* =========================
   RENDER FLOOR
========================= */
function renderFloor() {
    floor.innerHTML = "";

    hallConfig.forEach(hall => {
        const hallDiv = document.createElement("div");
        hallDiv.className = "hall";

        const title = document.createElement("h2");
        title.innerText = hall.name;
        hallDiv.appendChild(title);

        const grid = document.createElement("div");
        grid.className = "grid";

        for (let i = hall.start; i <= hall.end; i++) {
            const baseId = String(i);

            const variants = allData.filter(x =>
                normalizeId(x.boothid).startsWith(normalizeId(baseId))
            );

            if (variants.length > 0) {
                variants.forEach(v => grid.appendChild(createBooth(v.boothid)));
            } else {
                grid.appendChild(createBooth(baseId));
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
    const b = document.createElement("div");
    b.className = "booth available";
    b.innerText = id;
    b.dataset.id = id;

    const d = allData.find(x => normalizeId(x.boothid) === normalizeId(id));

    if (d) {
        let status = d.status;
        let name = d.exhibitor;

        if (name.toLowerCase().includes("agent")) {
            status = "agent";
        }

        if (name && name === name.toLowerCase()) {
            status = "plotting";
        }

        b.className = "booth " + status;
        b.dataset.name = name;
        b.dataset.tooltip = name || status;
    }

    b.onclick = (e) => {
        e.stopPropagation();
        showBooth(b, id);
    };

    return b;
}

/* =========================
   SHOW BOOTH + CENTER
========================= */
function showBooth(el, id) {

    // CENTER VIEW
    const elRect = el.getBoundingClientRect();
    const conRect = container.getBoundingClientRect();

    const scrollX = container.scrollLeft + (elRect.left - conRect.left) - (conRect.width / 2) + (elRect.width / 2);
    const scrollY = container.scrollTop + (elRect.top - conRect.top) - (conRect.height / 2) + (elRect.height / 2);

    container.scrollTo({
        left: scrollX,
        top: scrollY,
        behavior: "smooth"
    });

    // HIGHLIGHT + BLINK
    el.classList.add("highlight", "blink");

    setTimeout(() => {
        el.classList.remove("highlight", "blink");
    }, 5000);

    // PANEL
    panel.classList.remove("hidden");

    const name = el.dataset.name || "-";
    const status = el.className.replace("booth ", "");

    panelContent.innerHTML = `
        <b>Booth:</b> ${id}<br>
        <b>Status:</b> ${status}<br>
        <b>Exhibitor:</b> ${name}
    `;
}

/* =========================
   SEARCH
========================= */
searchBox.addEventListener("click", (e) => {
    e.stopPropagation();
    showSuggestions(allData);
});

searchBox.addEventListener("input", () => {
    const val = searchBox.value.toLowerCase();

    showSuggestions(
        allData.filter(x =>
            normalizeId(x.boothid).includes(val) ||
            (x.exhibitor || "").toLowerCase().includes(val)
        )
    );
});

function showSuggestions(list) {
    suggestions.innerHTML = "";

    if (!list.length) {
        suggestions.style.display = "none";
        return;
    }

    suggestions.style.display = "block";

    list.forEach(x => {
        const div = document.createElement("div");
        div.className = "suggestionItem";
        div.innerText = `${x.boothid} - ${x.exhibitor}`;

        div.onclick = (e) => {
            e.stopPropagation();

            const el = document.querySelector(`[data-id='${x.boothid}']`);
            if (el) showBooth(el, x.boothid);

            suggestions.style.display = "none";
        };

        suggestions.appendChild(div);
    });
}

/* =========================
   ZOOM
========================= */
document.getElementById("zoomIn").onclick = () => {
    zoomLevel += 0.1;
    applyZoom();
};

document.getElementById("zoomOut").onclick = () => {
    zoomLevel = Math.max(0.3, zoomLevel - 0.1);
    applyZoom();
};

function applyZoom() {
    floor.style.transform = `scale(${zoomLevel})`;
    document.getElementById("zoomLevel").innerText =
        Math.round(zoomLevel * 100) + "%";
}

/* =========================
   DRAG FIX (IMPORTANT)
========================= */
let isDragging = false;
let startX, startY;

container.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    container.style.cursor = "grabbing";
});

document.addEventListener("mouseup", () => {
    isDragging = false;
    container.style.cursor = "grab";
});

document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    container.scrollLeft -= dx;
    container.scrollTop -= dy;

    startX = e.clientX;
    startY = e.clientY;
});

/* =========================
   CLICK OUTSIDE
========================= */
document.addEventListener("click", () => {
    panel.classList.add("hidden");
    suggestions.style.display = "none";
});

/* INIT */
loadData();
