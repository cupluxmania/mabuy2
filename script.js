const G_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzeXfwbFMaC8WH3th-aw5_PtMGTlz6UHMC5S5tWs9j1FW-G_Fszldy9QqiY5Zps-mFGQg/exec";

const floor = document.getElementById("floor");
const container = document.getElementById("floorContainer");
const searchBox = document.getElementById("searchBox");
const suggestions = document.getElementById("suggestions");
const panel = document.getElementById("sidePanel");
const panelContent = document.getElementById("panelContent");
const reportBtn = document.getElementById("reportBtn");

let allData = [];
let zoomLevel = 1;

/* =========================
   UTIL
========================= */
function clean(val) {
    if (!val) return "";
    return String(val).replace(/\s+/g, " ").trim();
}

/* =========================
   STATUS
========================= */
function getStatus(row) {
    const s = clean(row.status).toLowerCase();

    if (s === "available") return "available";
    if (s === "booked") return "booked";
    if (s === "sold") return "sold";
    if (s.includes("agent")) return "agent";

    return "available";
}

/* =========================
   LOAD DATA
========================= */
async function loadData() {
    const res = await fetch(`${G_SCRIPT_URL}?cmd=read&t=${Date.now()}`);
    const raw = await res.json();

    const temp = [];

    raw.forEach(row => {
        if (!row.boothid) return;

        String(row.boothid).split(",").forEach(id => {

            const cleanId = String(id).trim(); // ✅ KEEP RAW EXACT

            temp.push({
                boothid: cleanId,          // ✅ RAW ONLY (NO NORMALIZE)
                status: getStatus(row),
                exhibitor: clean(row.exhibitor),
                size: Number(row.size || row.sqm || 0)
            });
        });
    });

    allData = temp;
    renderFloor();
}

/* =========================
   HALL CONFIG
========================= */
const hallConfig = [
  {name:"Hall 5", start:5001, end:5079},
  {name:"Hall 6", start:6001, end:6189},
  {name:"Hall 7", start:7001, end:7196},
  {name:"Hall 8", start:8001, end:8181},
  {name:"Hall 9", start:9001, end:9191},
  {name:"Hall 10", start:1001, end:1151},
  {name:"Ambulance", start:"A", end:"Z"}
];

/* =========================
   VARIANT DETECTOR (LIKE MABUY)
========================= */
function getVariants(baseId) {
    return allData.filter(x =>
        String(x.boothid).startsWith(baseId + "-")
    );
}

