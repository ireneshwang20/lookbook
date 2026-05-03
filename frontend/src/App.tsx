import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { jsPDF } from "jspdf";
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
const TARGET_ITEM_HEIGHT = 320;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function loadImageDimensions(
  url: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("image load failed"));
    img.src = url;
  });
}

interface Page {
  id: string;
  items: LookbookItem[];
  bg: string;
  title: string;
  subtitle: string;
  pill: string;
}

function createDefaultPage(): Page {
  return {
    id: uid(),
    items: [],
    bg: PRESETS[0].color,
    title: "YOUR PERSONAL STYLIST",
    subtitle:
      "SERVICES INCLUDE CURATED DIGITAL LOOKBOOKS WITH CLICKABLE LINKS, STYLE RECOMMENDATIONS, ETC..",
    pill: "1 OUTFIT PACKAGE",
  };
}

export default function App() {
  const [pages, setPages] = useState<Page[]>(() => [createDefaultPage()]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const update = () => {
      const padding = 64;
      const fit = Math.min(
        (el.clientWidth - padding) / STAGE_WIDTH,
        (el.clientHeight - padding) / STAGE_HEIGHT,
        1
      );
      setScale(Math.max(fit, 0.05));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const currentPage = pages[currentPageIndex];
  const selectedItem = selectedId
    ? currentPage.items.find((it) => it.id === selectedId) ?? null
    : null;

  function patchCurrentPage(patch: Partial<Page>) {
    setPages((prev) =>
      prev.map((p, i) => (i === currentPageIndex ? { ...p, ...patch } : p))
    );
  }

  function updateItems(updater: (prev: LookbookItem[]) => LookbookItem[]) {
    setPages((prev) =>
      prev.map((p, i) =>
        i === currentPageIndex ? { ...p, items: updater(p.items) } : p
      )
    );
  }

  const setBg = (bg: string) => patchCurrentPage({ bg });
  const setTitle = (title: string) => patchCurrentPage({ title });
  const setSubtitle = (subtitle: string) => patchCurrentPage({ subtitle });
  const setPill = (pill: string) => patchCurrentPage({ pill });

  async function handleAdd(newItem: NewItem) {
    let scale = 0.25;
    try {
      const dims = await loadImageDimensions(newItem.imageUrl);
      scale = Math.min(TARGET_ITEM_HEIGHT / dims.height, 1);
    } catch {
      // fall back to default scale
    }
    updateItems((prev) => [
      ...prev,
      {
        id: uid(),
        src: newItem.imageUrl,
        brand: newItem.brand,
        sourceUrl: newItem.sourceUrl,
        x: STAGE_WIDTH / 2 + (Math.random() - 0.5) * 200,
        y: STAGE_HEIGHT / 2 + (Math.random() - 0.5) * 100,
        scale,
        rotation: 0,
      },
    ]);
  }

  function handleSelect(id: string | null) {
    setSelectedId(id);
    if (!id) return;
    updateItems((prev) => {
      const idx = prev.findIndex((it) => it.id === id);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const item = prev[idx];
      return [...prev.slice(0, idx), ...prev.slice(idx + 1), item];
    });
  }

  function handleUpdate(id: string, patch: Partial<LookbookItem>) {
    updateItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  }

  function handleRemoveSelected() {
    if (!selectedId) return;
    updateItems((prev) => prev.filter((it) => it.id !== selectedId));
    setSelectedId(null);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!selectedId) return;
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || t?.isContentEditable) return;
      e.preventDefault();
      handleRemoveSelected();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, currentPageIndex]);

  function handleExport() {
    const stage = stageRef.current;
    if (!stage) return;
    const dataURL = stage.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = `lookbook-page-${currentPageIndex + 1}-${Date.now()}.png`;
    a.click();
  }

  const [exportingPdf, setExportingPdf] = useState(false);

  async function handleExportPDF() {
    if (exportingPdf) return;
    setExportingPdf(true);
    const original = currentPageIndex;
    setSelectedId(null);
    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [STAGE_WIDTH, STAGE_HEIGHT],
        compress: true,
      });
      for (let i = 0; i < pages.length; i++) {
        setCurrentPageIndex(i);
        // Wait two animation frames so React commits and Konva redraws.
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => resolve())
          )
        );
        const stage = stageRef.current;
        if (!stage) continue;
        const dataURL = stage.toDataURL({
          pixelRatio: 2,
          mimeType: "image/jpeg",
          quality: 0.92,
        });
        if (i > 0) pdf.addPage([STAGE_WIDTH, STAGE_HEIGHT], "landscape");
        pdf.addImage(dataURL, "JPEG", 0, 0, STAGE_WIDTH, STAGE_HEIGHT);

        // Add clickable link annotations on top of items that have a sourceUrl.
        // Konva returns the rendered bounding box in stage coordinates, which
        // already match the PDF page (we sized the page to STAGE_WIDTH x STAGE_HEIGHT).
        for (const it of pages[i].items) {
          if (!it.sourceUrl) continue;
          const node = stage.findOne(`#${it.id}`);
          if (!node) continue;
          const box = node.getClientRect({ relativeTo: stage });
          pdf.link(box.x, box.y, box.width, box.height, { url: it.sourceUrl });
        }
      }
      pdf.save(`lookbook-${Date.now()}.pdf`);
    } finally {
      setCurrentPageIndex(original);
      setExportingPdf(false);
    }
  }

  function addPage() {
    const newPage = createDefaultPage();
    setPages((prev) => [...prev, newPage]);
    setCurrentPageIndex(pages.length);
    setSelectedId(null);
  }

  function duplicatePage() {
    const dup: Page = {
      ...currentPage,
      id: uid(),
      items: currentPage.items.map((it) => ({ ...it, id: uid() })),
    };
    setPages((prev) => {
      const next = [...prev];
      next.splice(currentPageIndex + 1, 0, dup);
      return next;
    });
    setCurrentPageIndex(currentPageIndex + 1);
    setSelectedId(null);
  }

  function deleteCurrentPage() {
    if (pages.length <= 1) return;
    setPages((prev) => prev.filter((_, i) => i !== currentPageIndex));
    setCurrentPageIndex((idx) => Math.max(0, idx - (idx === pages.length - 1 ? 1 : 0)));
    setSelectedId(null);
  }

  function gotoPage(i: number) {
    setCurrentPageIndex(i);
    setSelectedId(null);
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
            Pages
          </label>
          <div className="flex flex-wrap gap-1.5">
            {pages.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => gotoPage(i)}
                className={`flex h-8 w-8 items-center justify-center rounded border text-xs font-medium ${
                  i === currentPageIndex
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
                }`}
                title={`Page ${i + 1}`}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={addPage}
              className="flex h-8 w-8 items-center justify-center rounded border border-dashed border-stone-400 bg-white text-base text-stone-500 hover:border-stone-900 hover:text-stone-900"
              title="Add new page"
            >
              +
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={duplicatePage}
              className="flex-1 rounded border border-stone-300 px-2 py-1.5 text-xs text-stone-700 hover:border-stone-500"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={deleteCurrentPage}
              disabled={pages.length <= 1}
              className="flex-1 rounded border border-stone-300 px-2 py-1.5 text-xs text-stone-700 hover:border-red-500 hover:text-red-600 disabled:opacity-40 disabled:hover:border-stone-300 disabled:hover:text-stone-700"
            >
              Delete page
            </button>
          </div>
        </section>

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
                  currentPage.bg === p.color
                    ? "border-stone-900 ring-1 ring-stone-900"
                    : "border-stone-300"
                }`}
                style={{
                  background: p.color,
                  color: p.color === "#1F1F1F" ? "#fff" : "#1a1a1a",
                }}
                title={p.name}
              >
                <span className="pb-1">{p.name}</span>
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2">
            <input
              type="color"
              value={currentPage.bg}
              onChange={(e) => setBg(e.target.value)}
              className="color-input h-9 w-12 rounded border border-stone-300"
            />
            <span className="font-mono text-xs uppercase text-stone-600">
              {currentPage.bg}
            </span>
          </label>
        </section>

        <section className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest text-stone-500">
            Title
          </label>
          <input
            value={currentPage.title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded border border-stone-300 bg-white px-3 py-2 text-sm"
          />
          <textarea
            value={currentPage.subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            rows={2}
            className="rounded border border-stone-300 bg-white px-3 py-2 text-xs"
          />
        </section>

        {selectedItem && (
          <section className="flex flex-col gap-2 rounded border border-stone-200 bg-white p-3">
            <label className="text-xs uppercase tracking-widest text-stone-500">
              Selected item
            </label>
            <input
              placeholder="Brand (e.g. ETRO)"
              value={selectedItem.brand ?? ""}
              onChange={(e) =>
                handleUpdate(selectedItem.id, {
                  brand: e.target.value || null,
                })
              }
              className="rounded border border-stone-300 bg-white px-3 py-2 text-sm"
            />
            <input
              type="url"
              placeholder="Source link (optional)"
              value={selectedItem.sourceUrl ?? ""}
              onChange={(e) =>
                handleUpdate(selectedItem.id, {
                  sourceUrl: e.target.value || null,
                })
              }
              className="rounded border border-stone-300 bg-white px-3 py-2 text-xs"
            />
            <p className="text-[10px] text-stone-500">
              Brand shows next to the item; if a link is set, the brand label
              becomes clickable when the item is selected.
            </p>
          </section>
        )}

        <section className="mt-auto flex flex-col gap-2">
          <button
            type="button"
            onClick={handleRemoveSelected}
            disabled={!selectedId}
            title="Delete selected (Delete or Backspace)"
            className="rounded border border-stone-300 px-3 py-2 text-sm disabled:opacity-40"
          >
            Delete selected ⌫
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="rounded bg-stone-900 px-3 py-2 text-sm font-medium text-white"
          >
            Export PNG (page {currentPageIndex + 1})
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={exportingPdf}
            className="rounded border border-stone-900 px-3 py-2 text-sm font-medium text-stone-900 disabled:opacity-50"
          >
            {exportingPdf
              ? "Building PDF…"
              : `Export PDF (${pages.length} page${pages.length === 1 ? "" : "s"})`}
          </button>
        </section>
      </aside>

      <main
        ref={mainRef}
        className="flex flex-1 items-center justify-center overflow-hidden p-8"
      >
        <div
          style={{
            width: STAGE_WIDTH * scale,
            height: STAGE_HEIGHT * scale,
          }}
        >
          <div
            style={{
              width: STAGE_WIDTH,
              height: STAGE_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <Canvas
              key={currentPage.id}
              width={STAGE_WIDTH}
              height={STAGE_HEIGHT}
              background={currentPage.bg}
              title={currentPage.title}
              subtitle={currentPage.subtitle}
              pill={currentPage.pill}
              items={currentPage.items}
              selectedId={selectedId}
              onSelect={handleSelect}
              onUpdate={handleUpdate}
              onChangeTitle={setTitle}
              onChangeSubtitle={setSubtitle}
              onChangePill={setPill}
              stageRef={stageRef}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
