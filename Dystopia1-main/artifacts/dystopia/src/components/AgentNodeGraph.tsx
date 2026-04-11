import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Agent, DebateMessage } from "@workspace/api-client-react";

const ARCHETYPE_DISPLAY: Record<string, string> = {
  transport_worker: "Transport Worker",
  informal_trader: "Informal Trader",
  student: "Student",
  urban_professional: "Urban Professional",
  household_manager: "Household Manager",
  small_business_owner: "Small Business",
  civil_society: "Civil Society",
  senior_citizen: "Senior Citizen",
  daily_wage_worker: "Daily Wage Worker",
  salaried_professional: "Salaried Professional",
  auto_driver: "Transport Worker",
  street_vendor: "Informal Trader",
  software_engineer: "Urban Professional",
  homemaker: "Household Manager",
  activist: "Civil Society",
  retired_teacher: "Senior Citizen",
  construction_worker: "Daily Wage Worker",
  middle_class_professional: "Salaried Professional",
};

interface NodeState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  sentiment: number;
  archetype: string;
  messageCount: number;
  hasMessage: boolean;
  popTimer: number;
}

interface SelectedAgent {
  id: number;
  name: string;
  archetype: string;
  neighborhood: string;
  sentiment: number;
  sentimentLabel: string;
  messageCount: number;
  bio?: string | null;
}

function sentimentColor(score: number, active: boolean): THREE.Color {
  if (!active) return new THREE.Color(0.12, 0.12, 0.17);
  if (score > 0.3) return new THREE.Color(0.08, 0.76, 0.32);
  if (score < -0.3) return new THREE.Color(0.92, 0.22, 0.22);
  return new THREE.Color(0.97, 0.62, 0.04);
}

function sentimentLabel(score: number): string {
  if (score > 0.6) return "Strongly Support";
  if (score > 0.2) return "Support";
  if (score > -0.2) return "Neutral";
  if (score > -0.6) return "Oppose";
  return "Strongly Oppose";
}

function sentimentBadgeColor(score: number): string {
  if (score > 0.2) return "text-green-400 bg-green-400/10";
  if (score < -0.2) return "text-red-400 bg-red-400/10";
  return "text-amber-400 bg-amber-400/10";
}

function buildNodes(agents: Agent[]): NodeState[] {
  return agents.map((a, i) => {
    const angle = (i / agents.length) * Math.PI * 2;
    return {
      id: a.id,
      x: Math.cos(angle) * 3.6,
      y: Math.sin(angle) * 3.6,
      vx: (Math.random() - 0.5) * 0.04,
      vy: (Math.random() - 0.5) * 0.04,
      sentiment: a.sentimentScore ?? 0,
      archetype: a.archetype,
      messageCount: 0,
      hasMessage: false,
      popTimer: 0,
    };
  });
}

// ── 1000 background NPC particles ─────────────────────────────────────────────
const NPC_COUNT = 1200;

interface NpcState {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  sentiment: number;
}

function buildNpcs(): NpcState[] {
  const npcs: NpcState[] = [];
  for (let i = 0; i < NPC_COUNT; i++) {
    const r = 4 + Math.random() * 9;
    const theta = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.5) * Math.PI * 0.7;
    npcs.push({
      x: r * Math.cos(theta) * Math.cos(phi),
      y: r * Math.sin(phi),
      z: r * Math.sin(theta) * Math.cos(phi),
      vx: (Math.random() - 0.5) * 0.002,
      vy: (Math.random() - 0.5) * 0.002,
      vz: (Math.random() - 0.5) * 0.002,
      sentiment: Math.random() * 2 - 1,
    });
  }
  return npcs;
}

const DUMMY = new THREE.Object3D();
const NPC_COL_SUPPORT = new THREE.Color(0.05, 0.55, 0.25);
const NPC_COL_OPPOSE = new THREE.Color(0.65, 0.12, 0.12);
const NPC_COL_NEUTRAL = new THREE.Color(0.28, 0.22, 0.08);
const NPC_COL_INACTIVE = new THREE.Color(0.09, 0.09, 0.14);

