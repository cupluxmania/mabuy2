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
   NORMALIZE ID
========================= */
function normalizeId(id) {
    return String(id).replace(/\s+/g, "").toLowerCase();
}

/* =========================
   CHECK VARIANT (e.g. 5061-A)
========================= */
function hasVariant(baseId) {
    return allData.some(x => normalizeId(x.boothid).startsWith(normalizeId(baseId) + "-"));
}

/* =========================
   GET VARIANTS LIST
========================= */
function getVariants(baseId) {
    return allData.filter(x => normalizeId(x.boothid).startsWith(normalizeId(baseId) + "-"));
}

/* =========================
   LOAD DATA (MULTI FIX)
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

        console.log("DATA READY:", allData);

        renderFloor();

    } catch (e) {
        console.error("Load error:", e);
        renderFloor();
    }
}

/* =========================
   HALL CONFIG
========================= */
const hallConfig = [
  {name:"Hall 5", start:5001, end:"5078-A"},
  {name:"Hall 6", start:6001, end:"6189-A"},
  {name:"Hall 7", start:7001, end:"7196-A"},
  {name:"Hall 8", start:8001, end:"8181-A"},
  {name:"Hall 9", start:9001, end:"9191-A"},
  {name:"Hall 10", start:1001, end:"1151-A"},
  {name:"Ambulance", start:"A", end:"Z"}
];

/* =========================
   RENDER FLOOR
========================= */
function renderFloor() {
    floor.innerHTML = "";

    hallConfig.forEach(hall => {
        const hallDiv = document.createElement("div");
        hallDiv.className = "hall";

        const h2 = document.createElement("h2");
        h2.innerText = hall.name;
        h2.onclick = () => jumpToElement(hallDiv);
        hallDiv.appendChild(h2);

        const grid = document.createElement("div");
        grid.className = "grid";

        if (hall.name === "Ambulance") {
            for (let i = 65; i <= 90; i++) {
                grid.appendChild(createBooth(String.fromCharCode(i)));
            }
        } else {
            let startNum = parseInt(hall.start);
            let endNum = parseInt(hall.end);
            let suffix = String(hall.end).replace(/[0-9]/g, '');

            for (let i = startNum; i <= endNum; i++) {

                let baseId = String(i);

                // 🚨 SKIP BASE IF VARIANT EXISTS
                if (hasVariant(baseId)) {
                    const variants = getVariants(baseId);
                    variants.forEach(v => grid.appendChild(createBooth(v.boothid)));
                    continue;
                }

                let finalId = (i === endNum && suffix) ? i + suffix : baseId;

                grid.appendChild(createBooth(finalId));
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
    b.dataset.name = "";
    b.dataset.tooltip = "Available";

    const d = allData.find(x => normalizeId(x.boothid) === normalizeId(id));

    if (d) {
        let name = d.exhibitor;
        let status = d.status;

        if (name.length > 0 && name === name.toLowerCase()) status = "plotting";

        b.className = "booth " + status;
        b.dataset.name = name;
        b.dataset.tooltip = name || status;
    }

    b.onclick = (e) => {
        e.stopPropagation();

        const currentStatus = b.className.replace('booth ', '').replace(' highlight', '');
        const statusProper = currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1);

        panel.classList.remove("hidden");
        panelContent.innerHTML = `
            <b>Booth:</b> ${id}<br>
            <b>Status:</b> ${statusProper}<br>
            <b>Exhibitor:</b> ${b.dataset.name || "-"}
        `;
    };

    return b;
}

/* =========================
   JUMP TO ELEMENT
========================= */
function jumpToElement(el) {
    const elRect = el.getBoundingClientRect();
    const conRect = container.getBoundingClientRect();

    const scrollX = container.scrollLeft + (elRect.left - conRect.left) - (conRect.width / 2) + (elRect.width / 2);
    const scrollY = container.scrollTop + (elRect.top - conRect.top) - (conRect.height / 2) + (elRect.height / 2);

    container.scrollTo({ left: scrollX, top: scrollY, behavior: "smooth" });
}

/* =========================
   SEARCH
========================= */
searchBox.addEventListener("click", (e) => {
    e.stopPropagation();
    showSuggestions(allData.filter(x => x.status !== "available"));
});

searchBox.addEventListener("input", () => {
    const val = searchBox.value.toLowerCase();

    showSuggestions(
        allData.filter(x =>
            x.status !== "available" &&
            (
                normalizeId(x.boothid).includes(normalizeId(val)) ||
                (x.exhibitor || "").toLowerCase().includes(val)
            )
        )
    );
});

function showSuggestions(list) {
    suggestions.innerHTML = "";

    if (list.length === 0) {
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

            if (el) {
                jumpToElement(el);
                el.classList.add("highlight");
                setTimeout(() => el.classList.remove("highlight"), 3000);
                el.click();
            }

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
    document.getElementById("zoomLevel").innerText = Math.round(zoomLevel * 100) + "%";
}

/* =========================
   DRAGGING
========================= */
let isDown = false, startX, startY, scrollLeft, scrollTop;

container.addEventListener("mousedown", (e) => {
    isDown = true;
    startX = e.pageX - container.offsetLeft;
    startY = e.pageY - container.offsetTop;
    scrollLeft = container.scrollLeft;
    scrollTop = container.scrollTop;
    container.style.scrollBehavior = "auto";
});

container.addEventListener("mouseleave", () => isDown = false);

container.addEventListener("mouseup", () => {
    isDown = false;
    container.style.scrollBehavior = "smooth";
});

container.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();

    const x = e.pageX - container.offsetLeft;
    const y = e.pageY - container.offsetTop;

    container.scrollLeft = scrollLeft - (x - startX);
    container.scrollTop = scrollTop - (y - startY);
});

/* =========================
   GLOBAL CLICK
========================= */
document.addEventListener("click", () => {
    panel.classList.add("hidden");
    suggestions.style.display = "none";
});

/* INIT */
loadData();
