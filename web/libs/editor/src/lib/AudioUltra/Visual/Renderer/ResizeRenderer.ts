import type { Layer } from "../Layer";
import type { Renderer, RenderContext } from "./Renderer";
import type { Interactive } from "../../Interaction/Interactive";
import { getCurrentTheme } from "@humansignal/ui";

export interface ResizeRendererConfig {
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: "solid" | "dashed" | "dotted";
  opacity?: number;
  hoverOpacity?: number;
  handleColor?: string;
  handleOpacity?: number;
  handleHoverOpacity?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}

export interface ResizeRendererConstructorConfig {
  layer: Layer;
  config: ResizeRendererConfig;
  componentName: string; // 'waveform' or 'spectrogram'
  onNeedsTransfer?: () => void; // Callback when transfer to main canvas is needed
  onHeightChange?: (componentName: string, newHeight: number) => void; // Callback when height changes
}

export class ResizeRenderer implements Renderer<ResizeRendererConfig>, Interactive {
  public config: ResizeRendererConfig;
  private readonly layer: Layer;
  private readonly componentName: string;
  private readonly onNeedsTransfer?: () => void;
  private readonly onHeightChange?: (componentName: string, newHeight: number) => void;
  private isDestroyed = false;
  private isHovered = false;
  private isDragging = false;
  private dragStartY = 0;
  private dragStartHeight = 0;
  private lastRenderContext?: RenderContext;

  constructor({ layer, config, componentName, onNeedsTransfer, onHeightChange }: ResizeRendererConstructorConfig) {
    this.layer = layer;
    this.componentName = componentName;
    this.onNeedsTransfer = onNeedsTransfer;
    this.onHeightChange = onHeightChange;
    this.config = {
      borderColor: "#666",
      borderWidth: 1,
      borderStyle: "solid",
      opacity: 0.2, // Lower default opacity
      hoverOpacity: 0.6, // Higher opacity on hover
      handleColor: "#666",
      handleOpacity: 0.4, // Lower default handle opacity
      handleHoverOpacity: 0.9, // Higher handle opacity on hover
      ...config,
    };
  }

  // Renderer interface implementation
  init(_context: RenderContext): void {
    // No initialization needed for resize renderer
  }

  draw(context: RenderContext): void {
    this.lastRenderContext = context;

    if (this.isDestroyed || !this.layer.isVisible) return;

    const ctx = this.layer.context;
    if (!ctx) return;

    const { width } = context;
    const height = this.layer.height;

    // Clear the layer first
    this.layer.clear();

    // Set up drawing context
    ctx.save();

    // Draw border rectangle around the entire area - only visible when hovering
    if (this.isHovered) {
      // Use hover opacity if hovering, otherwise use default opacity
      const currentOpacity = this.isHovered ? this.config.hoverOpacity : this.config.opacity;
      ctx.globalAlpha = currentOpacity ?? 0.2;
      ctx.strokeStyle = this.config.borderColor ?? "#666";
      ctx.lineWidth = (this.config.borderWidth ?? 1) * 2; // Make border more pronounced

      // Set line dash pattern based on border style
      switch (this.config.borderStyle) {
        case "dashed":
          ctx.setLineDash([5, 5]);
          break;
        case "dotted":
          ctx.setLineDash([2, 2]);
          break;
        default:
          ctx.setLineDash([]);
          break;
      }

      // Draw border rectangle - only when hovering
      ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
    }

    // Draw size badge in the center of the resize area - only when dragging
    if (this.isDragging) {
      const badgeWidth = 100; // Increased from 80
      const badgeHeight = 28; // Increased from 24
      const badgeX = (width - badgeWidth) / 2;
      const badgeY = (height - badgeHeight) / 2;

      // Detect dark mode and set appropriate colors
      const isDarkMode = getCurrentTheme() === "dark";
      const badgeBgColor = isDarkMode ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.8)";
      const badgeBorderColor = isDarkMode ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 255, 255, 0.3)";
      const textColor = isDarkMode ? "#000000" : "#ffffff";