function NpcCloud({ active }: { active: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const npcs = useRef<NpcState[]>(buildNpcs());
  const t = useRef(0);

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    t.current += dt;
    const ns = npcs.current;

    for (let i = 0; i < NPC_COUNT; i++) {
      const n = ns[i];

      n.vx += (Math.random() - 0.5) * 0.0003;
      n.vy += (Math.random() - 0.5) * 0.0003;
      n.vz += (Math.random() - 0.5) * 0.0003;

      const r2 = n.x * n.x + n.y * n.y + n.z * n.z;
      const r = Math.sqrt(r2);
      const targetR = 4 + (i % 9) * 1.0;
      const pull = (targetR - r) * 0.0015;
      if (r > 0.01) {
        n.vx += (n.x / r) * pull;
        n.vy += (n.y / r) * pull;
        n.vz += (n.z / r) * pull;
      }

      const spd = Math.sqrt(n.vx * n.vx + n.vy * n.vy + n.vz * n.vz);
      const maxSpd = 0.008;
      if (spd > maxSpd) { n.vx = (n.vx / spd) * maxSpd; n.vy = (n.vy / spd) * maxSpd; n.vz = (n.vz / spd) * maxSpd; }

      n.x += n.vx; n.y += n.vy; n.z += n.vz;

      DUMMY.position.set(n.x, n.y, n.z);
      const s = 0.04 + (i % 5) * 0.012;
      DUMMY.scale.setScalar(s);
      DUMMY.updateMatrix();
      meshRef.current.setMatrixAt(i, DUMMY.matrix);

      const col = !active ? NPC_COL_INACTIVE
        : n.sentiment > 0.25 ? NPC_COL_SUPPORT
        : n.sentiment < -0.25 ? NPC_COL_OPPOSE
        : NPC_COL_NEUTRAL;
      meshRef.current.setColorAt(i, col);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, NPC_COUNT]} frustumCulled={false}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial vertexColors />
    </instancedMesh>
  );
}

// ── Edges ─────────────────────────────────────────────────────────────────────
function Edges({ edges, nodeStates }: { edges: Array<{ from: number; to: number }>; nodeStates: React.MutableRefObject<NodeState[]> }) {
  const geomRef = useRef<THREE.BufferGeometry>(null);
  const pointsArr = useMemo(() => new Float32Array(edges.length * 2 * 3), [edges.length]);

  useFrame(() => {
    if (!geomRef.current || edges.length === 0) return;
    const idMap: Record<number, NodeState> = {};
    for (const n of nodeStates.current) idMap[n.id] = n;
    for (let i = 0; i < edges.length; i++) {
      const f = idMap[edges[i].from], t = idMap[edges[i].to];
      if (!f || !t) continue;
      const base = i * 6;
      pointsArr[base] = f.x; pointsArr[base + 1] = f.y; pointsArr[base + 2] = 0;
      pointsArr[base + 3] = t.x; pointsArr[base + 4] = t.y; pointsArr[base + 5] = 0;
    }
    const attr = geomRef.current.attributes.position as THREE.BufferAttribute;
    attr.set(pointsArr); attr.needsUpdate = true;
  });

  if (edges.length === 0) return null;

  return (
    <lineSegments>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute attach="attributes-position" count={edges.length * 2} array={pointsArr} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial color="#f59e0b" transparent opacity={0.25} />
    </lineSegments>
  );
}

