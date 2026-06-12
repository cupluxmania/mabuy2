/* ── EVENT REGISTRY ── */
const EVENTS = {
    medan: {
        name: "Medan HOSPEX",
        location: "Medan, North Sumatra",
        venue: "Santika Premiere Dyandra",
        dates: "Feb 10–12, 2026",
        status: "ended",
        stripeColor: "#6366f1",
        scriptUrl: "https://script.google.com/macros/s/AKfycbwf0m1lhMyV87O1WZ_gSwBgrwzpPMSlp8-1qgo75GxAfSJexCDMSbAM3HSD7k9b6DNc/exec",
        halls: [
            { name: "Foyer",      prefix: "F", start: 1,  end: 17  },
            { name: "Exhibition", prefix: "C", start: 1,  end: 36  },
        ]
    },
    surabaya: {
        name: "Surabaya HOSPEX",
        location: "Surabaya, East Java",
        venue: "Grand City Convex",
        dates: "May 19–24, 2026",
        status: "ended",
        stripeColor: "#0ea5e9",
        scriptUrl: "https://script.google.com/macros/s/AKfycbyNAKmpX3ro5vvf9YtuJy0EX2hJYLPSvN_7KKl2jvDDozfKTnXXDvyhfTM9QY-DMhbm/exec",
        halls: [
            { name: "Foyer",      prefix : "F", start: 1, end: 14 },
            { name: "Exhibition", start: 1, end: 164 },
            { name: "Mall", prefixes: [
                { prefix: "A", start: 1, end: 2  },
                { prefix: "B", start: 1, end: 4  },
                { prefix: "C", start: 1, end: 24 },
            ]},
        ]
    },
    bali: {
        name: "Bali HOSPEX",
        location: "Bali",
        venue: "Bali Sunset Road",
        dates: "July 15–17, 2026",
        status: "upcoming",
        stripeColor: "#f59e0b",
        scriptUrl: "https://script.google.com/macros/s/AKfycbwQ_T-Q_bgehP_bL-B8H7uakaS0cUAckyDAKk259kobwdZun9IP8_gi--beDRD9K0zbWg/exec",
        halls: [
            { name: "Foyer",      prefix: "F", start: 1,  end: 15  },
            { name: "Convention", prefix: "B", start: 1,  end: 14  },
        ]
    },
    kars: {
        name: "KARS HOSPEX",
        location: "Bandung, West Java",
        venue: "Harris Hotel & Convention",
        dates: "August 5-7, 2026",
        status: "upcoming",
        stripeColor: "#22c55e",
        scriptUrl: "https://script.google.com/macros/s/AKfycbxToiP9DoVQHnDV4i16aVAlYIAHeSYFwNTRpsnedqza2fzrovWABkjuy1AHEmSjZslS/exec",
        halls: [
            { name: "Exhibition", start: 1, end: 32 },
        ]
    },
    intl: {
        name: "Int'l HOSPEX",
        location: "BSD City, Banten",
        venue: "ICE BSD",
        dates: "Oct 7–10, 2026",
        status: "active",
        stripeColor: "#ef4444",
        scriptUrl: "https://script.google.com/macros/s/AKfycbzeXfwbFMaC8WH3th-aw5_PtMGTlz6UHMC5S5tWs9j1FW-G_Fszldy9QqiY5Zps-mFGQg/exec",
        halls: [
            { name: "Hall 5",  start: 5001, end: 5078, columns: 6 },
            { name: "Hall 6",  start: 6001, end: 6189, columns: 8 },
            { name: "Hall 7",  start: 7001, end: 7196, columns: 8 },
            { name: "Hall 8",  start: 8001, end: 8181, columns: 8 },
            { name: "Hall 9",  start: 9001, end: 9191, columns: 8 },
            { name: "Hall 10", start: 1001, end: 1182, columns: 8 },
            { name: "Ambulance", start: "A", end: "J"  }
        ]
    }
};

/* ── RESOLVE CURRENT EVENT ── */
const params  = new URLSearchParams(location.search);
const eventId = params.get("id") || "intl";
const ev      = EVENTS[eventId] || EVENTS["intl"];
const initTab = params.get("tab") || "floor";

/* ── APPLY THEME ── */
document.documentElement.style.setProperty("--stripe", ev.stripeColor);
document.title = `Mabuy — ${ev.name}`;
document.getElementById("headerTitle").textContent = ev.name;
document.getElementById("headerDates").textContent = `${ev.venue} · ${ev.dates}`;

const statusEl = document.getElementById("headerStatus");
statusEl.className = `header-status ${ev.status}`;
statusEl.innerHTML = `<span class="hsdot"></span>${ev.status.charAt(0).toUpperCase()+ev.status.slice(1)}`;

