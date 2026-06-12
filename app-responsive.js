/* ============================================================================
   Mapa del Camino — Santiago Ways · RESPONSIVE (una sola página)
   Un único componente App con estado + mapa Leaflet compartidos.
   Según el ancho de pantalla renderiza el chrome de escritorio (barra + panel)
   o el de móvil (mapa a pantalla completa + hoja deslizable).
   ============================================================================ */
const { useState, useEffect, useRef, useMemo, useLayoutEffect } = React;
const CAMINOS = window.CAMINOS;

/* ---- helpers -------------------------------------------------------------- */
function sumKm(st, a, b) { const lo = Math.min(a, b), hi = Math.max(a, b); let t = 0; for (let i = lo + 1; i <= hi; i++) t += st[i].km || 0; return t; }
function fmtKm(n) { return (Math.round(n * 10) / 10).toLocaleString("es-ES"); }
function ArrowRight() { return React.createElement("svg", { viewBox: "0 0 24 24", fill: "none" }, React.createElement("path", { d: "M5 12h14M13 6l6 6-6 6", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" })); }

/* ---- Geometría real de ruta (sigue caminos/sendas) ----------------------- */
/* Bump GEOM_VER para invalidar la caché si cambia el origen de datos. */
const GEOM_VER = "v1";
/* Une los tramos (legs) en una polilínea continua sin duplicar el punto de unión. */
function legsToPath(legs) {
  const out = [];
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    for (let j = 0; j < leg.length; j++) { if (i > 0 && j === 0) continue; out.push(leg[j]); }
  }
  return out;
}
/* Fallback: cada tramo = recta entre dos paradas. */
function straightLegs(stages) {
  const legs = [];
  for (let i = 0; i < stages.length - 1; i++) legs.push([[stages[i].lat, stages[i].lng], [stages[i + 1].lat, stages[i + 1].lng]]);
  return legs;
}
/* Pide el trazado real a un router OSM (perfil a pie; si falla, coche; si falla, recta).
   Devuelve un array de tramos, uno por par de paradas consecutivas. */
async function fetchLegs(stages) {
  const coords = stages.map(s => `${s.lng},${s.lat}`).join(";");
  const bases = [
    "https://routing.openstreetmap.de/routed-foot/route/v1/foot/",
    "https://router.project-osrm.org/route/v1/driving/",
  ];
  for (const base of bases) {
    try {
      const res = await fetch(`${base}${coords}?steps=true&geometries=geojson&overview=false`);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.code !== "Ok" || !data.routes || !data.routes[0]) continue;
      return data.routes[0].legs.map((leg, i) => {
        const c = [];
        (leg.steps || []).forEach(st => { const g = st.geometry && st.geometry.coordinates; if (g) g.forEach(p => c.push([p[1], p[0]])); });
        return c.length > 1 ? c : [[stages[i].lat, stages[i].lng], [stages[i + 1].lat, stages[i + 1].lng]];
      });
    } catch (e) { /* siguiente base */ }
  }
  throw new Error("routing unavailable");
}

const DESKTOP_MQ = "(min-width: 861px)";
function useIsDesktop() {
  const [d, setD] = useState(() => window.matchMedia(DESKTOP_MQ).matches);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const on = () => setD(mq.matches);
    mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on); };
  }, []);
  return d;
}

/* ===========================================================================
   App
   =========================================================================== */
