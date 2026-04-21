const G_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzeXfwbFMaC8WH3th-aw5_PtMGTlz6UHMC5S5tWs9j1FW-G_Fszldy9QqiY5Zps-mFGQg/exec";

const floor = document.getElementById("floor");
const container = document.getElementById("floorContainer");
const searchBox = document.getElementById("searchBox");
const suggestions = document.getElementById("suggestions");
const panel = document.getElementById("sidePanel");
const panelContent = document.getElementById("panelContent");
const reportBtn = document.getElementById("reportBtn");

let allData = [];

/* =========================
   CLEAN SAFE
========================= */
function clean(v) {
    return v ? String(v).replace(/\s+/g, " ").trim() : "";
}

/* =========================
   STATUS
========================= */
function getStatus(row) {
    const s = clean(row.status).toLowerCase();

    if (s === "sold") return "sold";
    if (s === "booked") return "booked";
    if (s.includes("agent")) return "agent";
    if (s === "available") return "available";

    return "available";
}

/* =========================
   BOOTH PARSER (SAFE SPLIT ONLY)
========================= */
function parseBooths(raw) {

    const id = String(raw).trim();

    // comma group
    if (id.includes(",")) {
        return {
            list: id.split(",").map(x => x.trim())
        };
    }

    // numeric range group
    if (id.includes("-") && /^\d/.test(id)) {
        const [a, b] = id.split("-").map(Number);

        if (!isNaN(a) && !isNaN(b)) {
            const list = [];
            for (let i = a; i <= b; i++) list.push(String(i));
            return { list };
        }
    }

    // IMPORTANT: suffix booth stays RAW (5035-A untouched)
    return {
        list: [id]
    };
}

/* =========================
   LOAD DATA (NO ID CHANGE)
========================= */
async function loadData() {

    try {
        const res = await fetch(`${G_SCRIPT_URL}?cmd=read&t=${Date.now()}`);
        const raw = await res.json();

        const temp = [];

        raw.forEach(row => {
            if (!row.boothid) return;

            const group = parseBooths(row.boothid);
            const totalSize = Number(row.size || row.sqm || 9);
            const perSize = totalSize / group.list.length;

            group.list.forEach(id => {

                temp.push({
                    boothid: String(id), // 🔥 ABSOLUTE RAW STRING ONLY
                    status: getStatus(row),
                    exhibitor: clean(row.exhibitor),
                    size: perSize
                });
            });
        });

        allData = temp;
        renderFloor();

    } catch (err) {
        console.error("DATABASE ERROR:", err);
    }
}

/* =========================
   FIND (STRICT MATCH ONLY)
========================= */
function find(id) {
    return allData.filter(x => String(x.boothid) === String(id));
}

/* =========================
   HALL CONFIG (UNCHANGED)
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
   RENDER FLOOR
========================= */
function renderFloor() {

    floor.innerHTML = "";

    hallConfig.forEach(h => {

        const hallDiv = document.createElement("div");
        hallDiv.className = "hall";

        const title = document.createElement("h3");
        title.innerText = h.name;
        hallDiv.appendChild(title);

        const grid = document.createElement("div");
        grid.className = "grid";

        const processed = new Set();

        const make = (id) => {

            const key = String(id);

            if (processed.has(key)) return;
            processed.add(key);

            const data = find(key)[0];

            grid.appendChild(createBooth(key, data));
        };

        if (h.name === "Ambulance") {
            for (let i = 65; i <= 90; i++) {
                make(String.fromCharCode(i));
            }
        } else {
            for (let i = h.start; i <= h.end; i++) {
                make(String(i));
            }
        }

        hallDiv.appendChild(grid);
        floor.appendChild(hallDiv);
    });
}

/* =========================
   CREATE BOOTH
========================= */
function createBooth(id, data) {

    const b = document.createElement("div");

    const status = data?.status || "available";
    const exhibitor = data?.exhibitor || "";
    const size = data?.size || 9;

    b.className = "booth " + status;

    // 🔥 RAW DISPLAY ONLY (5035-A NEVER CHANGED)
    b.innerText = id;

    b.dataset.id = id;

    b.dataset.tooltip = `${status.toUpperCase()} • [ ${size} sqm ]`;

    b.onclick = (e) => {
        e.stopPropagation();

        panel.classList.remove("hidden");
        panelContent.innerHTML = `
            <b>Booth:</b> ${id}<br>
            <b>Status:</b> ${status.toUpperCase()}<br>
            <b>Exhibitor:</b> ${exhibitor || "-"}<br>
            <b>Size:</b> ${size}
        `;
    };

    return b;
}

/* =========================
   SEARCH (SAFE RAW MATCH)
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
   DRAG FIX (STABLE)
========================= */
let isDown = false, startX, startY, scrollLeft, scrollTop;

container.addEventListener("mousedown", (e) => {
    isDown = true;
    startX = e.clientX;
    startY = e.clientY;
    scrollLeft = container.scrollLeft;
    scrollTop = container.scrollTop;
    container.style.cursor = "grabbing";
});

document.addEventListener("mouseup", () => {
    isDown = false;
    container.style.cursor = "grab";
});

document.addEventListener("mousemove", (e) => {

    if (!isDown) return;

    e.preventDefault();

    container.scrollLeft = scrollLeft - (e.clientX - startX);
    container.scrollTop = scrollTop - (e.clientY - startY);
});

/* =========================
   REPORT (FULL FIXED)
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

        const status = x.status || "available";
        const hall = x.hall || "Unknown";
        const size = Number(x.size || 0);

        summary.total++;
        summary[status] = (summary[status] || 0) + 1;
        summary.size += size;

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
        hallReport[hall][status] = (hallReport[hall][status] || 0) + 1;
        hallReport[hall].size += size;
    });

    let html = `
        <h3>📊 OVERALL</h3>
        Total Booth: ${summary.total}<br>
        Available: ${summary.available || 0}<br>
        Sold: ${summary.sold || 0}<br>
        Booked: ${summary.booked || 0}<br>
        Agent: ${summary.agent || 0}<br>
        Total Size: ${summary.size}
        <hr>
    `;

    Object.keys(hallReport).forEach(h => {

        const r = hallReport[h];

        html += `
            <b>${h}</b><br>
            Total: ${r.total}<br>
            Available: ${r.available || 0}<br>
            Sold: ${r.sold || 0}<br>
            Booked: ${r.booked || 0}<br>
            Agent: ${r.agent || 0}<br>
            Size: ${r.size}
            <hr>
        `;
    });

    panel.classList.remove("hidden");
    panelContent.innerHTML = html;
};

/* INIT */
loadData();