/* ── DOM REFS ── */
const floor     = document.getElementById("floor");
const container = document.getElementById("floorContainer");
const searchBox = document.getElementById("searchBox");
const suggestEl = document.getElementById("suggestions");
const sidePanel = document.getElementById("sidePanel");
const panelContent = document.getElementById("panelContent");
const zoomInBtn    = document.getElementById("zoomIn");
const zoomOutBtn   = document.getElementById("zoomOut");
const zoomLevelLbl = document.getElementById("zoomLevel");

let allData = {};
let chartInstance, databaseChart1, databaseChart2;
let zoomLevel = 1;

/* ── DATABASE CACHE (for export) ── */
let cachedTable1 = [], cachedTable2 = [];

/* ── PAGE SWITCH ── */
function showPage(id) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    document.querySelectorAll(".topNav button").forEach(b => {
        b.classList.remove("active");
        if(b.getAttribute("onclick")?.includes(id)) b.classList.add("active");
    });
    const u = new URL(location.href);
    u.searchParams.set("tab", id === "floorPage" ? "floor" : "overview");
    history.replaceState(null, "", u.toString());
}

if(initTab === "overview") showPage("databasePage");

/* ── LOAD FLOOR DATA ── */
async function loadData() {
    try {
        const r   = await fetch(`${ev.scriptUrl}?cmd=read&t=${Date.now()}`);
        const raw = await r.json();
        processData(raw);
    } catch(e) {
        floor.innerHTML = `<div class="empty-state">
            <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            <p>Could not load floor data</p>
            <small>${e.message}</small>
        </div>`;
    }
}

/* ── LOAD DATABASE ── */
async function loadDatabase() {
    try {
        const r    = await fetch(`${ev.scriptUrl}?cmd=database&t=${Date.now()}`);
        const raw  = await r.json();

        let t1 = [], t2 = [];
        if (Array.isArray(raw)) {
            t1 = raw;
        } else {
            t1 = raw.table1 || [];
            t2 = raw.table2 || [];
        }

        const splitIdx = t1.findIndex((row, i) => {
            if (i === 0) return false;
            const joined = row.map(c => String(c || "").toLowerCase()).join(" ");
            return (
                joined.includes("space only") ||
                joined.includes("standard booth") ||
                (joined.includes("lokal") && joined.includes("area"))
            );
        });
        if (splitIdx > 0) {
            if (!t2.length) {
                t2 = t1.slice(splitIdx);
                t1 = t1.slice(0, splitIdx);
            } else {
                t1 = t1.slice(0, splitIdx);
            }
        }

        t1 = t1.filter(row => {
            const joined = row.map(c => String(c || "").toLowerCase()).join(" ");
            return !(joined.includes("space only") || joined.includes("standard booth"));
        });

        const t2HasData = t2.some(row => row.some(cell => String(cell||"").trim() !== ""));

        if (!t2HasData && t1.length > 1) {
            const hdr = t1[0].map(h => String(h||"").toLowerCase());
            const areaCol     = hdr.findIndex(h => h.includes("area"));
            const standAwal   = hdr.findIndex(h => h.includes("stand") && h.includes("awal"));
            const standTerjual= hdr.findIndex(h => h.includes("stand") && h.includes("terjual"));
            const standSedia  = hdr.findIndex(h => h.includes("stand") && h.includes("tersedia") || h.includes("stand") && h.includes("sedia"));

            const rows = t1.slice(1).filter(r => {
                const a = String(r[areaCol]||"").toLowerCase();
                return a && a !== "total";
            });

            t2 = [["Area", "Stand Awal", "Stand Terjual", "Stand Tersedia", "Stand Lokal", "Stand Overseas"]];
            let totAwal=0, totTerjual=0, totSedia=0;
            rows.forEach(r => {
                const awal    = Number(r[standAwal]    || 0);
                const terjual = Number(r[standTerjual] || 0);
                const sedia   = Number(r[standSedia]   || 0);
                totAwal += awal; totTerjual += terjual; totSedia += sedia;
                t2.push([r[areaCol], awal, terjual, sedia, terjual, 0]);
            });
            t2.push(["Total", totAwal, totTerjual, totSedia, totTerjual, 0]);
        }

        cachedTable1 = t1;
        cachedTable2 = t2;

        renderDatabaseTable("databaseTable1", t1);
        renderDatabaseTable("databaseTable2", t2);
        renderDatabaseCharts(t1, t2);
    } catch(e) {
        console.error("Database load failed", e);
    }
}

