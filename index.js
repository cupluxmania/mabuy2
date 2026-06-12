const EVENTS = [
    {
        id: "medan",
        name: "Medan HOSPEX",
        location: "Medan, North Sumatra",
        venue: "Santika Premiere Dyandra",
        dates: "Feb 10–12, 2026",
        status: "ended",
        stripeColor: "#6366f1",
        halls: ["Foyer - M", "Convention - M"],
        scriptUrl: "https://script.google.com/macros/s/AKfycbwf0m1lhMyV87O1WZ_gSwBgrwzpPMSlp8-1qgo75GxAfSJexCDMSbAM3HSD7k9b6DNc/exec",
    },
    {
        id: "surabaya",
        name: "Surabaya HOSPEX",
        location: "Surabaya, East Java",
        venue: "Grand City Convex",
        dates: "May 19–24, 2026",
        status: "ended",
        stripeColor: "#0ea5e9",
        halls: ["Foyer - S", "Exhibition - S", "Mall"],
        scriptUrl: "https://script.google.com/macros/s/AKfycbyNAKmpX3ro5vvf9YtuJy0EX2hJYLPSvN_7KKl2jvDDozfKTnXXDvyhfTM9QY-DMhbm/exec",
    },
    {
        id: "bali",
        name: "Bali HOSPEX",
        location: "Bali",
        venue: "Bali Sunset Road",
        dates: "July 15–17, 2026",
        status: "upcoming",
        stripeColor: "#f59e0b",
        halls: ["Hall Bali 1", "Hall Bali 2"],
        scriptUrl: "https://script.google.com/macros/s/AKfycbwQ_T-Q_bgehP_bL-B8H7uakaS0cUAckyDAKk259kobwdZun9IP8_gi--beDRD9K0zbWg/exec",
    },
    {
        id: "kars",
        name: "KARS HOSPEX",
        location: "Bandung, West Java",
        venue: "Harris Hotel & Convention",
        dates: "Aug 5–7, 2026",
        status: "upcoming",
        stripeColor: "#22c55e",
        halls: ["Hall A"],
        scriptUrl: "https://script.google.com/macros/s/AKfycbxToiP9DoVQHnDV4i16aVAlYIAHeSYFwNTRpsnedqza2fzrovWABkjuy1AHEmSjZslS/exec",
    },
    {
        id: "intl",
        name: "Int'l HOSPEX",
        location: "BSD City, Banten",
        venue: "ICE BSD",
        dates: "Oct 7–10, 2026",
        status: "upcoming",
        stripeColor: "#ef4444",
        halls: ["Hall 5","Hall 6","Hall 7","Hall 8","Hall 9","Hall 10","Ambulance"],
        scriptUrl: "https://script.google.com/macros/s/AKfycbzeXfwbFMaC8WH3th-aw5_PtMGTlz6UHMC5S5tWs9j1FW-G_Fszldy9QqiY5Zps-mFGQg/exec",
    }
];

const STATUS_LABEL = { active: "Active", upcoming: "Upcoming", ended: "Ended" };

function buildCard(ev) {
    const card = document.createElement("div");
    card.className = "event-card";
    card.innerHTML = `
        <div class="card-stripe" style="background:${ev.stripeColor}"></div>
        <div class="card-body">
            <div class="card-eyebrow">${ev.location.toUpperCase()}</div>
            <div class="card-name">${ev.name}</div>
            <div class="card-status ${ev.status}">
                <span class="status-dot"></span>
                ${STATUS_LABEL[ev.status] || ev.status}
            </div>
            <div class="card-meta">
                <span class="meta-tag meta-date">
                    <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    ${ev.dates}
                </span>
                <div class="card-meta-row">
                    <span class="meta-tag meta-venue">
                        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3"/></svg>
                        ${ev.venue}
                    </span>
                    <span class="meta-tag meta-halls">
                        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 3v18M2 9h20M2 15h20"/></svg>
                        ${ev.halls.length} Hall${ev.halls.length > 1 ? "s" : ""}
                    </span>
                </div>
            </div>
            <div class="status-bar" id="sb-${ev.id}">
                <div class="sb-item"><div class="sb-num sold"    id="sb-sold-${ev.id}">—</div><div class="sb-label">Sold</div></div>
                <div class="sb-item"><div class="sb-num agent"   id="sb-exh-${ev.id}">—</div><div class="sb-label">Exhibitor</div></div>
                <div class="sb-item"><div class="sb-num avail"   id="sb-lokal-${ev.id}">—</div><div class="sb-label">Local</div></div>
                <div class="sb-item"><div class="sb-num booked"  id="sb-overseas-${ev.id}">—</div><div class="sb-label">Overseas</div></div>
            </div>
            <div class="card-footer">
                <a class="btn btn-primary" href="event.html?id=${ev.id}">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 3v18M2 9h20M2 15h20"/></svg>
                    Floorplan
                </a>
                <a class="btn btn-outline" href="event.html?id=${ev.id}&tab=overview">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/></svg>
                    Overview
                </a>
            </div>
        </div>
    `;
    return card;
}