/* =========================
   DISPLAY FORMAT
========================= */
function formatDisplayId(id) {
    return String(id);
}

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

                const baseId = String(i);
                const variants = getVariants(baseId);

                if (variants.length > 0) {
                    variants.forEach(v => {
                        grid.appendChild(createBooth(v.boothid));
                    });
                } else {
                    grid.appendChild(createBooth(baseId));
                }
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

    const displayId = formatDisplayId(id);

    const matches = allData.filter(x => x.boothid === id);

    let status = "available";
    let exhibitor = "";
    let size = 0;

    if (matches.length) {
        if (matches.some(x => x.status === "agent")) status = "agent";
        else if (matches.some(x => x.status === "sold")) status = "sold";
        else if (matches.some(x => x.status === "booked")) status = "booked";

        exhibitor = matches.map(x => x.exhibitor).filter(Boolean).join(", ");
        size = matches.reduce((sum, x) => sum + x.size, 0);
    }

    const b = document.createElement("div");
    b.className = "booth " + status;

    // ✅ RAW DISPLAY (THIS FIXES 5035-A ISSUE)
    b.innerText = displayId;

    b.dataset.id = id;

    b.dataset.tooltip = size
        ? `${status.toUpperCase()} • [ ${size} sqm ]`
        : `${status.toUpperCase()} • [ - ]`;

    b.onclick = (e) => {
        e.stopPropagation();

        panel.classList.remove("hidden");
        panelContent.innerHTML = `
            <b>Booth:</b> ${displayId}<br>
            <b>Status:</b> ${status.toUpperCase()}<br>
            <b>Exhibitor:</b> ${exhibitor || "-"}<br>
            <b>Size:</b> ${size || "-"}
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
        String(x.boothid).toLowerCase().includes(val) ||
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
            if (!el) return;

            el.scrollIntoView({ behavior: "smooth", block: "center" });

            el.classList.add("highlight", "blink");

            setTimeout(() => el.classList.remove("blink"), 5000);
            setTimeout(() => el.classList.remove("highlight"), 6000);

            el.click();
            suggestions.style.display = "none";
        };

        suggestions.appendChild(div);
    });
});

/* =========================
   REPORT (UNCHANGED LOGIC)
========================= */
reportBtn.onclick = (e) => {
    e.stopPropagation();

    const summary = {
        total: 0,
        available: 0,
        sold: 0,
        booked: 0,
        agent: 0,
        size: 0
    };

    const hallReport = {};

    allData.forEach(x => {

        summary.total++;
        summary[x.status]++;
        summary.size += x.size;

        const hall = getHall(x.boothid);

        if (!hallReport[hall]) {
            hallReport[hall] = {
                total: 0,
                available: 0,
                sold: 0,
                booked: 0,
                agent: 0,
                size: 0
            };
        }

        hallReport[hall].total++;
        hallReport[hall][x.status]++;
        hallReport[hall].size += x.size;
    });

    function getHall(id) {
        const num = parseInt(id);

        if (!isNaN(num)) {
            if (num >= 5000 && num < 6000) return "Hall 5";
            if (num >= 6000 && num < 7000) return "Hall 6";
            if (num >= 7000 && num < 8000) return "Hall 7";
            if (num >= 8000 && num < 9000) return "Hall 8";
            if (num >= 9000 && num < 10000) return "Hall 9";
            if (num >= 1000 && num < 2000) return "Hall 10";
        }

        if (/^[a-zA-Z]$/.test(id)) return "Ambulance";

        if (id.includes("-")) {
            const base = id.split("-")[0];
            return getHall(base);
        }

        return "Other";
    }

    let html = `
        <h3>📊 OVERALL</h3>
        Booth: ${summary.total}<br>
        Available: ${summary.available}<br>
        Sold: ${summary.sold}<br>
        Booked: ${summary.booked}<br>
        Agent: ${summary.agent}<br>
        Total Size: ${summary.size}
        <hr>
    `;

    Object.keys(hallReport).forEach(h => {
        const r = hallReport[h];

        html += `
            <b>${h}</b><br>
            Booth: ${r.total}<br>
            Available: ${r.available}<br>
            Sold: ${r.sold}<br>
            Booked: ${r.booked}<br>
            Agent: ${r.agent}<br>
            Total Size: ${r.size}
            <hr>
        `;
    });

    panel.classList.remove("hidden");
    panelContent.innerHTML = html;
};

/* =========================
   DRAG + ZOOM + CLOSE
========================= */
let isDown = false, startX, startY, scrollLeft, scrollTop;

container.addEventListener("mousedown", (e) => {
    isDown = true;
    startX = e.pageX;
    startY = e.pageY;
    scrollLeft = container.scrollLeft;
    scrollTop = container.scrollTop;
});

document.addEventListener("mouseup", () => isDown = false);

document.addEventListener("mousemove", (e) => {
    if (!isDown) return;

    container.scrollLeft = scrollLeft - (e.pageX - startX);
    container.scrollTop = scrollTop - (e.pageY - startY);
});

document.getElementById("zoomIn").onclick = () => {
    zoomLevel += 0.1;
    floor.style.transform = `scale(${zoomLevel})`;
};

document.getElementById("zoomOut").onclick = () => {
    zoomLevel = Math.max(0.3, zoomLevel - 0.1);
    floor.style.transform = `scale(${zoomLevel})`;
};

document.addEventListener("click", () => {
    panel.classList.add("hidden");
    suggestions.style.display = "none";
});

loadData();
