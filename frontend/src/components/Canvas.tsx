import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Rect, Image as KonvaImage, Text, Transformer } from "react-konva";
import type Konva from "konva";

export interface LookbookItem {
  id: string;
  src: string;
  brand: string | null;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface Props {
  width: number;
  height: number;
  background: string;
  title: string;
  subtitle: string;
  items: LookbookItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<LookbookItem>) => void;
  stageRef?: React.MutableRefObject<Konva.Stage | null>;
}

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

  return (
    <>
      <KonvaImage
        ref={groupRef}
        image={img}
        x={item.x}
        y={item.y}
        offsetX={baseW / 2}
        offsetY={baseH / 2}
        scaleX={item.scale}
        scaleY={item.scale}
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
          const newScale = node.scaleX();
          onUpdate({
            x: node.x(),
            y: node.y(),
            scale: newScale,
            rotation: node.rotation(),
          });
        }}
      />
      {item.brand && (
        <Text
          text={`▸ ${item.brand.toUpperCase()}`}
          x={item.x + (baseW * item.scale) / 2 + 8}
          y={item.y - 6}
          fontFamily="Inter"
          fontSize={11}
          fontStyle="600"
          fill="#1a1a1a"
          listening={false}
        />
      )}
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
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
  items,
  selectedId,
  onSelect,
  onUpdate,
  stageRef,
}: Props) {
  const internalStageRef = useRef<Konva.Stage | null>(null);
  const setStage = (s: Konva.Stage | null) => {
    internalStageRef.current = s;
    if (stageRef) stageRef.current = s;
  };

  const titleX = useMemo(() => width / 2, [width]);

  return (
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
        <Rect x={0} y={0} width={width} height={height} fill={background} />
        <Text
          text={title}
          x={0}
          y={70}
          width={width}
          align="center"
          fontFamily="Cormorant Garamond"
          fontSize={Math.round(width * 0.075)}
          fontStyle="500"
          fill="#1a1a1a"
          listening={false}
        />
        <Text
          text={subtitle}
          x={0}
          y={70 + Math.round(width * 0.075) + 10}
          width={width}
          align="center"
          fontFamily="Inter"
          fontSize={11}
          fontStyle="400"
          letterSpacing={2}
          fill="#3a3a3a"
          listening={false}
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
          x={titleX - 90}
          y={28}
          width={180}
          height={32}
          cornerRadius={20}
          stroke="#1a1a1a"
          strokeWidth={1}
        />
        <Text
          text="1 OUTFIT PACKAGE"
          x={titleX - 90}
          y={36}
          width={180}
          align="center"
          fontFamily="Inter"
          fontSize={12}
          fontStyle="600"
          letterSpacing={2}
          fill="#1a1a1a"
          listening={false}
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
  );
}