async function fetchStats(ev) {
    try {
        const r   = await fetch(`${ev.scriptUrl}?cmd=database&t=${Date.now()}`);
        const raw = await r.json();

        let t1 = Array.isArray(raw) ? raw : (raw.table1 || []);
        let t2 = Array.isArray(raw) ? [] : (raw.table2 || []);

        // Auto-split: booth-type header embedded in t1
        const splitIdx = t1.findIndex((row, i) => {
            if (i === 0) return false;
            const joined = row.map(c => String(c||"").toLowerCase()).join(" ");
            return joined.includes("space only") || joined.includes("standard booth") ||
                   (joined.includes("lokal") && joined.includes("area"));
        });
        if (splitIdx > 0) {
            if (!t2.length) t2 = t1.slice(splitIdx);
            t1 = t1.slice(0, splitIdx);
        }

        function val(row, col) {
            if (!row || col < 0) return 0;
            return Number(String(row[col]||0).replace(/,/g,"")) || 0;
        }
        function getTotalRow(table) {
            const rows = table.slice(1).filter(r => String(r[0]||"").trim() !== "");
            return rows.find(r => String(r[0]||"").toLowerCase() === "total") || rows[rows.length - 1];
        }

        // Sold & Exhibitor from t1
        const hdr1        = (t1[0] || []).map(h => String(h||"").toLowerCase());
        const soldCol     = hdr1.findIndex(h => h.includes("terjual") && h.includes("stand"));
        const exhAkhirCol = hdr1.findIndex(h => h.includes("exhibitor") && (h.includes("akhir") || h.includes("terjual")));
        const t1Total     = getTotalRow(t1);
        const sold = val(t1Total, soldCol);
        const exh  = val(t1Total, exhAkhirCol);

        // Local & Overseas from t2
        const t2HasData = t2.some(row => row.some(cell => String(cell||"").trim() !== ""));
        let lokal = 0, overseas = 0;
        if (t2HasData) {
            const hdr2        = (t2[0] || []).map(h => String(h||"").toLowerCase());
            const lokalCol    = hdr2.findIndex(h => h.includes("lokal") || h.includes("local"));
            const overseasCol = hdr2.findIndex(h => h.includes("overseas"));
            const t2Total     = getTotalRow(t2);
            lokal    = val(t2Total, lokalCol);
            overseas = val(t2Total, overseasCol);
        } else if (t1.length > 1) {
            const standTerjualCol = hdr1.findIndex(h => h.includes("stand") && h.includes("terjual"));
            lokal    = val(t1Total, standTerjualCol);
            overseas = 0;
        }

        document.getElementById(`sb-sold-${ev.id}`).textContent     = sold     || "—";
        document.getElementById(`sb-exh-${ev.id}`).textContent      = exh      || "—";
        document.getElementById(`sb-lokal-${ev.id}`).textContent    = lokal    || "—";
        document.getElementById(`sb-overseas-${ev.id}`).textContent = overseas || "—";

        return { sold, exh, lokal, overseas, total: sold + exh };
    } catch(e) {
        console.error("fetchStats failed for", ev.id, e);
        ["sold","exh","lokal","overseas"].forEach(k => {
            const el = document.getElementById(`sb-${k}-${ev.id}`);
            if (el) el.textContent = "—";
        });
        return null;
    }
}

async function init() {
    const grid = document.getElementById("eventGrid");
    EVENTS.forEach(ev => grid.appendChild(buildCard(ev)));

    let totalBooths = 0, totalSold = 0;
    const results = await Promise.all(EVENTS.map(fetchStats));
    results.forEach(r => {
        if (!r) return;
        totalBooths += r.total || 0;
        totalSold   += r.sold  || 0;
    });
    document.getElementById("totalBooths").textContent = totalBooths || "—";
    document.getElementById("totalSold").textContent   = totalSold   || "—";
}

init();