/* ── PROCESS DATA ── */
function processData(raw) {
    // Debug: log first row's keys so we can verify field names from GAS
    if (raw && raw.length > 0) {
        console.log("[mabuy debug] raw row keys:", Object.keys(raw[0]));
        console.log("[mabuy debug] first row sample:", raw[0]);
    }
    const map = {};
    raw.forEach(row => {
        if(!row.boothid) return;
        // Country: GAS lowercases header "COUNTRY" → "country"
        const country = (row.country || row.COUNTRY || "").toString().trim();

        // G/W: header "G/W" — GAS may key it as "g/w", "gw", "g_w", or strip to just the value
        // Also check "NARIK G/W" column (short: G or W)
        const gwRaw = (
            row["g/w"] || row["G/W"] || row.gw || row.GW ||
            row["narik g/w"] || row["narik_g/w"] || row["narik gw"] || row.narikgw || ""
        ).toString().trim().toLowerCase();

        const countryLower = country.toLowerCase().trim();
        const isIndonesia = countryLower.includes("indonesia");

        // G/W and country are INDEPENDENT — a booth can be Green AND Local at the same time
        let gwCategory = "";
        if      (/^green$/i.test(gwRaw)     || gwRaw === "g") gwCategory = "green";
        else if (/^white$/i.test(gwRaw)     || gwRaw === "w") gwCategory = "white";
        else if (/^ambulance$/i.test(gwRaw) || gwRaw === "a") gwCategory = "ambulance";

        let origin = "";
        if      (isIndonesia)  origin = "local";
        else if (countryLower) origin = "overseas";

        // tags: all categories this booth belongs to
        const tags = [];
        if (gwCategory) tags.push(gwCategory);
        if (origin)     tags.push(origin);

        String(row.boothid).split(",").map(x => x.trim()).forEach(id => {
            map[id] = {
                boothid: id,
                exhibitor: row.exhibitor || "",
                type: row.type || "",
                status: (row.status || "available").toLowerCase(),
                sqm: row.size || 0,
                country: country,
                gw: gwRaw,
                gwCategory: gwCategory,
                origin: origin,
                tags: tags
            };
        });
    });
    allData = map;
    renderFloor();
    updateKPIs();
    buildSqmFilters();
    applyFilter();
}

/* ── GET HALL BOOTHS ── */
function getHallBoothIds(hall) {
    const ids = [];
    Object.keys(allData).forEach(id => {
        if(hall.name === "Ambulance") {
            if(/^[A-Za-z]$/.test(id)) ids.push(id);
            return;
        }
        if(hall.prefixes) {
            const matched = hall.prefixes.some(p => {
                const re = new RegExp(`^${p.prefix}(\\d+)$`, "i");
                const m  = String(id).match(re);
                if(!m) return false;
                const num = parseInt(m[1], 10);
                return num >= p.start && num <= p.end;
            });
            if(matched) ids.push(id);
            return;
        }
        if(hall.prefix) {
            const re = new RegExp(`^${hall.prefix}(\\d+)$`, "i");
            const m  = String(id).match(re);
            if(m) {
                const num = parseInt(m[1], 10);
                if(num >= hall.start && num <= hall.end) ids.push(id);
            }
            return;
        }
        const base = String(id).split("-")[0];
        const num  = parseInt(base, 10);
        if(Number.isNaN(num)) return;
        if(num >= hall.start && num <= hall.end) ids.push(id);
    });
    ids.sort((a,b) => a.localeCompare(b, undefined, { numeric:true, sensitivity:"base" }));
    return ids;
}

/* ── RENDER FLOOR ── */
function renderFloor() {
    floor.innerHTML = "";
    const hallCount = ev.halls.length;
    floor.classList.toggle("centered", hallCount <= 3);
    ev.halls.forEach(hall => {
        const hallDiv = document.createElement("div");
        hallDiv.className = "hall";
        const cols = hall.columns || 8;
        hallDiv.innerHTML = `
            <div class="grid" style="grid-template-columns:repeat(${cols},70px)"></div>
            <div class="hall-header"><h3>${hall.name}</h3></div>
        `;
        const grid = hallDiv.querySelector(".grid");
        getHallBoothIds(hall).forEach(id => grid.appendChild(createBooth(id)));
        floor.appendChild(hallDiv);
    });
}