function App() {
  const [caminoId, setCaminoId] = useState(CAMINOS[0].id);
  const [startIdx, setStartIdx] = useState(null);
  const [endIdx, setEndIdx] = useState(null);
  const [picker, setPicker] = useState(false);     // sólo móvil
  const [expanded, setExpanded] = useState(false);  // sólo móvil

  const isDesktop = useIsDesktop();
  const isDesktopRef = useRef(isDesktop);
  useEffect(() => { isDesktopRef.current = isDesktop; }, [isDesktop]);

  const camino = useMemo(() => CAMINOS.find(c => c.id === caminoId), [caminoId]);
  const stages = camino.stages;
  const hasSel = startIdx !== null && endIdx !== null && startIdx !== endIdx;
  const lo = hasSel ? Math.min(startIdx, endIdx) : null;
  const hi = hasSel ? Math.max(startIdx, endIdx) : null;
  const km = hasSel ? sumKm(stages, startIdx, endIdx) : 0;
  const days = hasSel ? (hi - lo) : 0;
  const startCity = startIdx !== null ? stages[startIdx].n : null;
  const endCity = endIdx !== null ? stages[endIdx].n : null;
  const totalKm = fmtKm(sumKm(stages, 0, stages.length - 1));

  /* ---- map refs ---- */
  const mapEl = useRef(null), map = useRef(null);
  const routesLayer = useRef(null), markersLayer = useRef(null), segLayer = useRef(null);
  const clickRef = useRef(() => {});
  const pickRef = useRef(() => {});
  const splashHidden = useRef(false);
  const sRef = useRef(null), eRef = useRef(null), camRef = useRef(caminoId);
  useEffect(() => { sRef.current = startIdx; }, [startIdx]);
  useEffect(() => { eRef.current = endIdx; }, [endIdx]);
  useEffect(() => { camRef.current = caminoId; }, [caminoId]);

  useEffect(() => {
    clickRef.current = (idx) => {
      const s = sRef.current, e = eRef.current;
      if (s === null) { setStartIdx(idx); return; }
      if (e === null) { if (idx === s) { setStartIdx(null); return; } setEndIdx(idx); return; }
      setStartIdx(idx); setEndIdx(null);
    };
  }, []);

  // padding del encuadre según el chrome activo (deja hueco a panel/hoja)
  // En escritorio el #map ya está desplazado por la barra lateral (no hace
  // falta compensarla en el padding); en móvil dejamos hueco a controles y hoja.
  const fitPad = () => isDesktopRef.current
    ? { paddingTopLeft: [60, 84], paddingBottomRight: [60, 60] }
    : { paddingTopLeft: [30, 130], paddingBottomRight: [30, 200] };

  const fitView = () => {
    if (!map.current) return;
    const cam = CAMINOS.find(c => c.id === camRef.current);
    const st = cam.stages;
    const s = sRef.current, e = eRef.current;
    const sel = s !== null && e !== null && s !== e;
    if (sel) {
      const a = Math.min(s, e), b = Math.max(s, e);
      const seg = st.slice(a, b + 1).map(p => [p.lat, p.lng]);
      map.current.fitBounds(L.latLngBounds(seg), { ...fitPad(), maxZoom: 12 });
    } else {
      map.current.fitBounds(L.latLngBounds(st.map(p => [p.lat, p.lng])), { ...fitPad(), maxZoom: 13 });
    }
  };

  /* ---- geometría real de las rutas (con caché en localStorage) ---- */
  const [geoms, setGeoms] = useState({});
  const geomReq = useRef({});
  const ensureGeom = (camId) => {
    if (geoms[camId]) return Promise.resolve(geoms[camId]);
    if (geomReq.current[camId]) return geomReq.current[camId];
    const cam = CAMINOS.find(c => c.id === camId);
    const key = "cw-geom-" + camId + "-" + GEOM_VER;
    let cached = null;
    try { const raw = localStorage.getItem(key); if (raw) cached = JSON.parse(raw); } catch (e) {}
    if (cached) { setGeoms(g => ({ ...g, [camId]: cached })); return Promise.resolve(cached); }
    const p = fetchLegs(cam.stages).then(legs => {
      try { localStorage.setItem(key, JSON.stringify(legs)); } catch (e) {}
      setGeoms(g => ({ ...g, [camId]: legs }));
      return legs;
    }).catch(() => {
      const sl = straightLegs(cam.stages);
      setGeoms(g => ({ ...g, [camId]: sl }));
      return sl;
    });
    geomReq.current[camId] = p;
    return p;
  };
  // garantiza la geometría del camino activo + precarga el resto en segundo plano
  useEffect(() => { ensureGeom(caminoId); }, [caminoId]);
  useEffect(() => {
    let i = 0, stop = false;
    const next = () => { if (stop || i >= CAMINOS.length) return; const id = CAMINOS[i++].id; ensureGeom(id).finally(() => setTimeout(next, 350)); };
    const t = setTimeout(next, 900);
    return () => { stop = true; clearTimeout(t); };
  }, []);

  /* ---- init leaflet once ---- */
  useEffect(() => {
    const m = L.map(mapEl.current, { center: [42.7, -5.5], zoom: 6, zoomControl: true, attributionControl: true, worldCopyJump: false });
    map.current = m;
    const imagery = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" });
    imagery.addTo(m);
    imagery.once("load", () => { if (window.__hideSplash) window.__hideSplash(); });
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, opacity: 0.9 }).addTo(m);
    routesLayer.current = L.layerGroup().addTo(m);
    markersLayer.current = L.layerGroup().addTo(m);
    segLayer.current = L.layerGroup().addTo(m);
    setTimeout(() => m.invalidateSize(), 200);
    return () => m.remove();
  }, []);

  /* ---- dibujar todas las rutas + marcadores de la activa ---- */
  useEffect(() => {
    if (!map.current) return;
    const rl = routesLayer.current, ml = markersLayer.current;
    rl.clearLayers(); ml.clearLayers();
    CAMINOS.forEach(c => {
      const isActive = c.id === caminoId;
      const legs = geoms[c.id];
      const path = legs ? legsToPath(legs) : c.stages.map(s => [s.lat, s.lng]);
      const line = L.polyline(path, {
        color: c.color,
        weight: isActive ? 5 : 3.5,
        opacity: isActive ? 0.75 : 0.5,
        lineJoin: "round", lineCap: "round",
        interactive: !isActive,
      });
      if (!isActive) {
        // pista de interacción: las rutas inactivas reaccionan al hover y son clicables
        line.on("mouseover", () => line.setStyle({ weight: 5, opacity: 0.92 }));
        line.on("mouseout", () => line.setStyle({ weight: 3.5, opacity: 0.5 }));
        line.on("click", () => pickRef.current(c.id));
        line.bindTooltip(c.name, { className: "cam-tip", sticky: true });
      }
      line.addTo(rl);
    });
    stages.forEach((s, idx) => {
      const icon = L.divIcon({ className: "cam-pin", html: `<div class="cam-pin__dot" style="background:${camino.color}"></div>`, iconSize: [13, 13], iconAnchor: [6.5, 6.5] });
      L.marker([s.lat, s.lng], { icon, riseOnHover: true }).bindTooltip(`${idx + 1}. ${s.n}`, { className: "cam-tip", direction: "top", offset: [0, -6] }).on("click", () => clickRef.current(idx)).addTo(ml);
    });
    map.current.fitBounds(L.latLngBounds(stages.map(s => [s.lat, s.lng])), { ...fitPad(), maxZoom: 13 });
    if (!splashHidden.current) { splashHidden.current = true; setTimeout(() => { if (window.__hideSplash) window.__hideSplash(); }, 300); }
  }, [caminoId, geoms]);

  /* ---- resaltar segmento seleccionado ---- */
  useEffect(() => {
    if (!map.current) return;
    const sl = segLayer.current; sl.clearLayers();
    if (!hasSel) return;
    const legs = geoms[caminoId];
    const seg = legs ? legsToPath(legs.slice(lo, hi)) : stages.slice(lo, hi + 1).map(s => [s.lat, s.lng]);
    L.polyline(seg, { color: "#ffffff", weight: 9, opacity: 0.9, lineJoin: "round", lineCap: "round" }).addTo(sl);
    L.polyline(seg, { color: camino.color, weight: 5, opacity: 1, lineJoin: "round", lineCap: "round" }).addTo(sl);
    const big = (s, kind) => {
      const bg = kind === "a" ? "#7AA606" : "#184834", lab = kind === "a" ? "A" : "B";
      const icon = L.divIcon({ className: "cam-pin", html: `<div class="cam-pin__big" style="background:${bg};color:#fff;font-weight:800;font-size:14px;">${lab}</div>`, iconSize: [32, 32], iconAnchor: [16, 16] });
      return L.marker([s.lat, s.lng], { icon, zIndexOffset: 1000 }).bindTooltip(`${kind === "a" ? "Inicio" : "Fin"}: ${s.n}`, { className: "cam-tip", direction: "top", offset: [0, -15] });
    };
    big(stages[startIdx], "a").addTo(sl);
    big(stages[endIdx], "b").addTo(sl);
    map.current.fitBounds(L.latLngBounds(seg), { ...fitPad(), maxZoom: 12 });
  }, [startIdx, endIdx, caminoId, geoms]);

  /* ---- al cambiar de chrome (desktop/móvil): recalcular tamaño y reencuadrar ---- */
  useEffect(() => {
    if (!map.current) return;
    const t = setTimeout(() => { map.current.invalidateSize(); fitView(); }, 90);
    return () => clearTimeout(t);
  }, [isDesktop]);

  /* ---- hoja deslizable (sólo móvil) ---- */
  const sheetRef = useRef(null), peekRef = useRef(null);
  const [collapsedY, setCollapsedY] = useState(560);
  const [dragTy, setDragTy] = useState(null);
  const drag = useRef({ active: false, startY: 0, startTy: 0, moved: false });
  const recalc = () => {
    if (!sheetRef.current || !peekRef.current) return;
    const sheetH = sheetRef.current.offsetHeight;
    const peekH = peekRef.current.offsetHeight + 22;
    setCollapsedY(Math.max(0, sheetH - peekH));
  };
  useLayoutEffect(() => { recalc(); window.addEventListener("resize", recalc); return () => window.removeEventListener("resize", recalc); }, [isDesktop]);
  useLayoutEffect(() => { recalc(); }, [hasSel, caminoId, startIdx, endIdx, isDesktop]);

  const ty = dragTy != null ? dragTy : (expanded ? 0 : collapsedY);
  const dragging = dragTy != null;
  const onDown = (e) => { drag.current = { active: true, startY: e.clientY, startTy: ty, moved: false }; setDragTy(ty); if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId); };
  const onMove = (e) => { if (!drag.current.active) return; const dy = e.clientY - drag.current.startY; if (Math.abs(dy) > 4) drag.current.moved = true; setDragTy(Math.min(Math.max(drag.current.startTy + dy, 0), collapsedY)); };
  const onUp = () => { if (!drag.current.active) return; const wasMoved = drag.current.moved; const cur = dragTy; drag.current.active = false; setDragTy(null); if (!wasMoved) { setExpanded(x => !x); return; } setExpanded(cur < collapsedY / 2); };

  /* ---- acciones ---- */
  const pickCamino = (id) => { setCaminoId(id); setStartIdx(null); setEndIdx(null); setPicker(false); };
  useEffect(() => { pickRef.current = pickCamino; });
  const onSel = (which) => (e) => {
    const v = e.target.value === "" ? null : +e.target.value;
    if (which === "a") { setStartIdx(v); if (v !== null && v === endIdx) setEndIdx(null); }
    else { setEndIdx(v); if (v !== null && v === startIdx) setStartIdx(null); }
  };
  const swap = () => { setStartIdx(endIdx); setEndIdx(startIdx); };
  const explore = () => window.alert(`Explorar ruta\n\n${camino.name}: ${startCity} → ${endCity}\n${fmtKm(km)} km · ${days} ${days === 1 ? "día" : "días"}\n\n(Aquí enchufamos el tarificador de Santiago Ways con la ruta precargada.)`);

  /* ===========================================================================
     CHROME ESCRITORIO
     =========================================================================== */
  const desktopChrome = React.createElement(React.Fragment, null,
    React.createElement("header", { className: "topbar" },
      React.createElement("img", { className: "topbar__logo", src: "assets/logo-white.png", alt: "Santiago Ways" }),
      React.createElement("div", { className: "topbar__divider" }),
      React.createElement("div", { className: "topbar__titles" },
        React.createElement("span", { className: "topbar__kicker" }, "Mapa interactivo"),
        React.createElement("span", { className: "topbar__title" }, "El Camino de Santiago, ruta a ruta")
      ),
      React.createElement("div", { className: "topbar__spacer" }),
      React.createElement("div", { className: "topbar__hint" },
        React.createElement("span", null, "Marca tu "), React.createElement("b", null, "inicio"), React.createElement("span", null, " y tu "), React.createElement("b", null, "fin"), React.createElement("span", null, " — en el mapa o abajo")
      )
    ),
    React.createElement("aside", { className: "sidebar" },
      React.createElement("div", { className: "sidebar__scroll" },
        React.createElement("div", { className: "section" },
          React.createElement("h3", { className: "section__label" }, React.createElement("span", { className: "step" }, "1"), "Elige tu camino"),
          React.createElement("div", { className: "routes" },
            CAMINOS.map(c =>
              React.createElement("button", { key: c.id, className: "route-card" + (c.id === caminoId ? " is-active" : ""), onClick: () => pickCamino(c.id) },
                React.createElement("span", { className: "route-card__swatch", style: { background: c.color } }),
                React.createElement("span", { className: "route-card__body" },
                  React.createElement("span", { className: "route-card__name" }, c.name),
                  React.createElement("span", { className: "route-card__meta" }, `${c.stages.length} paradas · ${fmtKm(sumKm(c.stages, 0, c.stages.length - 1))} km totales`)
                ),
                React.createElement("span", { className: "route-card__chev" },
                  React.createElement("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none" }, React.createElement("path", { d: "M9 6l6 6-6 6", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" })))
              )
            )
          )
        ),
        React.createElement("p", { className: "route-desc" }, camino.descripcion),
        React.createElement("div", { className: "section" },
          React.createElement("h3", { className: "section__label" }, React.createElement("span", { className: "step" }, "2"), "Marca inicio y fin"),
          React.createElement("div", { className: "field" },
            React.createElement("label", { className: "field__label" }, React.createElement("span", { className: "field__dot field__dot--start" }), "Desde (punto A)"),
            React.createElement("div", { className: "select-wrap" },
              React.createElement("select", { className: "sw-select", value: startIdx === null ? "" : startIdx, onChange: onSel("a") },
                React.createElement("option", { value: "" }, "Selecciona tu punto de inicio…"),
                stages.map((s, i) => React.createElement("option", { key: i, value: i }, `${i + 1}. ${s.n}`))
              )
            )
          ),
          React.createElement("button", { className: "swap-btn", onClick: swap, disabled: !hasSel },
            React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none" }, React.createElement("path", { d: "M7 10l-3 3 3 3M4 13h11M17 14l3-3-3-3M20 11H9", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" })),
            "Invertir sentido"
          ),
          React.createElement("div", { className: "field" },
            React.createElement("label", { className: "field__label" }, React.createElement("span", { className: "field__dot field__dot--end" }), "Hasta (punto B)"),
            React.createElement("div", { className: "select-wrap" },
              React.createElement("select", { className: "sw-select", value: endIdx === null ? "" : endIdx, onChange: onSel("b") },
                React.createElement("option", { value: "" }, "Selecciona tu punto final…"),
                stages.map((s, i) => React.createElement("option", { key: i, value: i }, `${i + 1}. ${s.n}`))
              )
            )
          )
        ),
        React.createElement("div", { className: "result" },
          hasSel
            ? React.createElement(React.Fragment, null,
                React.createElement("div", { className: "result__head" }, "Tu ruta"),
                React.createElement("div", { className: "result__route" }, startCity, " ", React.createElement("span", null, "→"), " ", endCity),
                React.createElement("div", { className: "stats" },
                  React.createElement("div", { className: "stat" }, React.createElement("div", { className: "stat__num" }, fmtKm(km), React.createElement("small", null, "km")), React.createElement("div", { className: "stat__lbl" }, "Distancia total")),
                  React.createElement("div", { className: "stat" }, React.createElement("div", { className: "stat__num" }, days), React.createElement("div", { className: "stat__lbl" }, days === 1 ? "Día recomendado" : "Días recomendados"))
                ),
                React.createElement("button", { className: "cta", onClick: explore }, "Explorar esta ruta", React.createElement(ArrowRight, null))
              )
            : React.createElement(React.Fragment, null,
                React.createElement("div", { className: "result__head" }, "Tu ruta"),
                React.createElement("p", { className: "result__empty" }, "Marca un punto ", React.createElement("b", null, "A"), " y un punto ", React.createElement("b", null, "B"), " — haz clic en dos paradas del mapa o usa los desplegables — y calcularemos los ", React.createElement("b", null, "kilómetros"), " y los ", React.createElement("b", null, "días recomendados"), "."),
                React.createElement("button", { className: "cta", disabled: true }, "Explorar esta ruta", React.createElement(ArrowRight, null))
              )
        ),
        React.createElement("div", { className: "section", style: { marginTop: "var(--space-6)" } },
          React.createElement("div", { className: "stages-head" },
            React.createElement("h3", { className: "section__label", style: { margin: 0 } }, "Todas las paradas"),
            React.createElement("span", { className: "count" }, hasSel ? `${hi - lo + 1} de ${stages.length}` : `${stages.length} paradas`)
          ),
          React.createElement("ul", { className: "stage-list" },
            stages.map((s, i) => {
              const inRange = hasSel && i >= lo && i <= hi, isStart = i === startIdx, isEnd = i === endIdx, dimmed = hasSel && !inRange;
              return React.createElement("li", { key: i, className: "stage-item" + (inRange ? " in-range" : "") + (isStart ? " is-start" : "") + (isEnd ? " is-end" : "") + (dimmed ? " dimmed" : ""), onClick: () => clickRef.current(i) },
                React.createElement("span", { className: "stage-node" }, i + 1),
                React.createElement("span", { className: "stage-name" }, s.n),
                isStart ? React.createElement("span", { className: "stage-flag stage-flag--start" }, "Inicio")
                  : isEnd ? React.createElement("span", { className: "stage-flag stage-flag--end" }, "Fin")
                  : React.createElement("span", { className: "stage-km" }, i === 0 ? "—" : `+${fmtKm(s.km)} km`)
              );
            })
          )
        )
      )
    ),
    React.createElement("div", { className: "map-badge" },
      hasSel
        ? React.createElement("span", null, "Mostrando ", React.createElement("b", null, `${startCity} → ${endCity}`))
        : React.createElement("span", null, "Haz clic en dos paradas para trazar tu ruta")
    ),
    React.createElement("div", { className: "map-legend" },
      React.createElement("div", { className: "map-legend__title" }, camino.name),
      React.createElement("div", { className: "legend-row" }, React.createElement("span", { className: "legend-line", style: { background: camino.color } }), "Trazado de la ruta")
    )
  );

  /* ===========================================================================
     CHROME MÓVIL
     =========================================================================== */
  const mobileChrome = React.createElement(React.Fragment, null,
    React.createElement("div", { className: "m-scrim" }),
    React.createElement("div", { className: "m-top" },
      React.createElement("div", { className: "m-logo" }, React.createElement("img", { src: "assets/isotipo-white.png", alt: "Santiago Ways" })),
      React.createElement("button", { className: "m-routepill", onClick: () => setPicker(true) },
        React.createElement("span", { className: "m-routepill__swatch", style: { background: camino.color } }),
        React.createElement("span", { className: "m-routepill__txt" },
          React.createElement("span", { className: "m-routepill__lbl" }, "Tu camino"),
          React.createElement("span", { className: "m-routepill__name" }, camino.name)
        ),
        React.createElement("span", { className: "m-routepill__caret" },
          React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none" }, React.createElement("path", { d: "M6 9l6 6 6-6", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" }))
        )
      )
    ),
    !hasSel && React.createElement("div", { className: "m-hint" }, "Toca dos paradas: ", React.createElement("b", null, "inicio"), " y ", React.createElement("b", null, "fin")),
    React.createElement("div", { className: "m-sheet", ref: sheetRef, style: { transform: `translateY(${ty}px)`, transition: dragging ? "none" : "transform .42s cubic-bezier(0.22,0.61,0.36,1)" } },
      React.createElement("div", { className: "m-sheet__grip", onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp }),
      React.createElement("div", { ref: peekRef, className: "m-peek", onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp, style: { padding: "0 18px 10px", cursor: "grab" } },
        hasSel
          ? React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } },
              React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "var(--fg-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, startCity, " → ", endCity),
                React.createElement("div", { style: { fontSize: 19, fontWeight: 800, color: "var(--fg-1)", marginTop: 2 } }, fmtKm(km), " km ", React.createElement("span", { style: { color: "var(--sw-neutral-300)" } }, "·"), " ", days, " ", days === 1 ? "día" : "días")
              ),
              React.createElement("button", { className: "m-cta", style: { width: "auto", marginTop: 0, padding: "12px 16px" }, onClick: (ev) => { ev.stopPropagation(); explore(); } }, "Explorar", React.createElement(ArrowRight, null))
            )
          : React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 } },
              React.createElement("div", null,
                React.createElement("div", { style: { fontSize: 15, fontWeight: 800, color: "var(--fg-1)" } }, "Planifica tu ruta"),
                React.createElement("div", { style: { fontSize: 12.5, color: "var(--fg-3)", marginTop: 2 } }, "Elige inicio y fin para ver km y días")
              ),
              React.createElement("svg", { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", style: { color: "var(--sw-green)", transform: expanded ? "rotate(180deg)" : "none", transition: "transform .3s" } }, React.createElement("path", { d: "M6 15l6-6 6 6", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" }))
            )
      ),
      React.createElement("div", { className: "m-sheet__body" },
        React.createElement("div", { className: "m-fields" },
          React.createElement("div", null,
            React.createElement("label", { className: "m-field__label" }, React.createElement("span", { className: "m-dot m-dot--a" }), "Desde (A)"),
            React.createElement("div", { className: "m-select-wrap" },
              React.createElement("select", { className: "m-select", value: startIdx === null ? "" : startIdx, onChange: onSel("a") },
                React.createElement("option", { value: "" }, "Punto de inicio…"),
                stages.map((s, i) => React.createElement("option", { key: i, value: i }, `${i + 1}. ${s.n}`))
              )
            )
          ),
          React.createElement("div", { className: "m-swap" },
            React.createElement("button", { onClick: swap, disabled: !hasSel },
              React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none" }, React.createElement("path", { d: "M7 10l-3 3 3 3M4 13h11M17 14l3-3-3-3M20 11H9", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" })), "Invertir")
          ),
          React.createElement("div", null,
            React.createElement("label", { className: "m-field__label" }, React.createElement("span", { className: "m-dot m-dot--b" }), "Hasta (B)"),
            React.createElement("div", { className: "m-select-wrap" },
              React.createElement("select", { className: "m-select", value: endIdx === null ? "" : endIdx, onChange: onSel("b") },
                React.createElement("option", { value: "" }, "Punto final…"),
                stages.map((s, i) => React.createElement("option", { key: i, value: i }, `${i + 1}. ${s.n}`))
              )
            )
          )
        ),
        React.createElement("div", { className: "m-result" },
          hasSel
            ? React.createElement(React.Fragment, null,
                React.createElement("div", { className: "m-result__route" }, startCity, " ", React.createElement("span", null, "→"), " ", endCity),
                React.createElement("div", { className: "m-stats" },
                  React.createElement("div", { className: "m-stat" }, React.createElement("div", { className: "m-stat__num" }, fmtKm(km), React.createElement("small", null, "km")), React.createElement("div", { className: "m-stat__lbl" }, "Distancia")),
                  React.createElement("div", { className: "m-stat" }, React.createElement("div", { className: "m-stat__num" }, days), React.createElement("div", { className: "m-stat__lbl" }, days === 1 ? "Día" : "Días"))
                ),
                React.createElement("button", { className: "m-cta", onClick: explore }, "Explorar esta ruta", React.createElement(ArrowRight, null))
              )
            : React.createElement(React.Fragment, null,
                React.createElement("p", { className: "m-result__empty" }, "Toca dos paradas en el mapa o usa los desplegables. Calcularemos los ", React.createElement("b", null, "kilómetros"), " y los ", React.createElement("b", null, "días recomendados"), "."),
                React.createElement("button", { className: "m-cta", disabled: true }, "Explorar esta ruta", React.createElement(ArrowRight, null))
              )
        ),
        React.createElement("div", { className: "m-stages" },
          React.createElement("div", { className: "m-stages__head" },
            React.createElement("h4", null, "Todas las paradas"),
            React.createElement("span", null, hasSel ? `${hi - lo + 1} de ${stages.length}` : `${stages.length} · ${totalKm} km`)
          ),
          React.createElement("ul", { className: "m-stage-list" },
            stages.map((s, i) => {
              const inR = hasSel && i >= lo && i <= hi, isA = i === startIdx, isB = i === endIdx, dim = hasSel && !inR;
              return React.createElement("li", { key: i, className: "m-stage" + (inR ? " in-range" : "") + (isA ? " is-a" : "") + (isB ? " is-b" : "") + (dim ? " dimmed" : ""), onClick: () => clickRef.current(i) },
                React.createElement("span", { className: "m-node" }, i + 1),
                React.createElement("span", { className: "m-stage__name" }, s.n),
                isA ? React.createElement("span", { className: "m-flag m-flag--a" }, "Inicio")
                  : isB ? React.createElement("span", { className: "m-flag m-flag--b" }, "Fin")
                  : React.createElement("span", { className: "m-stage__km" }, i === 0 ? "—" : `+${fmtKm(s.km)} km`)
              );
            })
          )
        )
      )
    ),
    picker && React.createElement("div", { className: "m-modal" },
      React.createElement("div", { className: "m-modal__backdrop", onClick: () => setPicker(false) }),
      React.createElement("div", { className: "m-modal__card" },
        React.createElement("div", { className: "m-modal__grip" }),
        React.createElement("div", { className: "m-modal__title" }, "Elige tu camino"),
        React.createElement("div", { className: "m-modal__list" },
          CAMINOS.map(c => React.createElement("button", { key: c.id, className: "m-rc" + (c.id === caminoId ? " is-active" : ""), onClick: () => pickCamino(c.id) },
            React.createElement("span", { className: "m-rc__swatch", style: { background: c.color } }),
            React.createElement("span", { className: "m-rc__body" },
              React.createElement("span", { className: "m-rc__name" }, c.name),
              React.createElement("span", { className: "m-rc__meta" }, `${c.stages.length} paradas · ${fmtKm(sumKm(c.stages, 0, c.stages.length - 1))} km`)
            ),
            React.createElement("span", { className: "m-rc__check" }, React.createElement("svg", { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none" }, React.createElement("path", { d: "M5 12l5 5L20 6", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" })))
          ))
        )
      )
    )
  );

  return React.createElement("div", { className: "app " + (isDesktop ? "is-desktop" : "is-mobile") },
    React.createElement("div", { id: "map", ref: mapEl }),
    isDesktop ? desktopChrome : mobileChrome
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
