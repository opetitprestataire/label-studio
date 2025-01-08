import React, { type CSSProperties } from "react";
import styles from "./GridPreview.module.scss";

const MAX_ZOOM = 20;
const ZOOM_FACTOR = 0.01;

type Task = {
  id: number;
  data: Record<string, string>;
};

type ImagePreviewProps = {
  task: Task;
  field: string;
};

interface ImagePreviewState {
  offset: { x: number; y: number };
  isDragging: boolean;
  scale: number;
  coverScale: number;
  imageLoaded: boolean;
  imageSize: { width: number; height: number };
  containerSize: { width: number; height: number };
}

class ImagePreview extends React.Component<ImagePreviewProps, ImagePreviewState> {
  containerRef = React.createRef<HTMLDivElement>();
  imageRef = React.createRef<HTMLImageElement>();

  // internal params for dragging state
  dragAnchor = { x: 0, y: 0 };
  startOffset = { x: 0, y: 0 };

  constructor(props: ImagePreviewProps) {
    super(props);
    this.state = {
      imageLoaded: false,
      isDragging: false,
      // Zoom and position state
      scale: 1,
      coverScale: 1,
      offset: { x: 0, y: 0 },
      // scaled image size
      imageSize: { width: 0, height: 0 },
      // visible container size
      containerSize: { width: 0, height: 0 },
    };
  }

  // Reset on task change
  componentDidUpdate(prevProps: ImagePreviewProps) {
    if (prevProps.task !== this.props.task || prevProps.field !== this.props.field) {
      this.setState({ scale: 1, isDragging: false });
    }
  }

  constrainOffset = (newOffset: { x: number; y: number }) => {
    const { scale, imageSize, containerSize } = this.state;
    const { x, y } = newOffset;
    const { width, height } = imageSize;
    const { width: containerWidth, height: containerHeight } = containerSize;

    // to preserve paddings and make it less weird
    const minX = (containerWidth - width) / 2;
    const minY = (containerHeight - height) / 2;
    // the far edges should be behind container edges
    const maxX = Math.max(width * scale - containerWidth, 0);
    const maxY = Math.max(height * scale - containerHeight, 0);

    return {
      x: Math.min(Math.max(x, -maxX), minX),
      y: Math.min(Math.max(y, -maxY), minY),
    };
  }

  handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (this.containerRef.current) {
      const img = e.currentTarget;
      const containerRect = this.containerRef.current.getBoundingClientRect();

      const coverScaleX = containerRect.width / img.naturalWidth;
      const coverScaleY = containerRect.height / img.naturalHeight;
      // image is scaled by html, but we need to know this scale level
      // how much is image zoomed out to fit into container
      const imageScale = Math.min(coverScaleX, coverScaleY);

      const scaledWidth = img.naturalWidth * imageScale;
      const scaledHeight = img.naturalHeight * imageScale;
      // how much should we zoom image in to cover container
      const coverScale = Math.max(containerRect.width / scaledWidth, containerRect.height / scaledHeight);

      // Center the image initially
      const initialX = (containerRect.width - scaledWidth) / 2;
      const initialY = (containerRect.height - scaledHeight) / 2;

      this.setState({
        containerSize: {
          width: containerRect.width,
          height: containerRect.height,
        },
        coverScale,
        imageSize: {
          width: scaledWidth,
          height: scaledHeight,
        },
        offset: { x: initialX, y: initialY },
        imageLoaded: true,
      });
    }
  }

  handleWheel = (e: React.WheelEvent) => {
    const container = this.containerRef.current;
    const img = this.imageRef.current;

    if (!container || !img || !this.state.imageLoaded) return;

    const rect = container.getBoundingClientRect();
    const { scale, offset } = this.state;

    // Calculate cursor position relative to center
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    // Zoom calculation
    const newScale =
      e.deltaY < 0
        ? Math.min(scale * (1 + ZOOM_FACTOR), MAX_ZOOM) // Max zoom
        : Math.max(scale * (1 - ZOOM_FACTOR), 1); // Min zoom

    // Calculate zoom translation
    const scaleDelta = newScale / scale;
    // cursor - offset = cursor position relative to image; and that's the value being scaled.
    // cursor position on a screen should stay the same, so we need to calculate new offset
    // by scaling the distance to image edges and subtracting it from cursor position
    const newX = cursorX - (cursorX - offset.x) * scaleDelta;
    const newY = cursorY - (cursorY - offset.y) * scaleDelta;

    this.setState({ scale: newScale, offset: this.constrainOffset({ x: newX, y: newY }) });
  }

  handleMouseDown = (e: React.MouseEvent) => {
    if (!this.containerRef.current || this.state.scale <= 1) return;

    this.setState({ isDragging: true });
    this.dragAnchor = { x: e.clientX, y: e.clientY };
    this.startOffset = { ...this.state.offset };

    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("mouseup", this.handleMouseUp);
    window.addEventListener("click", this.handleNoClickOutside, { capture: true, once: true });
  }

  componentWillUnmount() {
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseup", this.handleMouseUp);
    window.removeEventListener("click", this.handleNoClickOutside);
  }

  // Prevent click outside from closing the modal while dragging
  handleNoClickOutside = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }

  handleMouseMove = (e: MouseEvent) => {
    if (!this.containerRef.current || !this.imageRef.current) return;

    const { x: oldX, y: oldY } = this.dragAnchor;
    const { x: offsetX, y: offsetY } = this.startOffset;
    const newX = e.clientX - oldX;
    const newY = e.clientY - oldY;

    this.setState({ offset: this.constrainOffset({ x: offsetX + newX, y: offsetY + newY }) });
  }

  handleMouseUp = () => {
    this.setState({ isDragging: false });

    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseup", this.handleMouseUp);
  }

  render() {
    const src = this.props.task?.data?.[this.props.field ?? ""] ?? "";

    if (!src) return null;

    const { scale, offset, isDragging, imageLoaded, imageSize, containerSize } = this.state;

    // Container styles
    const containerStyle: CSSProperties = {
      minHeight: "200px",
      maxHeight: "calc(90vh - 120px)",
      width: "100%",
      position: "relative",
      overflow: "hidden",
      cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
      userSelect: "none",
    };

    // Image styles
    const imageStyle: CSSProperties = imageLoaded
      ? {
          maxWidth: "100%",
          maxHeight: "100%",
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: "0 0",
        }
      : {
          width: "100%",
          height: "100%",
          objectFit: "contain",
        };

    return (
      <div
        ref={this.containerRef}
        style={containerStyle}
        className={styles.imageContainer}
        // zoom on scroll
        onWheel={this.handleWheel}
        // start panning on drag
        onMouseDown={this.handleMouseDown}
      >
        {src && (
          <img
            ref={this.imageRef}
            src={src}
            alt="Task Preview"
            style={imageStyle}
            className={styles.image}
            onLoad={this.handleImageLoad}
          />
        )}
      </div>
    );
  };
};

export { ImagePreview };
