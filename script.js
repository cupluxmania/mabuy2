const G_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzeXfwbFMaC8WH3th-aw5_PtMGTlz6UHMC5S5tWs9j1FW-G_Fszldy9QqiY5Zps-mFGQg/exec";

const floor = document.getElementById("floor");
const container = document.getElementById("floorContainer");

const searchBox = document.getElementById("searchBox");
const suggestions = document.getElementById("suggestions");

const sidePanel = document.getElementById("sidePanel");
const panelContent = document.getElementById("panelContent");

const zoomInBtn = document.getElementById("zoomIn");
const zoomOutBtn = document.getElementById("zoomOut");
const zoomLevelLabel = document.getElementById("zoomLevel");

let allData = {};

let chartInstance;
let databaseChart1;
let databaseChart2;

let zoomLevel = 1;

const halls = [
    { name: "Hall 5", start: 5001, end: 5078 },
    { name: "Hall 6", start: 6001, end: 6189 },
    { name: "Hall 7", start: 7001, end: 7196 },
    { name: "Hall 8", start: 8001, end: 8181 },
    { name: "Hall 9", start: 9001, end: 9191 },
    { name: "Hall 10", start: 1001, end: 1182 },
    { name: "Ambulance", start: "A", end: "J" }
];

/* =========================
   PAGE SWITCH
========================= */
function showPage(id){

    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    document.getElementById(id).classList.add("active");

    // Active nav button highlight
    document.querySelectorAll(".topNav button").forEach(btn => {
        btn.classList.remove("active");
        if(btn.getAttribute("onclick") && btn.getAttribute("onclick").includes(id)){
            btn.classList.add("active");
        }
    });
}

/* =========================
   LOAD FLOORPLAN DATA
========================= */
async function loadData(){

    try{

        const response = await fetch(
            `${G_SCRIPT_URL}?cmd=read&t=${Date.now()}`
        );

        const raw = await response.json();

        processData(raw);

    }catch(error){

        console.error(error);

    }
}

/* =========================
   LOAD DATABASE
========================= */
async function loadDatabase(){

    try{

        const response = await fetch(
            `${G_SCRIPT_URL}?cmd=database&t=${Date.now()}`
        );

        const data = await response.json();

        const table1 = data.table1 || [];
        const table2 = data.table2 || [];

        renderDatabaseTable(
            "databaseTable1",
            table1
        );

        renderDatabaseTable(
            "databaseTable2",
            table2
        );

        renderDatabaseCharts(
            table1,
            table2
        );

    }catch(error){

        console.error(error);

    }
}

/* =========================
   PROCESS DATA
========================= */
function processData(raw){

    const map = {};

    raw.forEach(row => {

        if(!row.boothid) return;

        const boothIds = String(row.boothid)
            .split(",")
            .map(x => x.trim());

        boothIds.forEach(id => {

            map[id] = {
                boothid: id,
                exhibitor: row.exhibitor || "",
                type: row.type || "",
                status: (row.status || "available").toLowerCase(),
                sqm: row.size || 0
            };

        });

    });

    allData = map;

    renderFloor();

    updateDashboard();
}

/* =========================
   GET HALL BOOTHS
========================= */
function getHallBoothIds(hall){

    const boothIds = [];

    Object.keys(allData).forEach(id => {

        if(hall.name === "Ambulance"){

            if(/^[A-Za-z]$/.test(id)){
                boothIds.push(id);
            }

            return;
        }

        const base = String(id).split("-")[0];

        const num = parseInt(base, 10);

        if(Number.isNaN(num)) return;

        if(num >= hall.start && num <= hall.end){
            boothIds.push(id);
        }

    });

    boothIds.sort((a, b) =>
        a.localeCompare(
            b,
            undefined,
            {
                numeric: true,
                sensitivity: "base"
            }
        )
    );

    return boothIds;
}

/* =========================
   RENDER FLOOR
========================= */
function renderFloor(){

    floor.innerHTML = "";

    halls.forEach(hall => {

        const hallDiv = document.createElement("div");

        hallDiv.className = "hall";

        hallDiv.innerHTML = `
            <div class="hall-header">
                <h3>${hall.name}</h3>
            </div>

            <div class="grid"></div>
        `;

        const grid = hallDiv.querySelector(".grid");

        const boothIds = getHallBoothIds(hall);

        boothIds.forEach(id => {

            const booth = createBooth(id);

            grid.appendChild(booth);

        });

        floor.appendChild(hallDiv);

    });
}

