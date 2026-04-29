import { useRef, useState } from "react";
import type Konva from "konva";
import Canvas, { LookbookItem } from "./components/Canvas";
import AddFromLink, { NewItem } from "./components/AddFromLink";

const PRESETS = [
  { name: "Cream", color: "#EDE7DD" },
  { name: "Beige", color: "#E8DFD2" },
  { name: "Stone", color: "#D9D0C0" },
  { name: "Sand", color: "#D8CAB1" },
  { name: "Bone", color: "#F2EDE3" },
  { name: "Charcoal", color: "#1F1F1F" },
];

const STAGE_WIDTH = 1200;
const STAGE_HEIGHT = 900;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const [items, setItems] = useState<LookbookItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bg, setBg] = useState(PRESETS[0].color);
  const [title, setTitle] = useState("YOUR PERSONAL STYLIST");
  const [subtitle, setSubtitle] = useState(
    "SERVICES INCLUDE CURATED DIGITAL LOOKBOOKS WITH CLICKABLE LINKS, STYLE RECOMMENDATIONS, ETC.."
  );
  const stageRef = useRef<Konva.Stage | null>(null);

  function handleAdd(newItem: NewItem) {
    setItems((prev) => [
      ...prev,
      {
        id: uid(),
        src: newItem.imageUrl,
        brand: newItem.brand,
        x: STAGE_WIDTH / 2 + (Math.random() - 0.5) * 200,
        y: STAGE_HEIGHT / 2 + (Math.random() - 0.5) * 100,
        scale: 0.4,
        rotation: 0,
      },
    ]);
  }

  function handleUpdate(id: string, patch: Partial<LookbookItem>) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  }

  function handleRemoveSelected() {
    if (!selectedId) return;
    setItems((prev) => prev.filter((it) => it.id !== selectedId));
    setSelectedId(null);
  }

  function handleExport() {
    const stage = stageRef.current;
    if (!stage) return;
    const dataURL = stage.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = `lookbook-${Date.now()}.png`;
    a.click();
  }

  return (
    <div className="flex h-full">
      <aside className="flex w-80 flex-col gap-6 overflow-y-auto border-r border-stone-200 bg-stone-50 p-5">
        <header>
          <h1 className="font-display text-2xl">Lookbook</h1>
          <p className="text-xs text-stone-500">
            paste a product link → cut out → drop on canvas
          </p>
        </header>

        <AddFromLink onAdd={handleAdd} />

        <section className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest text-stone-500">
            Background
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.color}
                type="button"
                onClick={() => setBg(p.color)}
                className={`flex h-12 flex-col items-center justify-end rounded border text-[10px] ${
                  bg === p.color
                    ? "border-stone-900 ring-1 ring-stone-900"
                    : "border-stone-300"
                }`}
                style={{ background: p.color, color: p.color === "#1F1F1F" ? "#fff" : "#1a1a1a" }}
                title={p.name}
              >
                <span className="pb-1">{p.name}</span>
              </button>
            ))}
          </div>
          <input
            type="color"
            value={bg}
            onChange={(e) => setBg(e.target.value)}
            className="h-8 w-full rounded border border-stone-300"
          />
        </section>

        <section className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest text-stone-500">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded border border-stone-300 bg-white px-3 py-2 text-sm"
          />
          <textarea
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            rows={2}
            className="rounded border border-stone-300 bg-white px-3 py-2 text-xs"
          />
        </section>

        <section className="mt-auto flex flex-col gap-2">
          <button
            type="button"
            onClick={handleRemoveSelected}
            disabled={!selectedId}
            className="rounded border border-stone-300 px-3 py-2 text-sm disabled:opacity-40"
          >
            Delete selected
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="rounded bg-stone-900 px-3 py-2 text-sm font-medium text-white"
          >
            Export PNG
          </button>
        </section>
      </aside>

      <main className="flex flex-1 items-center justify-center overflow-auto p-8">
        <div
          style={{
            width: STAGE_WIDTH,
            height: STAGE_HEIGHT,
            transformOrigin: "center",
          }}
        >
          <Canvas
            width={STAGE_WIDTH}
            height={STAGE_HEIGHT}
            background={bg}
            title={title}
            subtitle={subtitle}
            items={items}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUpdate={handleUpdate}
            stageRef={stageRef}
          />
        </div>
      </main>
    </div>
  );
}
