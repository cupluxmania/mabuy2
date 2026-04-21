const G_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzeXfwbFMaC8WH3th-aw5_PtMGTlz6UHMC5S5tWs9j1FW-G_Fszldy9QqiY5Zps-mFGQg/exec";

const floor = document.getElementById("floor");
const container = document.getElementById("floorContainer");
const searchBox = document.getElementById("searchBox");
const suggestions = document.getElementById("suggestions");
const panel = document.getElementById("sidePanel");
const panelContent = document.getElementById("panelContent");

let allData = [];

/* =========================
   CLEAN (NO ID MODIFICATION)
========================= */
function clean(val) {
    return val ? String(val).replace(/\s+/g, " ").trim() : "";
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
   BOOTH PARSER
========================= */
function parseBooths(raw) {

    const id = String(raw).trim();

    // comma group
    if (id.includes(",")) {
        return {
            type: "group",
            list: id.split(",").map(x => x.trim())
        };
    }

    // range group (5001-5002)
    if (id.includes("-") && /^\d/.test(id)) {
        const [a, b] = id.split("-").map(Number);

        if (!isNaN(a) && !isNaN(b)) {
            const list = [];
            for (let i = a; i <= b; i++) {
                list.push(String(i));
            }
            return { type: "group", list };
        }
    }

    // IMPORTANT: suffix booth stays RAW (5035-A)
    return {
        type: "single",
        list: [id]
    };
}

/* =========================
   LOAD DATA (SAFE + RAW ID ONLY)
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
                    boothid: id, // 🔥 RAW ID ONLY (NO NORMALIZE)
                    status: getStatus(row),
                    exhibitor: clean(row.exhibitor),
                    size: perSize
                });
            });
        });

        allData = temp;
        renderFloor();

    } catch (err) {
        console.error("DB ERROR:", err);
    }
}

/* =========================
   FIND (STRICT MATCH ONLY)
========================= */
function find(id) {
    return allData.filter(x => x.boothid === id);
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

            if (processed.has(id)) return;
            processed.add(id);

            const data = find(id)[0];

            grid.appendChild(createBooth(id, data));
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

    b.innerText = id; // 🔥 ALWAYS RAW DISPLAY (5035-A stays 5035-A)
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
   SEARCH (RAW SAFE MATCH)
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
   DRAG (STABLE FIX)
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

/* INIT */
loadData();
