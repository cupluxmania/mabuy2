const G_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzeXfwbFMaC8WH3th-aw5_PtMGTlz6UHMC5S5tWs9j1FW-G_Fszldy9QqiY5Zps-mFGQg/exec";

const floor = document.getElementById("floor");
const container = document.getElementById("floorContainer");
const searchBox = document.getElementById("searchBox");
const suggestions = document.getElementById("suggestions");
const panel = document.getElementById("sidePanel");
const panelContent = document.getElementById("panelContent");

let allData = [];
let zoomLevel = 1;

/* NORMALIZE */
function normalizeId(id) {
    return String(id).replace(/\s+/g, "").toLowerCase();
}

/* GET VARIANTS */
function getVariants(baseId) {
    return allData.filter(x =>
        normalizeId(x.boothid).startsWith(normalizeId(baseId) + "-")
    );
}

/* LOAD DATA */
async function loadData() {
    const res = await fetch(`${G_SCRIPT_URL}?cmd=read&t=${Date.now()}`);
    const raw = await res.json();

    const expanded = [];

    raw.forEach(row => {
        if (!row.boothid) return;

        const booths = String(row.boothid).split(",");

        booths.forEach(id => {

            let rawStatus = (row.status || "").toLowerCase();
            let helper = (row.helper || "").toLowerCase();
            let exhibitor = (row.exhibitor || "").toLowerCase();

            // 🔥 AGENT DETECTION
            let isAgent =
                rawStatus.includes("agent") ||
                helper.includes("agent") ||
                exhibitor.includes("agent");

            let status = "available";

            if (isAgent) status = "agent";
            else if (rawStatus === "booked") status = "sold";
            else if (rawStatus === "plotting") status = "booked";

            expanded.push({
                boothid: id.trim(),
                status: status,
                exhibitor: (row.exhibitor || "").trim()
            });
        });
    });

    allData = expanded;

    renderFloor();
}

/* HALL CONFIG */
const hallConfig = [
  {name:"Hall 5", start:5001, end:5078},
  {name:"Hall 6", start:6001, end:6189},
  {name:"Hall 7", start:7001, end:7196},
  {name:"Hall 8", start:8001, end:8181},
  {name:"Hall 9", start:9001, end:9191},
  {name:"Hall 10", start:1001, end:1151},
  {name:"Ambulance", start:"A", end:"Z"}
];

/* RENDER */
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
                    variants.forEach(v => grid.appendChild(createBooth(v.boothid)));
                } else {
                    grid.appendChild(createBooth(baseId));
                }
            }
        }

        hallDiv.appendChild(grid);
        floor.appendChild(hallDiv);
    });
}

/* CREATE BOOTH */
function createBooth(id) {

    const b = document.createElement("div");
    b.className = "booth available";
    b.innerText = id;
    b.dataset.id = id;

    const d = allData.find(x => normalizeId(x.boothid) === normalizeId(id));

    if (d) {
        b.className = "booth " + d.status;
        b.dataset.tooltip = d.exhibitor || d.status;
        b.dataset.name = d.exhibitor;
    } else {
        b.dataset.tooltip = "Available";
    }

    b.onclick = (e) => {
        e.stopPropagation();

        panel.classList.remove("hidden");
        panelContent.innerHTML = `
            <b>Booth:</b> ${id}<br>
            <b>Status:</b> ${b.className.replace('booth ', '')}<br>
            <b>Exhibitor:</b> ${b.dataset.name || "-"}
        `;
    };

    return b;
}

/* SEARCH */
searchBox.addEventListener("input", () => {

    const val = searchBox.value.toLowerCase();

    const result = allData.filter(x =>
        normalizeId(x.boothid).includes(val) ||
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

                el.classList.add("highlight");
                setTimeout(() => el.classList.remove("highlight"), 4000);

                el.click();
            }
            suggestions.style.display = "none";
        };

        suggestions.appendChild(div);
    });
});

/* DRAG */
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

/* ZOOM */
document.getElementById("zoomIn").onclick = () => {
    zoomLevel += 0.1;
    floor.style.transform = `scale(${zoomLevel})`;
};
document.getElementById("zoomOut").onclick = () => {
    zoomLevel = Math.max(0.3, zoomLevel - 0.1);
    floor.style.transform = `scale(${zoomLevel})`;
};

/* CLOSE */
document.addEventListener("click", () => {
    panel.classList.add("hidden");
    suggestions.style.display = "none";
});

loadData();