/* ── COUNTRY COLOR MAP (matches PDF legend) ── */
const COUNTRY_COLORS = {
    "china partner 1":  { bg: "#fef08a", border: "#ca8a04", text: "#713f12" },
    "china (partner 1)": { bg: "#fef08a", border: "#ca8a04", text: "#713f12" },
    "china partner 2":  { bg: "#fed7aa", border: "#ea580c", text: "#7c2d12" },
    "china (partner 2)": { bg: "#fed7aa", border: "#ea580c", text: "#7c2d12" },
    "china":     { bg: "#fef08a", border: "#ca8a04", text: "#713f12" },
    "canada":    { bg: "#a5f3fc", border: "#0891b2", text: "#164e63" },
    "india":     { bg: "#67e8f9", border: "#0e7490", text: "#164e63" },
    "indonesia": { bg: "#bfdbfe", border: "#3b82f6", text: "#1e3a8a" },
    "korea":     { bg: "#e5e7eb", border: "#6b7280", text: "#374151" },
    "south korea": { bg: "#e5e7eb", border: "#6b7280", text: "#374151" },
    "malaysia":  { bg: "#d9f99d", border: "#65a30d", text: "#3f6212" },
    "taiwan":    { bg: "#fbcfe8", border: "#db2777", text: "#831843" },
    "thailand":  { bg: "#d6d3d1", border: "#78716c", text: "#44403c" },
    "singapore": { bg: "#ddd6fe", border: "#7c3aed", text: "#4c1d95" },
    "japan":     { bg: "#fce7f3", border: "#be185d", text: "#831843" },
    "usa":       { bg: "#fee2e2", border: "#dc2626", text: "#7f1d1d" },
    "united states": { bg: "#fee2e2", border: "#dc2626", text: "#7f1d1d" },
    "germany":   { bg: "#fef9c3", border: "#a16207", text: "#713f12" },
    "netherlands":{ bg: "#ffedd5", border: "#c2410c", text: "#7c2d12" },
    "uk":        { bg: "#ede9fe", border: "#6d28d9", text: "#4c1d95" },
    "united kingdom": { bg: "#ede9fe", border: "#6d28d9", text: "#4c1d95" },
};
function getCountryColor(country) {
    if (!country) return null;
    return COUNTRY_COLORS[country.toLowerCase().trim()] || null;
}