/* =========================
   CREATE BOOTH
========================= */
function createBooth(id){

    const data = allData[id];

    const booth = document.createElement("div");

    booth.className =
        "booth " + (data?.status || "available");

    booth.innerText = id;

    booth.dataset.id = id.toLowerCase();

    booth.onclick = (event) => {

        event.stopPropagation();

        highlightBooth(booth);

        sidePanel.classList.remove("hidden");

        const status = data?.status || "available";

        panelContent.innerHTML = `
            <div class="panel-header">
                <span class="panel-header-title">Booth ${id}</span>
                <span class="status-badge ${status}">${status.toUpperCase()}</span>
            </div>
            <div class="panel-body">
                <div class="panel-row">
                    <span class="panel-label">Exhibitor</span>
                    <span class="panel-value">${data?.exhibitor || "—"}</span>
                </div>
                <div class="panel-row">
                    <span class="panel-label">Type</span>
                    <span class="panel-value">${data?.type || "—"}</span>
                </div>
                <div class="panel-row">
                    <span class="panel-label">Size</span>
                    <span class="panel-value">${data?.sqm || 0} sqm</span>
                </div>
            </div>
        `;
    };

    return booth;
}

/* =========================
   BLINK EFFECT
========================= */
function highlightBooth(booth){

    document.querySelectorAll(".booth").forEach(item => {
        item.classList.remove("blink-booth");
    });

    booth.classList.add("blink-booth");

    setTimeout(() => {

        booth.classList.remove("blink-booth");

    }, 5000);
}

/* =========================
   SEARCH
========================= */
searchBox.addEventListener("input", () => {

    const value =
        searchBox.value.toLowerCase();

    if(!value){

        suggestions.style.display = "none";

        return;
    }

    const result = Object.values(allData).filter(item => {

        return (
            item.boothid.toLowerCase().includes(value) ||
            item.exhibitor.toLowerCase().includes(value)
        );

    });

    suggestions.innerHTML = "";

    result.slice(0, 50).forEach(item => {

        const div = document.createElement("div");

        div.className = "suggestionItem";

        div.innerText =
            `${item.boothid} - ${item.exhibitor}`;

        div.onclick = () => {

            goToBooth(item.boothid);

            suggestions.style.display = "none";
        };

        suggestions.appendChild(div);

    });

    suggestions.style.display =
        result.length ? "block" : "none";
});

/* =========================
   GO TO BOOTH
========================= */
function goToBooth(id){

    const booth = document.querySelector(
        `[data-id='${id.toLowerCase()}']`
    );

    if(!booth) return;

    booth.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center"
    });

    highlightBooth(booth);

    booth.click();
}

/* =========================
   UPDATE DASHBOARD
========================= */
function updateDashboard(){

    let sold = 0;
    let booked = 0;
    let available = 0;
    let agent = 0;

    Object.values(allData).forEach(item => {

        if(item.status === "sold") sold++;
        if(item.status === "booked") booked++;
        if(item.status === "available") available++;
        if(item.status === "agent") agent++;

    });

    renderDashboardCharts(
        sold,
        booked,
        available,
        agent
    );
}

/* =========================
   CHART OPTIONS
========================= */
function getChartOptions(){

    return {
        responsive: true,
        maintainAspectRatio: false,

        plugins: {

            legend: {
                labels: {
                    color: "#111827",
                    font: {
                        size: 15,
                        weight: "bold"
                    }
                }
            }

        },

        scales: {

            x: {
                ticks: {
                    color: "#111827",
                    font: {
                        size: 14,
                        weight: "bold"
                    }
                }
            },

            y: {
                ticks: {
                    color: "#111827",
                    font: {
                        size: 14,
                        weight: "bold"
                    }
                }
            }

        }

    };
}

/* =========================
   DASHBOARD CHARTS
========================= */
function renderDashboardCharts(
    sold,
    booked,
    available,
    agent
){

    if(chartInstance){
        chartInstance.destroy();
    }

    chartInstance = new Chart(
        document.getElementById("chart"),
        {
            type: "pie",
            data: {
                labels: [
                    "Sold",
                    "Booked",
                    "Available",
                    "Agent"
                ],
                datasets: [{
                    data: [
                        sold,
                        booked,
                        available,
                        agent
                    ]
                }]
            },
            options: getChartOptions()
        }
    );
}

