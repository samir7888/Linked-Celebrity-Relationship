"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as PointerEvt,
  type ReactNode,
  type TouchEvent as TouchEvt,
} from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Focus,
  Heart,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Users,
} from "lucide-react";
import type { ConstellationGraph, ConstellationNode } from "@/lib/types";
import { slugify } from "@/lib/utils";

type SimNode = ConstellationNode & {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
  r: number;
};

function hashSeed(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nodeRadius(role: ConstellationNode["role"], compact: boolean) {
  if (role === "subject") return compact ? 28 : 36;
  if (role === "partner") return compact ? 18 : 22;
  return compact ? 13 : 16;
}

export function ConstellationView({
  graph,
  subjectName,
}: {
  graph: ConstellationGraph;
  subjectName: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<SVGGElement>(null);
  const nodeEls = useRef(new Map<string, SVGGElement>());
  const edgeEls = useRef(new Map<string, SVGPathElement>());
  const simRef = useRef<SimNode[]>([]);
  const sizeRef = useRef({ w: 640, h: 480 });
  const camRef = useRef({ x: 0, y: 0, k: 1 });
  const energyRef = useRef(1);
  const draggingRef = useRef<{
    id: string | null;
    pan: boolean;
    sx: number;
    sy: number;
    cx: number;
    cy: number;
    pointerId: number;
  } | null>(null);
  const pinchRef = useRef<{ dist: number; k: number } | null>(null);
  const hoverRef = useRef<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  const rafRef = useRef<number>(0);
  const reducedRef = useRef(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);
  const [ready, setReady] = useState(false);

  const nodeById = useMemo(() => {
    const m = new Map<string, ConstellationNode>();
    for (const n of graph.nodes) m.set(n.id, n);
    return m;
  }, [graph.nodes]);

  const relAdj = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const n of graph.nodes) m.set(n.id, new Set());
    for (const e of graph.edges) {
      if (e.kind !== "relationship") continue;
      m.get(e.source)?.add(e.target);
      m.get(e.target)?.add(e.source);
    }
    return m;
  }, [graph]);

  const selected = selectedId ? nodeById.get(selectedId) ?? null : null;
  const selectedShares = useMemo(() => {
    if (!selectedId) return [];
    return graph.edges
      .filter(
        (e) =>
          e.kind === "shared-ex" &&
          (e.source === selectedId || e.target === selectedId)
      )
      .map((e) => {
        const peerId = e.source === selectedId ? e.target : e.source;
        return {
          peer: nodeById.get(peerId),
          viaName: e.viaName ?? "a shared partner",
        };
      })
      .filter((x) => x.peer);
  }, [graph.edges, nodeById, selectedId]);

  const stars = useMemo(() => {
    const rand = mulberry32(hashSeed(subjectName));
    return Array.from({ length: 48 }, (_, i) => ({
      id: i,
      x: rand() * 100,
      y: rand() * 100,
      r: 0.4 + rand() * 1.1,
      o: 0.25 + rand() * 0.55,
      delay: rand() * 4,
    }));
  }, [subjectName]);

  const applyCamera = useCallback(() => {
    const { x, y, k } = camRef.current;
    worldRef.current?.setAttribute("transform", `translate(${x} ${y}) scale(${k})`);
  }, []);

  const applyHighlight = useCallback(
    (hotId: string | null) => {
      const hotSet = new Set<string>();
      if (hotId) {
        hotSet.add(hotId);
        relAdj.get(hotId)?.forEach((id) => hotSet.add(id));
        for (const e of graph.edges) {
          if (e.kind !== "shared-ex") continue;
          if (e.source === hotId) hotSet.add(e.target);
          if (e.target === hotId) hotSet.add(e.source);
        }
      }
      const dim = !!hotId;
      for (const n of simRef.current) {
        const el = nodeEls.current.get(n.id);
        if (!el) continue;
        const on = !dim || hotSet.has(n.id);
        el.style.opacity = on ? "1" : "0.22";
        el.style.filter = n.id === hotId ? "url(#constellation-glow)" : "";
      }
      for (const e of graph.edges) {
        const el = edgeEls.current.get(e.id);
        if (!el) continue;
        const on =
          !dim ||
          (hotSet.has(e.source) && hotSet.has(e.target) &&
            (e.source === hotId || e.target === hotId || e.kind === "relationship"));
        if (e.kind === "shared-ex") {
          const involved = e.source === hotId || e.target === hotId;
          el.style.opacity = involved ? "0.85" : dim ? "0" : "0.16";
        } else {
          el.style.opacity = on ? "0.95" : dim ? "0.08" : "0.7";
        }
      }
    },
    [graph.edges, relAdj]
  );

  const seedSimulation = useCallback(
    (w: number, h: number, isCompact: boolean) => {
      const cx = w / 2;
      const cy = h / 2;
      const span = Math.min(w, h);
      const partners = graph.nodes.filter((n) => n.role === "partner");
      const orbits = graph.nodes.filter((n) => n.role === "orbit");
      const partnerAngle = new Map<string, number>();
      const rand = mulberry32(hashSeed(subjectName + ":layout"));

      const nodes: SimNode[] = graph.nodes.map((n) => {
        const r = nodeRadius(n.role, isCompact);
        let x = cx;
        let y = cy;
        if (n.role === "partner") {
          const i = partners.findIndex((p) => p.id === n.id);
          const a = (i / Math.max(partners.length, 1)) * Math.PI * 2 - Math.PI / 2;
          partnerAngle.set(n.id, a);
          const rad = span * (isCompact ? 0.3 : 0.28);
          x = cx + Math.cos(a) * rad;
          y = cy + Math.sin(a) * rad;
        } else if (n.role === "orbit") {
          const hub = graph.edges.find(
            (e) =>
              e.kind === "relationship" &&
              ((e.source === n.id && partnerAngle.has(e.target)) ||
                (e.target === n.id && partnerAngle.has(e.source)))
          );
          const hubId =
            hub && partnerAngle.has(hub.source) ? hub.source : hub?.target;
          const stored = hubId ? partnerAngle.get(hubId) : undefined;
          const base = stored ?? rand() * Math.PI * 2;
          const a = base + (rand() - 0.5) * 0.7;
          const rad = span * (isCompact ? 0.42 : 0.4);
          x = cx + Math.cos(a) * rad;
          y = cy + Math.sin(a) * rad;
        }
        return {
          ...n,
          x,
          y,
          vx: 0,
          vy: 0,
          fx: n.role === "subject" ? cx : null,
          fy: n.role === "subject" ? cy : null,
          r,
        };
      });
      simRef.current = nodes;
      energyRef.current = reducedRef.current ? 0 : 1;
    },
    [graph, subjectName]
  );

  const tick = useCallback(() => {
    const nodes = simRef.current;
    const { w, h } = sizeRef.current;
    const cx = w / 2;
    const cy = h / 2;
    const alpha = energyRef.current;
    const pos = new Map(nodes.map((n) => [n.id, n] as const));

    if (alpha > 0.004 && !reducedRef.current) {
      const nLen = nodes.length;
      for (let i = 0; i < nLen; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nLen; j++) {
          const b = nodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 0.01;
          const minDist = a.r + b.r + 18;
          const repulse = (alpha * 900) / (dist * dist);
          let fx = (dx / dist) * repulse;
          let fy = (dy / dist) * repulse;
          if (dist < minDist) {
            const push = ((minDist - dist) / dist) * 0.12;
            fx += dx * push;
            fy += dy * push;
          }
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }

      for (const e of graph.edges) {
        const a = pos.get(e.source);
        const b = pos.get(e.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const rest =
          e.kind === "relationship" ? a.r + b.r + 72 : a.r + b.r + 110;
        const strength = e.kind === "relationship" ? 0.045 : 0.01;
        const k = ((dist - rest) / dist) * strength * alpha;
        const fx = dx * k;
        const fy = dy * k;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      for (const n of nodes) {
        if (n.role === "subject") {
          n.fx = cx;
          n.fy = cy;
        }
        if (n.fx != null) n.x = n.fx;
        else {
          n.vx += (cx - n.x) * 0.012 * alpha;
          n.vx *= 0.81;
          n.x += n.vx;
        }
        if (n.fy != null) n.y = n.fy;
        else {
          n.vy += (cy - n.y) * 0.012 * alpha;
          n.vy *= 0.81;
          n.y += n.vy;
        }
        const pad = n.r + 8;
        n.x = Math.min(w - pad, Math.max(pad, n.x));
        n.y = Math.min(h - pad, Math.max(pad, n.y));
      }
      energyRef.current *= 0.988;
    }

    for (const n of nodes) {
      const el = nodeEls.current.get(n.id);
      el?.setAttribute("transform", `translate(${n.x} ${n.y})`);
    }
    for (const e of graph.edges) {
      const a = pos.get(e.source);
      const b = pos.get(e.target);
      const el = edgeEls.current.get(e.id);
      if (!a || !b || !el) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d;
      const uy = dy / d;
      const x1 = a.x + ux * a.r;
      const y1 = a.y + uy * a.r;
      const x2 = b.x - ux * b.r;
      const y2 = b.y - uy * b.r;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const nx = -uy;
      const ny = ux;
      const bulge = e.kind === "shared-ex" ? Math.min(28, d * 0.12) : Math.min(16, d * 0.06);
      const cxp = mx + nx * bulge;
      const cyp = my + ny * bulge;
      el.setAttribute("d", `M ${x1} ${y1} Q ${cxp} ${cyp} ${x2} ${y2}`);
    }
  }, [graph.edges]);

  useEffect(() => {
    reducedRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const el = wrapRef.current;
    if (!el) return;

    const layout = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(rect.width, 280);
      const h = Math.max(rect.height, 320);
      const isCompact = w < 640;
      sizeRef.current = { w, h };
      setCompact(isCompact);
      seedSimulation(w, h, isCompact);
      setReady(true);
    };
    layout();
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(rect.width, 280);
      const h = Math.max(rect.height, 320);
      const isCompact = w < 640;
      sizeRef.current = { w, h };
      setCompact(isCompact);
      for (const n of simRef.current) {
        n.r = nodeRadius(n.role, isCompact);
        if (n.role === "subject") {
          n.fx = w / 2;
          n.fy = h / 2;
        }
      }
      energyRef.current = Math.max(energyRef.current, 0.35);
    });
    ro.observe(el);

    const onWheelNative = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      const cam = camRef.current;
      const factor = event.deltaY < 0 ? 1.08 : 0.92;
      const nextK = Math.min(2.4, Math.max(0.55, cam.k * factor));
      const wx = (mx - cam.x) / cam.k;
      const wy = (my - cam.y) / cam.k;
      cam.k = nextK;
      cam.x = mx - wx * nextK;
      cam.y = my - wy * nextK;
      worldRef.current?.setAttribute(
        "transform",
        `translate(${cam.x} ${cam.y}) scale(${cam.k})`
      );
    };
    el.addEventListener("wheel", onWheelNative, { passive: false });

    const loop = () => {
      tick();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      ro.disconnect();
      el.removeEventListener("wheel", onWheelNative);
      cancelAnimationFrame(rafRef.current);
    };
  }, [seedSimulation, tick]);

  useEffect(() => {
    selectedRef.current = selectedId;
    applyHighlight(hoverRef.current ?? selectedId);
  }, [selectedId, applyHighlight]);

  const clientToWorld = (clientX: number, clientY: number) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    const { x, y, k } = camRef.current;
    return {
      x: (clientX - rect.left - x) / k,
      y: (clientY - rect.top - y) / k,
    };
  };

  const hitNode = (wx: number, wy: number) => {
    let best: SimNode | null = null;
    let bestD = Infinity;
    for (const n of simRef.current) {
      const d = Math.hypot(n.x - wx, n.y - wy);
      if (d < n.r + 10 && d < bestD) {
        best = n;
        bestD = d;
      }
    }
    return best;
  };

  const onPointerDown = (event: PointerEvt<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const world = clientToWorld(event.clientX, event.clientY);
    const hit = hitNode(world.x, world.y);
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
    if (hit) {
      hit.fx = world.x;
      hit.fy = world.y;
      draggingRef.current = {
        id: hit.id,
        pan: false,
        sx: event.clientX,
        sy: event.clientY,
        cx: camRef.current.x,
        cy: camRef.current.y,
        pointerId: event.pointerId,
      };
      hoverRef.current = hit.id;
      applyHighlight(hit.id);
    } else {
      draggingRef.current = {
        id: null,
        pan: true,
        sx: event.clientX,
        sy: event.clientY,
        cx: camRef.current.x,
        cy: camRef.current.y,
        pointerId: event.pointerId,
      };
    }
  };

  const onPointerMove = (event: PointerEvt<HTMLDivElement>) => {
    const drag = draggingRef.current;
    if (!drag) {
      const world = clientToWorld(event.clientX, event.clientY);
      const hit = hitNode(world.x, world.y);
      const next = hit?.id ?? selectedRef.current;
      if (hoverRef.current !== (hit?.id ?? null)) {
        hoverRef.current = hit?.id ?? null;
        applyHighlight(next);
        const canvas = wrapRef.current;
        if (canvas) canvas.style.cursor = hit ? "grab" : "grab";
      }
      return;
    }
    if (drag.pan) {
      camRef.current.x = drag.cx + (event.clientX - drag.sx);
      camRef.current.y = drag.cy + (event.clientY - drag.sy);
      applyCamera();
      return;
    }
    const node = simRef.current.find((n) => n.id === drag.id);
    if (!node) return;
    const world = clientToWorld(event.clientX, event.clientY);
    node.fx = world.x;
    node.fy = world.y;
    energyRef.current = Math.max(energyRef.current, 0.25);
  };

  const onPointerUp = (event: PointerEvt<HTMLDivElement>) => {
    const drag = draggingRef.current;
    draggingRef.current = null;
    pinchRef.current = null;
    if (!drag) return;
    const moved =
      Math.hypot(event.clientX - drag.sx, event.clientY - drag.sy) > 8;
    if (drag.id) {
      const node = simRef.current.find((n) => n.id === drag.id);
      if (node && node.role !== "subject") {
        node.fx = null;
        node.fy = null;
      }
      if (!moved) {
        setSelectedId((prev) => (prev === drag.id ? prev : drag.id));
      }
      energyRef.current = Math.max(energyRef.current, 0.4);
    } else if (!moved) {
      setSelectedId(null);
      hoverRef.current = null;
      applyHighlight(null);
    }
  };

  const onTouchStart = (event: TouchEvt<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      const [a, b] = [event.touches[0], event.touches[1]];
      pinchRef.current = {
        dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        k: camRef.current.k,
      };
    }
  };

  const onTouchMove = (event: TouchEvt<HTMLDivElement>) => {
    if (event.touches.length === 2 && pinchRef.current) {
      event.preventDefault();
      const [a, b] = [event.touches[0], event.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const nextK = Math.min(
        2.4,
        Math.max(0.55, pinchRef.current.k * (dist / pinchRef.current.dist))
      );
      camRef.current.k = nextK;
      applyCamera();
    }
  };

  const zoomBy = (factor: number) => {
    const { w, h } = sizeRef.current;
    const cam = camRef.current;
    const mx = w / 2;
    const my = h / 2;
    const nextK = Math.min(2.4, Math.max(0.55, cam.k * factor));
    const wx = (mx - cam.x) / cam.k;
    const wy = (my - cam.y) / cam.k;
    cam.k = nextK;
    cam.x = mx - wx * nextK;
    cam.y = my - wy * nextK;
    applyCamera();
  };

  const resetView = () => {
    camRef.current = { x: 0, y: 0, k: 1 };
    applyCamera();
    const { w, h } = sizeRef.current;
    seedSimulation(w, h, compact);
    setSelectedId(null);
    hoverRef.current = null;
    applyHighlight(null);
  };

  const partnerCount = graph.nodes.filter((n) => n.role === "partner").length;
  const orbitCount = graph.nodes.filter((n) => n.role === "orbit").length;
  const shareCount = graph.edges.filter((e) => e.kind === "shared-ex").length;

  if (graph.nodes.length <= 1) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-dashed border-line/90 bg-white/40 px-4 py-12 text-center sm:rounded-3xl sm:px-12 sm:py-16">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold">
          <Sparkles size={22} />
        </div>
        <h3 className="mt-3 font-display text-lg italic text-ink sm:text-xl">
          Not enough stars to map yet
        </h3>
        <p className="mx-auto mt-1.5 max-w-md font-body text-xs leading-relaxed text-ink-soft/75 sm:text-sm">
          A constellation needs at least one recorded partner so we can trace who
          shares an ex.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-ink/20 bg-[#16141c] shadow-[0_18px_50px_-24px_rgba(22,20,28,0.65)] sm:rounded-3xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 font-body text-[10px] text-white/55 sm:text-[11px]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-gold shadow-[0_0_8px_#B8944F]" />
            {subjectName}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
            {partnerCount} dated
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-[3px] w-3 rounded-full border border-dashed border-gold/70" />
            {shareCount} shared-ex links
            {orbitCount > 0 ? ` · ${orbitCount} in orbit` : ""}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <IconBtn label="Zoom out" onClick={() => zoomBy(0.85)}>
            <Minus size={14} />
          </IconBtn>
          <IconBtn label="Zoom in" onClick={() => zoomBy(1.15)}>
            <Plus size={14} />
          </IconBtn>
          <IconBtn label="Reset constellation" onClick={resetView}>
            <RotateCcw size={13} />
          </IconBtn>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="constellation-sky relative h-[min(72vh,420px)] w-full touch-none select-none sm:h-[min(70vh,560px)] md:h-[min(68vh,620px)]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        role="application"
        aria-label={`${subjectName}'s relationship constellation`}
      >
        <svg className="absolute inset-0 h-full w-full" aria-hidden>
          {stars.map((s) => (
            <circle
              key={s.id}
              className="constellation-star"
              cx={`${s.x}%`}
              cy={`${s.y}%`}
              r={s.r}
              fill="white"
              opacity={s.o}
              style={{ animationDelay: `${s.delay}s` }}
            />
          ))}
        </svg>

        <svg className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <filter
              id="constellation-glow"
              x="-40%"
              y="-40%"
              width="180%"
              height="180%"
            >
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {graph.nodes.map((n) => (
              <clipPath key={`clip-${n.id}`} id={`clip-${cssId(n.id)}`}>
                <circle r={nodeRadius(n.role, compact) - 2} />
              </clipPath>
            ))}
          </defs>
          <g ref={worldRef}>
            {graph.edges.map((e) => (
              <path
                key={e.id}
                ref={(el) => {
                  if (el) edgeEls.current.set(e.id, el);
                  else edgeEls.current.delete(e.id);
                }}
                d=""
                fill="none"
                stroke={e.kind === "shared-ex" ? "#B8944F" : e.type === "spouse" ? "#E8A0B0" : "#F0D9A8"}
                strokeWidth={e.kind === "shared-ex" ? 1 : e.type === "spouse" ? 2 : 1.4}
                strokeDasharray={e.kind === "shared-ex" ? "3 5" : undefined}
                strokeLinecap="round"
                opacity={e.kind === "shared-ex" ? 0.16 : 0.7}
                style={{
                  transition: "opacity 180ms ease",
                  pointerEvents: "none",
                }}
              />
            ))}
            {graph.nodes.map((n) => {
              const r = nodeRadius(n.role, compact);
              const ring =
                n.role === "subject"
                  ? "#B8944F"
                  : n.role === "partner"
                    ? "#F6F2EA"
                    : "#9AA3B2";
              return (
                <g
                  key={n.id}
                  ref={(el) => {
                    if (el) nodeEls.current.set(n.id, el);
                    else nodeEls.current.delete(n.id);
                  }}
                  transform="translate(0 0)"
                  style={{
                    transition: "opacity 180ms ease",
                    cursor: "grab",
                  }}
                >
                  {n.role === "subject" && (
                    <circle
                      r={r + 10}
                      fill="none"
                      stroke="#B8944F"
                      strokeOpacity="0.35"
                      className="constellation-pulse"
                    />
                  )}
                  <circle
                    r={r + 1.5}
                    fill="#16141c"
                    stroke={ring}
                    strokeWidth={n.role === "subject" ? 2.5 : 1.5}
                  />
                  {n.image ? (
                    <image
                      href={n.image}
                      x={-r + 2}
                      y={-r + 2}
                      width={(r - 2) * 2}
                      height={(r - 2) * 2}
                      clipPath={`url(#clip-${cssId(n.id)})`}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  ) : (
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#F6F2EA"
                      fontSize={n.role === "subject" ? 16 : 11}
                      fontFamily="var(--font-fraunces), serif"
                      fontStyle="italic"
                    >
                      {n.name.charAt(0)}
                    </text>
                  )}
                  <text
                    y={r + (compact ? 12 : 14)}
                    textAnchor="middle"
                    fill={n.role === "subject" ? "#F0D9A8" : "#EDE8DC"}
                    fontSize={compact ? 9 : n.role === "subject" ? 12 : 10}
                    fontFamily="var(--font-inter), sans-serif"
                    style={{ pointerEvents: "none" }}
                  >
                    {shortName(n.name, compact)}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {!ready && (
          <div className="absolute inset-0 grid place-items-center font-body text-xs text-white/50">
            Charting the sky…
          </div>
        )}

        <p className="pointer-events-none absolute bottom-3 left-3 right-3 text-center font-body text-[10px] text-white/40 sm:bottom-4 sm:text-[11px]">
          Drag the sky to pan · pinch or scroll to zoom · pull a star to rearrange
        </p>
      </div>

      <div className="border-t border-white/10 bg-[#1c1a24] px-3 py-3 sm:px-5 sm:py-4">
        {selected ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-display text-lg italic text-paper sm:text-xl">
                {selected.name}
              </p>
              <p className="mt-0.5 font-body text-xs text-white/55">
                {selected.role === "subject"
                  ? "Center of this constellation"
                  : selected.role === "partner"
                    ? `Recorded partner of ${subjectName}`
                    : `Shares an ex with ${subjectName}`}
                {selectedShares.length > 0
                  ? ` · connected to ${selectedShares.length} ${
                      selectedShares.length === 1 ? "person" : "people"
                    } through a shared ex`
                  : ""}
              </p>
              {selectedShares.length > 0 && (
                <p className="mt-1 truncate font-body text-[11px] text-gold/80">
                  via {uniqueVias(selectedShares.map((s) => s.viaName)).join(", ")}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {selected.role !== "subject" && (
                <Link
                  href={`/celebrity/${selected.slug ?? slugify(selected.name)}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1.5 font-body text-xs font-medium text-gold ring-1 ring-gold/30 transition hover:bg-gold/25"
                >
                  Open timeline
                  <ArrowUpRight size={13} />
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  hoverRef.current = null;
                  applyHighlight(null);
                }}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-body text-xs text-white/60 transition hover:text-white"
              >
                <Focus size={12} />
                Clear
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-body text-xs leading-relaxed text-white/55 sm:text-[13px]">
              Solid lines are marriages and partnerships. Dashed gold lines connect
              people who share an ex — including anyone who also dated{" "}
              {subjectName}&rsquo;s partners.
            </p>
            <div className="hidden items-center gap-3 font-body text-[11px] text-white/45 sm:flex">
              <span className="inline-flex items-center gap-1">
                <Heart size={10} className="text-rose-300" /> Married
              </span>
              <span className="inline-flex items-center gap-1">
                <Users size={10} className="text-amber-200" /> Dated
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white active:scale-95"
    >
      {children}
    </button>
  );
}

function shortName(name: string, compact: boolean) {
  const parts = name.split(" ");
  if (compact && parts.length > 1) return parts[0];
  if (name.length > 18) return `${parts[0]}…`;
  return name;
}

function cssId(id: string) {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function uniqueVias(names: string[]) {
  return [...new Set(names)].slice(0, 3);
}
