import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Rect, Image as KonvaImage, Text, Transformer } from "react-konva";
import type Konva from "konva";

export interface LookbookItem {
  id: string;
  src: string;
  brand: string | null;
  sourceUrl: string | null;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  // Label position is stored as an offset from item.x/item.y so dragging the
  // item carries its label along; dragging the label only updates the offset.
  labelOffsetX: number;
  labelOffsetY: number;
}

interface Props {
  width: number;
  height: number;
  background: string;
  title: string;
  subtitle: string;
  pill: string;
  items: LookbookItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<LookbookItem>) => void;
  onChangeTitle: (s: string) => void;
  onChangeSubtitle: (s: string) => void;
  onChangePill: (s: string) => void;
  stageRef?: React.MutableRefObject<Konva.Stage | null>;
}

type EditingField = "title" | "subtitle" | "pill" | null;

function useImage(src: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const el = new window.Image();
    el.crossOrigin = "anonymous";
    el.src = src;
    el.onload = () => setImg(el);
    return () => {
      el.onload = null;
    };
  }, [src]);
  return img;
}

function ItemNode({
  item,
  isSelected,
  onSelect,
  onUpdate,
}: {
  item: LookbookItem;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (patch: Partial<LookbookItem>) => void;
}) {
  const img = useImage(item.src);
  const groupRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  if (!img) return null;

  const baseW = img.width;
  const baseH = img.height;

  // Defensive defaults — items created before scaleX/scaleY/labelOffset
  // existed shouldn't render at NaN or scale=undefined.
  const scaleX = item.scaleX ?? 1;
  const scaleY = item.scaleY ?? 1;
  const labelOffsetX = item.labelOffsetX ?? (baseW * scaleX) / 2 + 8;
  const labelOffsetY = item.labelOffsetY ?? -6;

  return (
    <>
      <KonvaImage
        ref={groupRef}
        id={item.id}
        image={img}
        x={item.x}
        y={item.y}
        offsetX={baseW / 2}
        offsetY={baseH / 2}
        scaleX={scaleX}
        scaleY={scaleY}
        rotation={item.rotation}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onUpdate({ x: e.target.x(), y: e.target.y() });
        }}
        onTransformEnd={() => {
          const node = groupRef.current;
          if (!node) return;
          onUpdate({
            x: node.x(),
            y: node.y(),
            scaleX: node.scaleX(),
            scaleY: node.scaleY(),
            rotation: node.rotation(),
          });
        }}
      />
      {item.brand && (
        <Text
          text={`▸ ${item.brand.toUpperCase()}${
            isSelected && item.sourceUrl ? "  ↗" : ""
          }`}
          x={item.x + labelOffsetX}
          y={item.y + labelOffsetY}
          fontFamily="Inter"
          fontSize={11}
          fontStyle="600"
          fill="#1a1a1a"
          draggable
          onClick={(e) => {
            e.cancelBubble = true;
            if (item.sourceUrl) {
              window.open(item.sourceUrl, "_blank", "noopener,noreferrer");
            } else {
              onSelect();
            }
          }}
          onTap={(e) => {
            e.cancelBubble = true;
            if (item.sourceUrl) {
              window.open(item.sourceUrl, "_blank", "noopener,noreferrer");
            } else {
              onSelect();
            }
          }}
          onDragEnd={(e) => {
            onUpdate({
              labelOffsetX: e.target.x() - item.x,
              labelOffsetY: e.target.y() - item.y,
            });
          }}
          onMouseEnter={(e) => {
            const stage = e.target.getStage();
            if (stage) {
              stage.container().style.cursor = item.sourceUrl
                ? "pointer"
                : "move";
            }
          }}
          onMouseLeave={(e) => {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = "default";
          }}
        />
      )}
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          enabledAnchors={[
            "top-left",
            "top-center",
            "top-right",
            "middle-left",
            "middle-right",
            "bottom-left",
            "bottom-center",
            "bottom-right",
          ]}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 30 || newBox.height < 30) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}

