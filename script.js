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
   NORMALIZE STATUS
========================= */
function mapStatus(status) {
    status = (status || "").toLowerCase();

    if (status === "booked") return "sold";     // rename
    if (status === "plotting") return "booked"; // rename
    if (status === "agent") return "agent";

    return "available";
}

/* =========================
   LOAD DATA
========================= */
async function loadData() {
    const res = await fetch(G_SCRIPT_URL);
    const raw = await res.json();

    allData = [];

    raw.forEach(row => {
        if (!row.boothid) return;

        row.boothid.split(",").forEach(id => {
            allData.push({
                boothid: id.trim(),
                status: mapStatus(row.status),
                exhibitor: row.exhibitor || ""
            });
        });
    });

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
  {name:"Hall 10", start:1001, end:1151}
];

/* =========================
   RENDER
========================= */
function renderFloor() {
    floor.innerHTML = "";

    hallConfig.forEach(hall => {
        const hallDiv = document.createElement("div");
        hallDiv.className = "hall";

        const h2 = document.createElement("h2");
        h2.innerText = hall.name;
        hallDiv.appendChild(h2);

        const grid = document.createElement("div");
        grid.className = "grid";

        for (let i = hall.start; i <= hall.end; i++) {
            grid.appendChild(createBooth(String(i)));
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

    const d = allData.find(x => x.boothid === id);

    if (d) {
        b.className = "booth " + d.status;
        b.dataset.tooltip = d.exhibitor || d.status;
    }

    b.onclick = (e) => {
        e.stopPropagation();

        panel.classList.remove("hidden");
        panelContent.innerHTML = `
            <b>Booth:</b> ${id}<br>
            <b>Status:</b> ${b.className.replace("booth ","")}<br>
            <b>Exhibitor:</b> ${d?.exhibitor || "-"}
        `;
    };

    return b;
}

/* =========================
   SEARCH
========================= */
searchBox.addEventListener("input", () => {
    const val = searchBox.value.toLowerCase();

    const list = allData.filter(x =>
        x.boothid.toLowerCase().includes(val) ||
        x.exhibitor.toLowerCase().includes(val)
    );

    suggestions.innerHTML = "";
    suggestions.style.display = "block";

    list.forEach(x => {
        const div = document.createElement("div");
        div.className = "suggestionItem";
        div.innerText = `${x.boothid} - ${x.exhibitor}`;

        div.onclick = () => {
            const el = [...document.querySelectorAll(".booth")]
                .find(b => b.innerText === x.boothid);

            if (el) {
                el.classList.add("highlight");

                setTimeout(() => {
                    el.classList.remove("highlight");
                }, 4000);

                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.click();
            }

            suggestions.style.display = "none";
        };

        suggestions.appendChild(div);
    });
});

/* =========================
   ZOOM
========================= */
document.getElementById("zoomIn").onclick = () => {
    zoomLevel += 0.1;
    floor.style.transform = `scale(${zoomLevel})`;
};
document.getElementById("zoomOut").onclick = () => {
    zoomLevel -= 0.1;
    floor.style.transform = `scale(${zoomLevel})`;
};

/* =========================
   DRAG
========================= */
let isDown = false, startX, startY, scrollLeft, scrollTop;

container.addEventListener("mousedown", e => {
    isDown = true;
    startX = e.pageX;
    startY = e.pageY;
    scrollLeft = container.scrollLeft;
    scrollTop = container.scrollTop;
});

container.addEventListener("mouseup", () => isDown = false);
container.addEventListener("mousemove", e => {
    if (!isDown) return;

    container.scrollLeft = scrollLeft - (e.pageX - startX);
    container.scrollTop = scrollTop - (e.pageY - startY);
});

/* CLOSE PANEL */
document.addEventListener("click", () => {
    panel.classList.add("hidden");
    suggestions.style.display = "none";
});

/* INIT */
loadData();