/* ── CREATE BOOTH ── */
function createBooth(id) {
    const data  = allData[id];
    const booth = document.createElement("div");
    const status = data?.status || "available";
    booth.className  = "booth " + status;
    booth.innerText  = id;
    booth.dataset.id = id.toLowerCase();
    if (data?.category) booth.dataset.category = data.category;
    // Country color: only on available booths — sold/booked use their status color
    if (data?.country && status === "available") {
        const cc = getCountryColor(data.country);
        if (cc) { booth.style.background = cc.bg; booth.style.borderColor = cc.border; booth.style.color = cc.text; }
    }
    booth.onclick = (e) => {
        e.stopPropagation();
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
                ${data?.country ? `<div class="panel-row">
                    <span class="panel-label">Country</span>
                    <span class="panel-value">${data.country.charAt(0).toUpperCase()+data.country.slice(1).toLowerCase()}</span>
                </div>` : ""}
                ${data?.tags?.length ? `<div class="panel-row">
                    <span class="panel-label">Category</span>
                    <span class="panel-value" style="display:flex;gap:6px;flex-wrap:wrap">${data.tags.map(t => `<span class="panel-category ${t}">${t.charAt(0).toUpperCase()+t.slice(1)}</span>`).join("")}</span>
                </div>` : ""}
            </div>
        `;
    };
    return booth;
}

/* ── BLINK ── */
function highlightBooth(booth) {
    document.querySelectorAll(".booth").forEach(b => b.classList.remove("blink-booth"));
    booth.classList.add("blink-booth");
    setTimeout(() => booth.classList.remove("blink-booth"), 5000);
}

/* ── SEARCH ── */
searchBox.addEventListener("input", () => {
    const v = searchBox.value.toLowerCase();
    if(!v) { suggestEl.style.display = "none"; return; }
    const result = Object.values(allData).filter(item =>
        item.boothid.toLowerCase().includes(v) ||
        item.exhibitor.toLowerCase().includes(v)
    );
    suggestEl.innerHTML = "";
    result.slice(0,50).forEach(item => {
        const div = document.createElement("div");
        div.className = "suggestionItem";
        div.innerText = `${item.boothid} - ${item.exhibitor}`;
        div.onclick = () => {
            goToBooth(item.boothid);
            suggestEl.style.display = "none";
        };
        suggestEl.appendChild(div);
    });
    suggestEl.style.display = result.length ? "block" : "none";
});

function goToBooth(id) {
    const booth = document.querySelector(`[data-id='${id.toLowerCase()}']`);
    if(!booth) return;
    booth.scrollIntoView({ behavior:"smooth", block:"center", inline:"center" });
    highlightBooth(booth);
    booth.click();
}

/* ── KPIS ── */
function updateKPIs() {
    let sold=0, booked=0, avail=0, local=0, overseas=0, green=0, white=0, ambulance=0;
    Object.values(allData).forEach(item => {
        if(item.status === "sold")      sold++;
        if(item.status === "booked")    booked++;
        if(item.status === "available") avail++;
        if(item.origin === "local")         local++;
        if(item.origin === "overseas")      overseas++;
        if(item.gwCategory === "green")     green++;
        if(item.gwCategory === "white")     white++;
        if(item.gwCategory === "ambulance") ambulance++;
    });
    document.getElementById("kpi-sold").textContent      = sold;
    document.getElementById("kpi-booked").textContent    = booked;
    document.getElementById("kpi-avail").textContent     = avail;
    document.getElementById("kpi-local").textContent     = local;
    document.getElementById("kpi-overseas").textContent  = overseas;
    document.getElementById("kpi-green").textContent     = green;
    document.getElementById("kpi-white").textContent     = white;
    document.getElementById("kpi-ambulance").textContent = ambulance;
    renderStatusChart(sold, booked, avail, local, overseas, green, white, ambulance);
}

/* ── CHART OPTIONS ── */
function getChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color:"#111827", font:{ size:15, weight:"bold" } } }
        },
        scales: {
            x: { ticks: { color:"#111827", font:{ size:14, weight:"bold" } } },
            y: { ticks: { color:"#111827", font:{ size:14, weight:"bold" } } }
        }
    };
}

function renderStatusChart(sold, booked, avail, local, overseas, green, white, ambulance) {
    if(chartInstance) chartInstance.destroy();
    const labels = [], data = [], colors = [];
    if(sold)      { labels.push("Sold");      data.push(sold);      colors.push("#ef4444"); }
    if(booked)    { labels.push("Booked");    data.push(booked);    colors.push("#f59e0b"); }
    if(avail)     { labels.push("Available"); data.push(avail);     colors.push("#3b82f6"); }
    if(local)     { labels.push("Local");     data.push(local);     colors.push("#6366f1"); }
    if(overseas)  { labels.push("Overseas");  data.push(overseas);  colors.push("#f97316"); }
    if(green)     { labels.push("Green");     data.push(green);     colors.push("#22c55e"); }
    if(white)     { labels.push("White");     data.push(white);     colors.push("#94a3b8"); }
    if(ambulance) { labels.push("Ambulance"); data.push(ambulance); colors.push("#ec4899"); }
    chartInstance = new Chart(document.getElementById("chart"), {
        type: "pie",
        data: { labels, datasets: [{ data, backgroundColor: colors }] },
        options: getChartOptions()
    });
}

/* ── DATABASE TABLE ── */
function renderDatabaseTable(id, data) {
    if(!data || !data.length) return;
    const table = document.getElementById(id);
    table.querySelector("thead").innerHTML =
        `<tr>${data[0].map(h => `<th>${h}</th>`).join("")}</tr>`;
    table.querySelector("tbody").innerHTML =
        data.slice(1).map(row =>
            `<tr>${row.map(col => `<td>${col ?? ""}</td>`).join("")}</tr>`
        ).join("");
}

/* ── DATABASE CHARTS ── */
function renderDatabaseCharts(table1, table2) {
    const chartRows = table1.filter((row, i) => i !== 0 && String(row[0]).toLowerCase() !== "total");
    const labels    = chartRows.map(row => row[0]);

    const h1 = (table1[0] || []).map(h => String(h||"").toLowerCase());
    const sqmCol   = h1.findIndex(h => h.includes("sqm")   && (h.includes("tersedia") || h.includes("sedia") || h.includes("avail")));
    const standCol = h1.findIndex(h => h.includes("stand") && (h.includes("tersedia") || h.includes("sedia") || h.includes("avail")));
    const boothCol = h1.findIndex(h => h.includes("booth") && (h.includes("tersedia") || h.includes("sedia") || h.includes("avail")));

    const sqmA   = chartRows.map(row => Number(String(row[sqmCol   >= 0 ? sqmCol   : 3]||0).replace(/,/g,"")));
    const standA = chartRows.map(row => Number(String(row[standCol >= 0 ? standCol : 6]||0).replace(/,/g,"")));
    const boothA = chartRows.map(row => Number(String(row[boothCol >= 0 ? boothCol : 9]||0).replace(/,/g,"")));

    if(databaseChart1) databaseChart1.destroy();
    databaseChart1 = new Chart(document.getElementById("databaseChart1"), {
        type: "bar",
        data: {
            labels,
            datasets: [
                { label:"SQM Available",   data: sqmA,   backgroundColor:"#3b82f6" },
                { label:"Stand Available", data: standA, backgroundColor:"#f59e0b" },
                { label:"Booth Available", data: boothA, backgroundColor:"#22c55e" }
            ]
        },
        options: getChartOptions()
    });

    let localCol = 3, overseasCol = 4;
    if (table2.length) {
        const hdr = table2[0].map(h => String(h||"").toLowerCase());
        const li = hdr.findIndex(h => h.includes("lokal") || h.includes("local"));
        const oi = hdr.findIndex(h => h.includes("overseas"));
        if (li >= 0) localCol = li;
        if (oi >= 0) overseasCol = oi;
    }
    let local=0, overseas=0;
    table2.forEach((row, i) => {
        if(i===0 || String(row[0]).toLowerCase() === "total") return;
        local    += Number(String(row[localCol]||0).replace(/,/g,""));
        overseas += Number(String(row[overseasCol]||0).replace(/,/g,""));
    });

    if(databaseChart2) databaseChart2.destroy();
    databaseChart2 = new Chart(document.getElementById("databaseChart2"), {
        type: "doughnut",
        data: {
            labels: [`Stand Local (${local})`, `Stand Overseas (${overseas})`],
            datasets: [{ data:[local, overseas], backgroundColor:["#1d4ed8","#f59e0b"] }]
        },
        options: getChartOptions()
    });
}

/* ── ZOOM ── */
function updateZoom(v) {
    zoomLevel = Math.min(2.5, Math.max(0.4, v));
    floor.style.transform = `scale(${zoomLevel})`;
    zoomLevelLbl.textContent = `${Math.round(zoomLevel*100)}%`;
}
zoomInBtn.addEventListener("click",  () => updateZoom(zoomLevel + 0.1));
zoomOutBtn.addEventListener("click", () => updateZoom(zoomLevel - 0.1));

/* ── DRAG SCROLL ── */
let isDown=false, startX, startY, scrollLeft, scrollTop;
container.addEventListener("mousedown", e => {
    isDown=true; container.style.cursor="grabbing";
    startX=e.pageX; startY=e.pageY;
    scrollLeft=container.scrollLeft; scrollTop=container.scrollTop;
});
container.addEventListener("mouseup",    () => { isDown=false; container.style.cursor="grab"; });
container.addEventListener("mouseleave", () => { isDown=false; container.style.cursor="grab"; });
container.addEventListener("mousemove", e => {
    if(!isDown) return;
    container.scrollLeft = scrollLeft - (e.pageX - startX);
    container.scrollTop  = scrollTop  - (e.pageY - startY);
});

/* ── HIDE PANEL ── */
document.addEventListener("click", () => {
    sidePanel.classList.add("hidden");
    suggestEl.style.display = "none";
});

/* ════════════════════════════════════════
   MULTI-FILTER
   Status filters  (sold/booked/available) → OR within group
   Tag filters (local/overseas/green/white/ambulance) → AND (booth must match ALL selected)
   Status group AND tag group combine with AND between them
   ════════════════════════════════════════ */
const STATUS_FILTERS = new Set(["sold", "booked", "available"]);
const TAG_FILTERS    = new Set(["local", "overseas", "green", "white", "ambulance"]);
const activeFilters  = new Set();

function toggleFilter(f) {
    if (activeFilters.has(f)) {
        activeFilters.delete(f);
    } else {
        activeFilters.add(f);
    }
    applyFilter();
}

function resetFilter() {
    activeFilters.clear();
    applyFilter();
}

/* ════════════════════════════════════════
   SQM FILTER
   ════════════════════════════════════════ */
const activeSqmFilters = new Set();

function buildSqmFilters() {
    const sizes = new Set();
    Object.values(allData).forEach(d => {
        const s = Number(d.sqm);
        if (s > 0) sizes.add(s);
    });
    if (sizes.size === 0) return;

    const sorted = [...sizes].sort((a, b) => a - b);
    const sqmContainer = document.getElementById("sqmFilters");
    sqmContainer.innerHTML = "";
    sorted.forEach(s => {
        const btn = document.createElement("div");
        btn.className = "legendItem sqmItem";
        btn.dataset.sqm = s;
        btn.innerHTML = `<span class="sqm-icon">◻</span>${s} sqm`;
        btn.onclick = () => toggleSqmFilter(s);
        sqmContainer.appendChild(btn);
    });

    document.getElementById("sqmLegend").style.display = "flex";
}

function toggleSqmFilter(sqm) {
    if (activeSqmFilters.has(sqm)) {
        activeSqmFilters.delete(sqm);
    } else {
        activeSqmFilters.add(sqm);
    }
    applyFilter();
}

function resetSqmFilter() {
    activeSqmFilters.clear();
    applyFilter();
}

/* ════════════════════════════════════════
   COMBINED APPLY FILTER
   ════════════════════════════════════════ */
function applyFilter() {
    const legendItems = document.querySelectorAll("#statusLegend .legendItem");
    const sqmItems    = document.querySelectorAll(".sqmItem");
    const booths      = document.querySelectorAll(".booth");

    const noStatusFilter = activeFilters.size === 0;
    const noSqmFilter    = activeSqmFilters.size === 0;

    // Status reset button
    const statusResetBtn = document.getElementById("statusResetBtn");
    if (statusResetBtn) statusResetBtn.classList.toggle("visible", !noStatusFilter);

    // Sqm reset button
    const sqmResetBtn = document.getElementById("sqmResetBtn");
    if (sqmResetBtn) sqmResetBtn.classList.toggle("visible", !noSqmFilter);

    // Status legend item states
    legendItems.forEach(li => {
        const f = li.dataset.filter;
        li.classList.toggle("legend-active", !noStatusFilter && activeFilters.has(f));
        li.classList.toggle("legend-dimmed",  !noStatusFilter && !activeFilters.has(f));
    });

    // Sqm item states
    sqmItems.forEach(btn => {
        const s = Number(btn.dataset.sqm);
        btn.classList.toggle("legend-active", !noSqmFilter && activeSqmFilters.has(s));
        btn.classList.toggle("legend-dimmed",  !noSqmFilter && !activeSqmFilters.has(s));
    });

    // Build lookup
    const lowerMap = {};
    Object.entries(allData).forEach(([key, val]) => {
        lowerMap[key.toLowerCase()] = val;
    });

    // Separate active filters into status group and tag group
    const activeStatusFilters = [...activeFilters].filter(f => STATUS_FILTERS.has(f));
    const activeTagFilters    = [...activeFilters].filter(f => TAG_FILTERS.has(f));

    booths.forEach(b => {
        const d = lowerMap[b.dataset.id];
        const boothStatus = d?.status || "available";
        const boothTags   = d?.tags   || [];
        const boothSqm    = Number(d?.sqm || 0);

        // Status group: booth matches if no status filter selected OR its status is in selected statuses
        const passesStatus = activeStatusFilters.length === 0
            || activeStatusFilters.includes(boothStatus);

        // Tag group: booth must have ALL selected tags (AND logic)
        const passesTags = activeTagFilters.length === 0
            || activeTagFilters.every(t => boothTags.includes(t));

        // SQM: booth must match any selected sqm (OR within sqm group)
        const passesSqm = noSqmFilter || activeSqmFilters.has(boothSqm);

        b.classList.toggle("booth-dimmed", !(passesStatus && passesTags && passesSqm));
    });

    // Show matched count when any filter is active
    const anyFilter = activeFilters.size > 0 || activeSqmFilters.size > 0;
    const matched   = [...booths].filter(b => !b.classList.contains("booth-dimmed")).length;
    const countEl   = document.getElementById("filterCount");
    const countNum  = document.getElementById("filterCountNum");
    if (countEl) {
        countEl.style.display = anyFilter ? "inline-flex" : "none";
        if (countNum) countNum.textContent = matched;
    }
}

/* ════════════════════════════════════════
   EXPORT — EXCEL
   ════════════════════════════════════════ */
function exportExcel() {
    if (typeof XLSX === "undefined") {
        alert("SheetJS not loaded yet, please wait a moment and try again.");
        return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Booth List (all booths from allData)
    const boothRows = [["Booth ID", "Exhibitor", "Type", "Size (sqm)", "Status"]];
    Object.values(allData).forEach(d => {
        boothRows.push([d.boothid, d.exhibitor, d.type, d.sqm, d.status]);
    });
    const ws1 = XLSX.utils.aoa_to_sheet(boothRows);
    // Color header row
    const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "0F172A" } } };
    XLSX.utils.book_append_sheet(wb, ws1, "Booth List");

    // Sheet 2: Database Summary
    if (cachedTable1.length) {
        const ws2 = XLSX.utils.aoa_to_sheet(cachedTable1);
        XLSX.utils.book_append_sheet(wb, ws2, "Database Summary");
    }

    // Sheet 3: Booth Type Summary
    if (cachedTable2.length) {
        const ws3 = XLSX.utils.aoa_to_sheet(cachedTable2);
        XLSX.utils.book_append_sheet(wb, ws3, "Booth Type Summary");
    }

    const filename = `${ev.name.replace(/[^a-z0-9]/gi, "_")}_Export_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, filename);
}