// ── Single agent node ─────────────────────────────────────────────────────────
function AgentNode({
  idx, nodeStates, protestRisk, selectedId, onSelect,
}: {
  idx: number;
  nodeStates: React.MutableRefObject<NodeState[]>;
  protestRisk: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<THREE.Group>(null);
  const hitRef = useRef<THREE.Mesh>(null);
  const phase = useRef(Math.random() * Math.PI * 2);
  const pointerDown = useRef<{ x: number; y: number } | null>(null);

  useFrame((_, dt) => {
    const n = nodeStates.current[idx];
    if (!n || !meshRef.current) return;

    phase.current += dt * (n.sentiment < -0.3 ? 2.8 : 1.4);
    if (n.popTimer > 0) nodeStates.current[idx].popTimer = Math.max(0, n.popTimer - dt * 3);

    const baseR = n.hasMessage ? 0.35 + Math.min(n.messageCount, 8) * 0.025 : 0.22;
    const pop = n.popTimer > 0 ? 1 + n.popTimer * 0.65 : 1;
    const protesting = n.hasMessage && n.sentiment < -0.3 && protestRisk > 0.5;
    const isSelected = selectedId === n.id;
    const r = baseR * pop + (protesting ? Math.abs(Math.sin(phase.current * 1.4)) * 0.07 : 0);

    const col = sentimentColor(n.sentiment, n.hasMessage);
    meshRef.current.position.set(n.x, n.y, 0);
    meshRef.current.scale.setScalar(r * (isSelected ? 1.4 : 1));
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.color.copy(col); mat.emissive.copy(col);
    mat.emissiveIntensity = isSelected ? 1.4 : n.hasMessage ? (protesting ? 0.5 + Math.abs(Math.sin(phase.current)) * 0.5 : 0.4) : 0.08;

    if (lightRef.current) {
      lightRef.current.position.set(n.x, n.y, 0.6);
      lightRef.current.color.copy(col);
      lightRef.current.intensity = isSelected ? 2.2 : n.hasMessage ? (protesting ? 1.1 + Math.abs(Math.sin(phase.current)) * 0.9 : 0.6) : 0.09;
    }

    if (ringRef.current) {
      const showRing = (n.sentiment < -0.55 && protestRisk > 0.65) || isSelected;
      ringRef.current.visible = showRing;
      if (showRing) {
        ringRef.current.position.set(n.x, n.y, 0);
        const rc = isSelected ? new THREE.Color(0.97, 0.62, 0.04) : new THREE.Color(0.94, 0.27, 0.27);
        (ringRef.current.material as THREE.MeshBasicMaterial).color.copy(rc);
        ringRef.current.scale.setScalar(r * (isSelected ? 2.1 : 1.85 + Math.abs(Math.sin(phase.current * 0.65)) * 0.45));
        (ringRef.current.material as THREE.MeshBasicMaterial).opacity = isSelected ? 0.6 : 0.12 + Math.abs(Math.sin(phase.current)) * 0.28;
      }
    }

    if (hitRef.current) {
      hitRef.current.position.set(n.x, n.y, 0);
      hitRef.current.scale.setScalar(Math.max(r * 2.8, 0.6));
    }

    if (labelRef.current) labelRef.current.position.set(n.x, n.y + r + 0.28, 0);
  });

  const n = nodeStates.current[idx];
  const col = sentimentColor(n?.sentiment ?? 0, n?.hasMessage ?? false);
  const label = n ? (ARCHETYPE_DISPLAY[n.archetype] ?? n.archetype.replace(/_/g, " ")) : "";
  const ix = n?.x ?? 0, iy = n?.y ?? 0;

  return (
    <group>
      <mesh ref={meshRef} position={[ix, iy, 0]}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.3} roughness={0.35} metalness={0.15} />
      </mesh>

      <mesh ref={ringRef} visible={false}>
        <ringGeometry args={[0.82, 1, 48]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>

      <mesh
        ref={hitRef}
        position={[ix, iy, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          pointerDown.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          if (!pointerDown.current) return;
          const dx = e.clientX - pointerDown.current.x;
          const dy = e.clientY - pointerDown.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          pointerDown.current = null;
          if (dist < 8) {
            const node = nodeStates.current[idx];
            if (node) onSelect(node.id);
          }
        }}
        onPointerOver={() => { document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = "default"; pointerDown.current = null; }}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <pointLight ref={lightRef} distance={5.5} intensity={0.5} decay={2} />

      <group ref={labelRef} position={[ix, iy + 0.55, 0]}>
        <Text fontSize={0.115} color="white" anchorX="center" anchorY="bottom" fillOpacity={0.55}>
          {label}
        </Text>
      </group>
    </group>
  );
}

// ── Protest ring ──────────────────────────────────────────────────────────────
function ProtestRing({ risk }: { risk: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const t = useRef(0);

  useFrame((_, dt) => {
    if (!meshRef.current || !matRef.current || risk < 0.5) return;
    t.current += dt * 1.1;
    matRef.current.opacity = (risk - 0.5) * 0.42 * (0.35 + Math.abs(Math.sin(t.current)) * 0.65);
    meshRef.current.scale.setScalar(1 + Math.abs(Math.sin(t.current * 0.45)) * 0.22);
  });

  if (risk < 0.5) return null;

  return (
    <mesh ref={meshRef} position={[0, 0, -0.2]}>
      <ringGeometry args={[5.5, 7.2, 64]} />
      <meshBasicMaterial ref={matRef} color="#ef4444" transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── Force graph ────────────────────────────────────────────────────────────────
function ForceGraph({
  agents, messages, protestRisk, selectedId, onSelect,
}: {
  agents: Agent[];
  messages: DebateMessage[];
  protestRisk: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const agentKey = agents.map((a) => a.id).join(",");
  const nodeStates = useRef<NodeState[]>([]);

  useMemo(() => {
    nodeStates.current = buildNodes(agents);
  }, [agentKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const byAgent: Record<number, { count: number; scores: number[] }> = {};
    for (const m of messages) {
      if (!byAgent[m.agentId]) byAgent[m.agentId] = { count: 0, scores: [] };
      byAgent[m.agentId].count++;
      byAgent[m.agentId].scores.push(m.sentimentScore);
    }
    for (const n of nodeStates.current) {
      const d = byAgent[n.id];
      if (!d) continue;
      if (!n.hasMessage || d.count > n.messageCount) n.popTimer = 1.0;
      n.hasMessage = true;
      n.messageCount = d.count;
      n.sentiment = d.scores.reduce((a, b) => a + b, 0) / d.scores.length;
    }
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const edges = useMemo(() => {
    const ids = new Set(agents.map((a) => a.id));
    const seen = new Set<string>();
    const out: { from: number; to: number }[] = [];
    for (const msg of messages) {
      if (!msg.replyToId) continue;
      const parent = messages.find((m) => m.id === msg.replyToId);
      if (!parent || !ids.has(msg.agentId) || !ids.has(parent.agentId)) continue;
      const k = [Math.min(msg.agentId, parent.agentId), Math.max(msg.agentId, parent.agentId)].join("-");
      if (!seen.has(k)) { seen.add(k); out.push({ from: msg.agentId, to: parent.agentId }); }
    }
    return out;
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    const ns = nodeStates.current;
    if (!ns.length) return;
    const step = Math.min(dt, 0.04);
    const REP = 2.2, CEN = 0.022, DAMP = 0.87, CLU = 0.032, MAXV = 0.1;
    const PC = protestRisk > 0.65 ? 0.065 : 0;

    let sx = 0, sy = 0, sn = 0, ox = 0, oy = 0, on_ = 0;
    for (const n of ns) {
      if (!n.hasMessage) continue;
      if (n.sentiment > 0.3) { sx += n.x; sy += n.y; sn++; }
      if (n.sentiment < -0.3) { ox += n.x; oy += n.y; on_++; }
    }
    if (sn) { sx /= sn; sy /= sn; }
    if (on_) { ox /= on_; oy /= on_; }

    for (let i = 0; i < ns.length; i++) {
      const a = ns[i]; let fx = 0, fy = 0;
      for (let j = 0; j < ns.length; j++) {
        if (i === j) continue;
        const b = ns[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = Math.max(dx * dx + dy * dy, 0.04);
        const d = Math.sqrt(d2);
        fx += (dx / d) * (REP / d2); fy += (dy / d) * (REP / d2);
      }
      fx -= a.x * CEN; fy -= a.y * CEN;
      if (a.hasMessage) {
        if (a.sentiment > 0.3 && sn > 1) { fx += (sx - a.x) * CLU; fy += (sy - a.y) * CLU; }
        if (a.sentiment < -0.3) {
          if (on_ > 1) { fx += (ox - a.x) * CLU; fy += (oy - a.y) * CLU; }
          if (PC) { fx -= a.x * PC; fy -= a.y * PC; }
        }
      }
      a.vx = (a.vx + fx * step) * DAMP; a.vy = (a.vy + fy * step) * DAMP;
      const spd = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
      if (spd > MAXV) { a.vx = (a.vx / spd) * MAXV; a.vy = (a.vy / spd) * MAXV; }
      a.x += a.vx; a.y += a.vy;
      const B = 5.4;
      if (Math.abs(a.x) > B) { a.vx *= -0.5; a.x = Math.sign(a.x) * B; }
      if (Math.abs(a.y) > B) { a.vy *= -0.5; a.y = Math.sign(a.y) * B; }
    }
  });

  return (
    <group>
      <Edges edges={edges} nodeStates={nodeStates} />
      {agents.map((_, i) => (
        <AgentNode
          key={i}
          idx={i}
          nodeStates={nodeStates}
          protestRisk={protestRisk}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

function SceneCamera() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 0, 18);
    camera.lookAt(0, 0, 0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// ── Legend ────────────────────────────────────────────────────────────────────
const LEGEND_ITEMS: [string, string][] = [
  ["#22c55e", "Support"],
  ["hsl(var(--primary))", "Neutral"],
  ["#ef4444", "Oppose"],
];

function Legend({ risk }: { risk: number }) {
  return (
    <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 pointer-events-none select-none">
      {LEGEND_ITEMS.map(([color, label]) => (
        <div key={label} className="flex items-center gap-1.5 text-[11px] font-mono">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
          <span className="text-white/45">{label}</span>
        </div>
      ))}
      {risk > 0.6 && (
        <div className="flex items-center gap-1.5 text-[11px] font-mono mt-1">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
          <span className="text-red-400 font-semibold">Protest Risk {Math.round(risk * 100)}%</span>
        </div>
      )}
    </div>
  );
}

// ── NPC count badge ───────────────────────────────────────────────────────────
function NpcBadge({ active }: { active: boolean }) {
  return (
    <div className="absolute bottom-3 right-3 pointer-events-none select-none">
      <span className="text-[10px] font-mono text-white/20">
        {NPC_COUNT.toLocaleString()} citizens simulated
      </span>
    </div>
  );
}

// ── Selected agent panel ──────────────────────────────────────────────────────
function AgentInfoPanel({ agent, messages, onClose }: { agent: SelectedAgent; messages: DebateMessage[]; onClose: () => void }) {
  const agentMessages = messages.filter((m) => m.agentId === agent.id);

  return (
    <div className="absolute top-3 right-3 w-64 bg-[#0d1117]/95 border border-white/10 rounded-lg p-4 shadow-2xl select-none z-10">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[11px] font-mono text-white/40 uppercase tracking-widest mb-0.5">
            {ARCHETYPE_DISPLAY[agent.archetype] ?? agent.archetype.replace(/_/g, " ")}
          </div>
          <div className="text-sm font-semibold text-white">{agent.name}</div>
          <div className="text-[11px] text-white/50 mt-0.5">{agent.neighborhood}</div>
        </div>
        <button
          onClick={onClose}
          className="text-white/30 hover:text-white/70 text-xs ml-2 mt-0.5 shrink-0 transition-colors cursor-pointer"
        >
          x
        </button>
      </div>

      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium mb-3 ${sentimentBadgeColor(agent.sentiment)}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${agent.sentiment > 0.2 ? "bg-green-400" : agent.sentiment < -0.2 ? "bg-red-400" : "bg-amber-400"}`} />
        {agent.sentimentLabel}
      </div>

      {agentMessages.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
            {agentMessages.length} message{agentMessages.length !== 1 ? "s" : ""}
          </div>
          <div className="text-[11px] text-white/65 leading-relaxed line-clamp-5 border-l border-white/10 pl-2">
            {agentMessages[agentMessages.length - 1]?.content}
          </div>
        </div>
      )}

      {agentMessages.length === 0 && (
        <div className="text-[11px] text-white/30 italic">No messages yet — run simulation</div>
      )}

      <div className="text-[10px] text-white/20 mt-3 font-mono">Click node again to dismiss</div>
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────
export interface AgentNodeGraphProps {
  agents: Agent[];
  messages: DebateMessage[];
  protestRisk: number;
  hasData: boolean;
}

export function AgentNodeGraph({ agents, messages, protestRisk, hasData }: AgentNodeGraphProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selectedAgent = useMemo((): SelectedAgent | null => {
    if (selectedId === null) return null;
    const agent = agents.find((a) => a.id === selectedId);
    if (!agent) return null;
    const agentMessages = messages.filter((m) => m.agentId === selectedId);
    const avgSentiment =
      agentMessages.length > 0
        ? agentMessages.reduce((sum, m) => sum + m.sentimentScore, 0) / agentMessages.length
        : agent.sentimentScore ?? 0;
    return {
      id: agent.id,
      name: agent.name,
      archetype: agent.archetype,
      neighborhood: agent.neighborhood ?? "",
      sentiment: avgSentiment,
      sentimentLabel: sentimentLabel(avgSentiment),
      messageCount: agentMessages.length,
      bio: agent.bio,
    };
  }, [selectedId, agents, messages]);

  const handleSelect = useCallback((id: number) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleDeselect = useCallback(() => setSelectedId(null), []);

  return (
    <div className="w-full h-full relative bg-[#06080d] select-none">
      <Canvas
        camera={{ position: [0, 0, 18], fov: 42 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={["#06080d"]} />
        <ambientLight intensity={0.08} />
        <directionalLight position={[5, 6, 4]} intensity={0.18} color="#d4c8f0" />

        <SceneCamera />

        <NpcCloud active={hasData} />

        {hasData && agents.length > 0 && (
          <ForceGraph
            agents={agents}
            messages={messages}
            protestRisk={protestRisk}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        )}

        <ProtestRing risk={protestRisk} />

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={8}
          maxDistance={30}
          autoRotate={selectedId === null}
          autoRotateSpeed={0.28}
          enableDamping
          dampingFactor={0.06}
        />
      </Canvas>

      <Legend risk={protestRisk} />
      <NpcBadge active={hasData} />

      {selectedAgent && (
        <AgentInfoPanel
          agent={selectedAgent}
          messages={messages}
          onClose={handleDeselect}
        />
      )}

      {!hasData && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-[11px] font-mono text-white/25 tracking-widest uppercase">
              Run simulation to activate agent network
            </div>
            <div className="text-[10px] font-mono text-white/15 mt-1">
              {NPC_COUNT.toLocaleString()} citizen nodes ready
            </div>
          </div>
        </div>
      )}

      {hasData && !selectedId && (
        <div className="absolute top-3 left-3 pointer-events-none">
          <span className="text-[10px] font-mono text-white/20">Click any node to inspect</span>
        </div>
      )}

      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.015) 2px,rgba(0,0,0,0.015) 4px)" }}
      />
    </div>
  );
}