      // Badge background
      ctx.fillStyle = badgeBgColor;
      ctx.globalAlpha = 0.9;
      this.drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 4);

      // Badge border
      ctx.strokeStyle = badgeBorderColor;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.8;
      this.drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 4, true);

      // Size text
      const sizeText = `${Math.round(width)}×${Math.round(height)}`;
      ctx.fillStyle = textColor;
      ctx.font = "bold 13px Arial"; // Increased from 11px
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 1.0;
      ctx.fillText(sizeText, width / 2, height / 2);
    }

    // Always show resize handle, but with different opacity based on hover state
    // Resize handle dimensions
    const handleWidth = 60; // Reduced from 80
    const handleHeight = 6; // Reduced from 8
    const borderRadius = 3; // Reduced from 4 to match smaller size
    const handleX = (width - handleWidth) / 2; // Center the handle
    const handleY = height - handleHeight - 8; // 8px from bottom

    // Draw resize handle background with rounded corners
    ctx.fillStyle = this.config.handleColor ?? "#666";
    const currentHandleOpacity = this.isHovered ? this.config.handleHoverOpacity : this.config.handleOpacity;
    ctx.globalAlpha = currentHandleOpacity ?? 0.4;

    // Apply shadow for better visibility
    ctx.shadowColor = this.config.shadowColor ?? "rgba(0, 0, 0, 0.3)";
    ctx.shadowBlur = this.config.shadowBlur ?? 4;
    ctx.shadowOffsetX = this.config.shadowOffsetX ?? 0;
    ctx.shadowOffsetY = this.config.shadowOffsetY ?? 2;

    this.drawRoundedRect(ctx, handleX, handleY, handleWidth, handleHeight, borderRadius);

    // Add a subtle border for better definition - always visible
    ctx.strokeStyle = this.isHovered ? "#ffffff" : "#cccccc";
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.8;

    // Clear shadow for border to avoid double shadow
    ctx.shadowColor = "transparent";

    this.drawRoundedRect(ctx, handleX, handleY, handleWidth, handleHeight, borderRadius, true);

    ctx.restore();

    // Notify that we need to transfer to main canvas
    if (this.onNeedsTransfer) {
      this.onNeedsTransfer();
    }
  }

  destroy(): void {
    this.isDestroyed = true;
    this.removeGlobalMouseListeners();
  }

  updateConfig(newConfig: Partial<ResizeRendererConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  onResize?(): void {
    // Resize renderer adapts automatically to layer size changes
  }

  // Interactive interface implementation
  hitTest(x: number, y: number): boolean {
    if (!this.layer.isVisible || this.isDestroyed || !this.lastRenderContext) return false;

    const width = this.lastRenderContext.width;
    const height = this.layer.height;

    // Basic bounds check
    if (x < 0 || x > width || y < 0 || y > height) return false;

    // Only hit test the resize handle area for precise interaction
    // Resize handle dimensions
    const handleWidth = 60; // Reduced from 80
    const handleHeight = 6; // Reduced from 8
    const handleX = (width - handleWidth) / 2; // Center the handle
    const handleY = height - handleHeight - 8; // 8px from bottom

    // Expand hit area for easier mouse targeting
    // Use larger padding when dragging to prevent accidental release
    const hitPadding = this.isDragging ? 8 : 4;
    const hitX = handleX - hitPadding;
    const hitY = handleY - hitPadding;
    const hitWidth = handleWidth + hitPadding * 2;
    const hitHeight = handleHeight + hitPadding * 2;

    return x >= hitX && x <= hitX + hitWidth && y >= hitY && y <= hitY + hitHeight;
  }

  onMouseEnter?(event: MouseEvent): void {
    if (!this.isHovered) {
      this.isHovered = true;
      if (this.lastRenderContext) {
        this.draw(this.lastRenderContext);
      }
    }
  }

  onMouseLeave?(event: MouseEvent): void {
    // Don't clear hover state if we're currently dragging
    if (this.isHovered && !this.isDragging) {
      this.isHovered = false;
      if (this.lastRenderContext) {
        this.draw(this.lastRenderContext);
      }
    }
  }

  onMouseMove?(event: MouseEvent): void {
    // Handle mouse move during drag
    if (this.isDragging && this.onHeightChange) {
      const deltaY = event.clientY - this.dragStartY;
      const newHeight = Math.max(20, this.dragStartHeight + deltaY); // Minimum height of 20px

      // Direct height change - no debouncing needed since we're just updating layer heights
      this.onHeightChange(this.componentName, newHeight);
    }
  }

  onMouseDown?(event: MouseEvent): void {
    this.isDragging = true;
    this.dragStartY = event.clientY;
    this.dragStartHeight = this.layer.height;
    event.preventDefault();
    event.stopPropagation();

    // Add global mouse event listeners to handle drag outside component
    document.addEventListener("mousemove", this.handleGlobalMouseMove);
    document.addEventListener("mouseup", this.handleGlobalMouseUp);

    console.log(`Started resizing ${this.componentName} from height ${this.dragStartHeight}`);
  }

  onMouseUp?(event: MouseEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.removeGlobalMouseListeners();
      console.log(`Finished resizing ${this.componentName} (global)`);
    }
  }

  // Global mouse event handlers for drag operations
  private handleGlobalMouseMove = (event: MouseEvent): void => {
    if (this.isDragging && this.onHeightChange) {
      const deltaY = event.clientY - this.dragStartY;
      const newHeight = Math.max(20, this.dragStartHeight + deltaY); // Minimum height of 20px

      // Direct height change - no debouncing needed since we're just updating layer heights
      this.onHeightChange(this.componentName, newHeight);
    }
  };

  private handleGlobalMouseUp = (event: MouseEvent): void => {
    if (this.isDragging) {
      this.isDragging = false;
      this.removeGlobalMouseListeners();
      console.log(`Finished resizing ${this.componentName} (global)`);
    }
  };

  private removeGlobalMouseListeners(): void {
    document.removeEventListener("mousemove", this.handleGlobalMouseMove);
    document.removeEventListener("mouseup", this.handleGlobalMouseUp);
  }

  onClick?(event: MouseEvent): void {
    // Handle click events if needed
  }

  getCursor?(): string {
    if (this.isDragging) {
      return "grabbing"; // Show grab cursor when actively dragging
    }
    return "ns-resize"; // Show resize cursor when hovering over handle
  }

  isEnabled?(): boolean {
    return !this.isDestroyed && this.layer.isVisible;
  }

  getZIndex?(): number {
    return 200; // High z-index for resize handles
  }

  private drawRoundedRect(
    ctx: any,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    stroke = false,
  ) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (stroke) {
      ctx.stroke();
    } else {
      ctx.fill();
    }
  }
}