export default function Canvas({
  width,
  height,
  background,
  title,
  subtitle,
  pill,
  items,
  selectedId,
  onSelect,
  onUpdate,
  onChangeTitle,
  onChangeSubtitle,
  onChangePill,
  stageRef,
}: Props) {
  const internalStageRef = useRef<Konva.Stage | null>(null);
  const setStage = (s: Konva.Stage | null) => {
    internalStageRef.current = s;
    if (stageRef) stageRef.current = s;
  };

  const [editing, setEditing] = useState<EditingField>(null);

  const titleX = useMemo(() => width / 2, [width]);
  const titleFontSize = Math.round(width * 0.075);
  const titleY = 70;
  const subtitleY = titleY + titleFontSize + 10;
  const pillX = titleX - 90;
  const pillTextY = 36;

  const setTextCursor = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = "text";
  };
  const resetCursor = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = "default";
  };

  return (
    <div style={{ position: "relative", width, height }}>
      <Stage
        ref={setStage}
        width={width}
        height={height}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) onSelect(null);
        }}
        className="rounded-md shadow-lg"
      >
        <Layer>
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill={background}
            listening={false}
          />
          <Text
            text={title}
            x={0}
            y={titleY}
            width={width}
            align="center"
            fontFamily="Cormorant Garamond"
            fontSize={titleFontSize}
            fontStyle="500"
            fill="#1a1a1a"
            visible={editing !== "title"}
            onDblClick={() => setEditing("title")}
            onDblTap={() => setEditing("title")}
            onMouseEnter={setTextCursor}
            onMouseLeave={resetCursor}
          />
          <Text
            text={subtitle}
            x={0}
            y={subtitleY}
            width={width}
            align="center"
            fontFamily="Inter"
            fontSize={11}
            fontStyle="400"
            letterSpacing={2}
            fill="#3a3a3a"
            visible={editing !== "subtitle"}
            onDblClick={() => setEditing("subtitle")}
            onDblTap={() => setEditing("subtitle")}
            onMouseEnter={setTextCursor}
            onMouseLeave={resetCursor}
          />
          {/* sparkle stamps */}
          <Text
            text="✦"
            x={40}
            y={140}
            fontSize={28}
            fill="#1a1a1a"
            listening={false}
          />
          <Text
            text="✦"
            x={width - 70}
            y={180}
            fontSize={20}
            fill="#1a1a1a"
            listening={false}
          />
          <Text
            text="✦"
            x={60}
            y={height - 90}
            fontSize={22}
            fill="#1a1a1a"
            listening={false}
          />
          <Text
            text="✦"
            x={width - 90}
            y={height - 70}
            fontSize={26}
            fill="#1a1a1a"
            listening={false}
          />
          {/* title pill outline */}
          <Rect
            x={pillX}
            y={28}
            width={180}
            height={32}
            cornerRadius={20}
            stroke="#1a1a1a"
            strokeWidth={1}
          />
          <Text
            text={pill}
            x={pillX}
            y={pillTextY}
            width={180}
            align="center"
            fontFamily="Inter"
            fontSize={12}
            fontStyle="600"
            letterSpacing={2}
            fill="#1a1a1a"
            visible={editing !== "pill"}
            onDblClick={() => setEditing("pill")}
            onDblTap={() => setEditing("pill")}
            onMouseEnter={setTextCursor}
            onMouseLeave={resetCursor}
          />

          {items.map((item) => (
            <ItemNode
              key={item.id}
              item={item}
              isSelected={item.id === selectedId}
              onSelect={() => onSelect(item.id)}
              onUpdate={(patch) => onUpdate(item.id, patch)}
            />
          ))}
        </Layer>
      </Stage>

      {editing === "title" && (
        <EditOverlay
          defaultValue={title}
          onCommit={(v) => {
            onChangeTitle(v);
            setEditing(null);
          }}
          style={{
            top: titleY,
            left: 0,
            width,
            height: titleFontSize * 1.3,
            fontFamily: '"Cormorant Garamond", Didot, Georgia, serif',
            fontSize: titleFontSize,
            fontWeight: 500,
            textAlign: "center",
            color: "#1a1a1a",
            lineHeight: 1.2,
          }}
        />
      )}
      {editing === "subtitle" && (
        <EditOverlay
          defaultValue={subtitle}
          onCommit={(v) => {
            onChangeSubtitle(v);
            setEditing(null);
          }}
          style={{
            top: subtitleY,
            left: 0,
            width,
            height: 32,
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 11,
            fontWeight: 400,
            letterSpacing: "2px",
            textAlign: "center",
            color: "#3a3a3a",
            lineHeight: 1.4,
          }}
        />
      )}
      {editing === "pill" && (
        <EditOverlay
          defaultValue={pill}
          onCommit={(v) => {
            onChangePill(v);
            setEditing(null);
          }}
          singleLine
          style={{
            top: pillTextY,
            left: pillX,
            width: 180,
            height: 20,
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "2px",
            textAlign: "center",
            color: "#1a1a1a",
            lineHeight: 1.2,
            textTransform: "uppercase",
          }}
        />
      )}
    </div>
  );
}

function EditOverlay({
  defaultValue,
  onCommit,
  style,
  singleLine = false,
}: {
  defaultValue: string;
  onCommit: (value: string) => void;
  style: React.CSSProperties;
  singleLine?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.select();
  }, []);

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    border: "none",
    outline: "1px dashed rgba(26,26,26,0.35)",
    background: "rgba(255,255,255,0.4)",
    padding: 0,
    margin: 0,
    resize: "none",
    overflow: "hidden",
    ...style,
  };

  if (singleLine) {
    return (
      <input
        ref={ref as React.RefObject<HTMLInputElement>}
        defaultValue={defaultValue}
        style={baseStyle}
        onBlur={(e) => onCommit(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
      />
    );
  }

  return (
    <textarea
      ref={ref as React.RefObject<HTMLTextAreaElement>}
      defaultValue={defaultValue}
      style={baseStyle}
      onBlur={(e) => onCommit(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
    />
  );
}
