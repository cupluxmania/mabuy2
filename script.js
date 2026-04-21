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
   CLEAN
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
   SAFE BOOTH PARSER
========================= */
function parseBooths(raw) {

    if (!raw) return [];

    const fixed = String(raw)
        .replace(/\n/g, ",")
        .replace(/\s+/g, " ")
        .trim();

    return fixed
        .split(",")
        .map(x => x.trim())
        .filter(x => x.length > 0);
}

/* =========================
   LOAD DATA (DEBUG SAFE)
========================= */
async function loadData() {

    try {
        console.log("Loading API...");

        const res = await fetch(`${G_SCRIPT_URL}?cmd=read&t=${Date.now()}`);
        const raw = await res.json();

        console.log("RAW API:", raw);

        const temp = [];

        raw.forEach(row => {

            if (!row.boothid || !String(row.boothid).trim()) return;

            const booths = parseBooths(row.boothid);

            const totalSize = Number(row.size || 0);
            const perSize = booths.length ? totalSize / booths.length : totalSize;

            booths.forEach(id => {

                temp.push({
                    boothid: id, // 🔥 RAW ONLY
                    status: getStatus(row),
                    exhibitor: clean(row.exhibitor),
                    size: perSize
                });
            });
        });

        allData = temp;

        console.log("PARSED DATA:", allData);

        renderFloor();

    } catch (err) {
        console.error("❌ LOAD FAILED:", err);
        floor.innerHTML = "<h3 style='color:red'>Failed to load data</h3>";
    }
}

/* =========================
   FIND
========================= */
function find(id) {
    return allData.filter(x => x.boothid === id);
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
   RENDER FLOOR (SAFE)
========================= */
function renderFloor() {

    if (!allData.length) {
        console.warn("No data to render!");
        floor.innerHTML = "<h3>No booth data found</h3>";
        return;
    }

    floor.innerHTML = "";

    hallConfig.forEach(h => {

        const hallDiv = document.createElement("div");
        hallDiv.className = "hall";

        const title = document.createElement("h3");
        title.innerText = h.name;
        hallDiv.appendChild(title);

        const grid = document.createElement("div");
        grid.className = "grid";

        const make = (id) => {

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
   BOOTH
========================= */
function createBooth(id, data) {

    const b = document.createElement("div");

    const status = data?.status || "available";
    const exhibitor = data?.exhibitor || "";
    const size = data?.size || 0;

    b.className = "booth " + status;

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
   SEARCH
========================= */
searchBox.addEventListener("input", () => {

    const val = searchBox.value.toLowerCase();

    const result = allData.filter(x =>
        x.boothid.toLowerCase().includes(val) ||
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
   REPORT (SAFE)
========================= */
reportBtn.onclick = () => {

    if (!allData.length) {
        alert("No data loaded");
        return;
    }

    const summary = {
        total: 0,
        available: 0,
        sold: 0,
        booked: 0,
        agent: 0,
        size: 0
    };

    allData.forEach(x => {
        summary.total++;
        summary[x.status] = (summary[x.status] || 0) + 1;
        summary.size += Number(x.size || 0);
    });

    panel.classList.remove("hidden");
    panelContent.innerHTML = `
        <h3>📊 REPORT</h3>
        Total: ${summary.total}<br>
        Available: ${summary.available || 0}<br>
        Sold: ${summary.sold || 0}<br>
        Booked: ${summary.booked || 0}<br>
        Agent: ${summary.agent || 0}<br>
        Size: ${summary.size}
    `;
};

/* =========================
   DRAG SAFE
========================= */
let isDown = false, startX, startY, scrollLeft, scrollTop;

container.addEventListener("mousedown", (e) => {
    isDown = true;
    startX = e.clientX;
    startY = e.clientY;
    scrollLeft = container.scrollLeft;
    scrollTop = container.scrollTop;
});

document.addEventListener("mouseup", () => isDown = false);

document.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    container.scrollLeft = scrollLeft - (e.clientX - startX);
    container.scrollTop = scrollTop - (e.clientY - startY);
});

/* INIT */
loadData();