/* ════════════════════════════════════════
   EXPORT — PDF
   ════════════════════════════════════════ */
function exportPDF() {
    if (typeof window.jspdf === "undefined") {
        alert("jsPDF not loaded yet, please wait a moment and try again.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const pageW = doc.internal.pageSize.getWidth();
    const navy  = [15, 23, 42];
    const white = [255, 255, 255];
    const light = [240, 244, 248];

    // ── Header bar
    doc.setFillColor(...navy);
    doc.rect(0, 0, pageW, 20, "F");
    doc.setTextColor(...white);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(ev.name, 12, 13);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`${ev.venue} · ${ev.dates}`, pageW - 12, 13, { align: "right" });

    // ── KPI summary row
    let sold=0, booked=0, avail=0, agent=0;
    Object.values(allData).forEach(d => {
        if(d.status==="sold")      sold++;
        if(d.status==="booked")    booked++;
        if(d.status==="available") avail++;
        if(d.status==="agent")     agent++;
    });
    const kpis = [
        { label:"Sold",      value:sold,   color:[239,68,68]  },
        { label:"Booked",    value:booked, color:[245,158,11] },
        { label:"Available", value:avail,  color:[59,130,246] },
        { label:"Agent",     value:agent,  color:[34,197,94]  },
    ];
    const kpiW = (pageW - 24) / 4;
    kpis.forEach((k, i) => {
        const x = 12 + i * (kpiW + 4);
        doc.setFillColor(...light);
        doc.roundedRect(x, 24, kpiW, 18, 2, 2, "F");
        doc.setFillColor(...k.color);
        doc.roundedRect(x, 24, 4, 18, 1, 1, "F");
        doc.setTextColor(...navy);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(String(k.value), x + 8, 34);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(107, 114, 128);
        doc.text(k.label.toUpperCase(), x + 8, 39);
    });

    // ── Booth list table
    let y = 48;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...navy);
    doc.text("BOOTH LIST", 12, y);
    y += 4;

    const cols   = ["Booth ID", "Exhibitor", "Type", "Size (sqm)", "Status"];
    const colW   = [28, 90, 50, 28, 28];
    const rowH   = 7;

    // Table header
    doc.setFillColor(...navy);
    doc.rect(12, y, pageW - 24, rowH, "F");
    doc.setTextColor(...white);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    let cx = 14;
    cols.forEach((c, i) => { doc.text(c, cx, y + 5); cx += colW[i]; });
    y += rowH;

    // Table rows
    const statusColors = {
        sold:      [239,68,68],
        booked:    [245,158,11],
        available: [59,130,246],
        agent:     [34,197,94],
    };
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    let rowIdx = 0;
    Object.values(allData).forEach(d => {
        if (y > doc.internal.pageSize.getHeight() - 12) {
            doc.addPage();
            y = 12;
            // Re-draw header on new page
            doc.setFillColor(...navy);
            doc.rect(12, y, pageW - 24, rowH, "F");
            doc.setTextColor(...white);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            cx = 14;
            cols.forEach((c, i) => { doc.text(c, cx, y + 5); cx += colW[i]; });
            y += rowH;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            rowIdx = 0;
        }
        if (rowIdx % 2 === 0) {
            doc.setFillColor(...light);
            doc.rect(12, y, pageW - 24, rowH, "F");
        }
        doc.setTextColor(...navy);
        cx = 14;
        const cells = [d.boothid, d.exhibitor, d.type, String(d.sqm), ""];
        cells.forEach((cell, i) => {
            const txt = String(cell || "");
            // Truncate if too wide
            const maxChars = Math.floor(colW[i] / 1.8);
            doc.text(txt.length > maxChars ? txt.slice(0, maxChars) + "…" : txt, cx, y + 5);
            cx += colW[i];
        });
        // Status badge color dot
        const sc = statusColors[d.status] || navy;
        doc.setFillColor(...sc);
        doc.circle(cx - colW[4] + 3, y + 3.5, 1.8, "F");
        doc.setTextColor(...sc);
        doc.text((d.status||"").toUpperCase(), cx - colW[4] + 7, y + 5);

        y += rowH;
        rowIdx++;
    });

    // ── Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        const ph = doc.internal.pageSize.getHeight();
        doc.setFillColor(...navy);
        doc.rect(0, ph - 8, pageW, 8, "F");
        doc.setTextColor(...white);
        doc.setFontSize(7);
        doc.text(`${ev.name} — Exported ${new Date().toLocaleDateString()}`, 12, ph - 3);
        doc.text(`Page ${p} of ${pageCount}`, pageW - 12, ph - 3, { align: "right" });
    }

    const filename = `${ev.name.replace(/[^a-z0-9]/gi, "_")}_Export_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(filename);
}

/* ── START ── */
loadData();
loadDatabase();