/* =========================
   DATABASE TABLE
========================= */
function renderDatabaseTable(id, data){

    if(!data || !data.length) return;

    const table = document.getElementById(id);

    const thead =
        table.querySelector("thead");

    const tbody =
        table.querySelector("tbody");

    thead.innerHTML = `
        <tr>
            ${data[0]
                .map(header => `<th>${header}</th>`)
                .join("")}
        </tr>
    `;

    tbody.innerHTML = data
        .slice(1)
        .map(row => `
            <tr>
                ${row
                    .map(col => `<td>${col ?? ""}</td>`)
                    .join("")}
            </tr>
        `)
        .join("");
}

/* =========================
   DATABASE CHARTS
========================= */
function renderDatabaseCharts(table1, table2){

    const chartRows1 = table1.filter((row, index) => {

        if(index === 0) return false;

        return String(row[0]).toLowerCase() !== "total";

    });

    const labels = chartRows1.map(row => row[0]);

    const sqmAvailable = chartRows1.map(row =>
        Number(
            String(row[3] || 0).replace(/,/g, "")
        )
    );

    const standAvailable = chartRows1.map(row =>
        Number(
            String(row[6] || 0).replace(/,/g, "")
        )
    );

    const exhibitorAvailable = chartRows1.map(row =>
        Number(
            String(row[9] || 0).replace(/,/g, "")
        )
    );

    if(databaseChart1){
        databaseChart1.destroy();
    }

    databaseChart1 = new Chart(
        document.getElementById("databaseChart1"),
        {
            type: "bar",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "SQM Available",
                        data: sqmAvailable
                    },
                    {
                        label: "Stand Available",
                        data: standAvailable
                    },
                    {
                        label: "Booth Available",
                        data: exhibitorAvailable
                    }
                ]
            },
            options: getChartOptions()
        }
    );

    let local = 0;
    let overseas = 0;

    table2.forEach((row, index) => {

        if(index === 0) return;

        if(String(row[0]).toLowerCase() === "total"){
            return;
        }

        local += Number(
            String(row[5] || 0).replace(/,/g, "")
        );

        overseas += Number(
            String(row[6] || 0).replace(/,/g, "")
        );

    });

    if(databaseChart2){
        databaseChart2.destroy();
    }

    databaseChart2 = new Chart(
        document.getElementById("databaseChart2"),
        {
            type: "doughnut",
            data: {
                labels: [
                    `Stand Local (${local})`,
                    `Stand Overseas (${overseas})`
                ],
                datasets: [{
                    data: [
                        local,
                        overseas
                    ]
                }]
            },
            options: getChartOptions()
        }
    );
}

/* =========================
   ZOOM
========================= */
function updateZoom(value){

    zoomLevel = Math.min(
        2.5,
        Math.max(0.4, value)
    );

    floor.style.transform =
        `scale(${zoomLevel})`;

    zoomLevelLabel.innerText =
        `${Math.round(zoomLevel * 100)}%`;
}

zoomInBtn.addEventListener("click", () => {

    updateZoom(zoomLevel + 0.1);

});

zoomOutBtn.addEventListener("click", () => {

    updateZoom(zoomLevel - 0.1);

});

/* =========================
   DRAG SCROLL
========================= */
let isDown = false;

let startX;
let startY;

let scrollLeft;
let scrollTop;

container.addEventListener("mousedown", event => {

    isDown = true;

    container.style.cursor = "grabbing";

    startX = event.pageX;
    startY = event.pageY;

    scrollLeft = container.scrollLeft;
    scrollTop = container.scrollTop;
});

container.addEventListener("mouseup", () => {

    isDown = false;

    container.style.cursor = "grab";

});

container.addEventListener("mouseleave", () => {

    isDown = false;

    container.style.cursor = "grab";

});

container.addEventListener("mousemove", event => {

    if(!isDown) return;

    container.scrollLeft =
        scrollLeft - (event.pageX - startX);

    container.scrollTop =
        scrollTop - (event.pageY - startY);
});

/* =========================
   HIDE PANEL
========================= */
document.addEventListener("click", () => {

    sidePanel.classList.add("hidden");

    suggestions.style.display = "none";
});

/* =========================
   START
========================= */
loadData();

loadDatabase();
