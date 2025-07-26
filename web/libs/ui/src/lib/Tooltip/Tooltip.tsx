import { ff } from "@humansignal/core";
import {
  Children,
  cloneElement,
  type DetailedReactHTMLElement,
  forwardRef,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { type Align, alignElements } from "@humansignal/core/lib/utils/dom";
import { isDefined } from "@humansignal/core/lib/utils/helpers";
import { aroundTransition } from "@humansignal/core/lib/utils/transition";
import { setRef } from "@humansignal/core/lib/utils/unwrapRef";
import styles from "./Tooltip.module.scss";
import clsx from "clsx";

const isEnhancedTooltip = ff.isActive(ff.FF_TOOLTIP_ENHANCEMENT);

export type TooltipProps = PropsWithChildren<{
  title: React.ReactNode;
  alignment?: Align;
  defaultVisible?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
  interactive?: boolean;
  theme?: "light" | "dark";
  className?: string;
}>;

const TooltipInner = forwardRef(
  (
    {
      title,
      children,
      alignment,
      defaultVisible,
      disabled,
      style,
      interactive,
      theme = "dark",
      className,
    }: TooltipProps,
    ref,
  ) => {
    const triggerElement = useRef<any>();
    const tooltipElement = useRef<HTMLDivElement>();
    const hideTimeoutRef = useRef<NodeJS.Timeout>();
    const [offset, setOffset] = useState({});
    const [visibility, setVisibility] = useState(defaultVisible ? "visible" : null);
    const [injected, setInjected] = useState(false);
    const [align, setAlign] = useState(alignment ?? "top-center");

    const clearHideTimeout = () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = undefined;
      }
    };

    const calculatePosition = useCallback(() => {
      const parent = triggerElement.current as HTMLElement | null;
      const target = tooltipElement.current as HTMLElement | null;

      if (isDefined(parent) && isDefined(target)) {
        const { left, top, align: resultAlign } = alignElements(parent, target, align, 10);

        setOffset({ left, top });
        setAlign(resultAlign);
      }
    }, [triggerElement.current, tooltipElement.current]);

    const performAnimation = useCallback(
      (visible: boolean) => {
        if (tooltipElement.current) {
          aroundTransition(tooltipElement.current, {
            beforeTransition() {
              setVisibility(visible ? "before-appear" : "before-disappear");
            },
            transition() {
              if (visible) calculatePosition();
              setVisibility(visible ? "appear" : "disappear");
            },
            afterTransition() {
              setVisibility(visible ? "visible" : null);
              if (visible === false) setInjected(false);
            },
          });
        }
      },
      [injected, calculatePosition, tooltipElement],
    );

    const visibilityClasses = useMemo(() => {
      switch (visibility) {
        case "before-appear":
          return { [styles["before-appear"]]: true };
        case "appear":
          return { [styles.appear]: true, [styles["before-appear"]]: true };
        case "before-disappear":
          return { [styles["before-disappear"]]: true };
        case "disappear":
          return { [styles.disappear]: true, [styles["before-disappear"]]: true };
        case "visible":
          return { [styles.visible]: true };
        default:
          return visibility ? { [styles.visible]: true } : null;
      }
    }, [visibility]);

    const tooltip = useMemo(
      () =>
        injected ? (
          <div
            ref={(el: any) => setRef(tooltipElement, el)}
            className={clsx(
              styles.tooltip,
              visibilityClasses,
              {
                [styles[`tooltip_align_${align}`]]: true,
                [styles.tooltip_theme_light]: theme === "light",
              },
              className,
            )}
            style={{
              ...offset,
              ...style,
              ...(interactive ? { pointerEvents: "auto" } : {}),
            }}
            onMouseEnter={(_: any) => {
              if (interactive) {
                clearHideTimeout();
                setVisibility("visible");
                performAnimation(true);
              }
            }}
            onMouseLeave={(_: any) => {
              if (interactive) {
                clearHideTimeout();
                hideTimeoutRef.current = setTimeout(() => {
                  performAnimation(false);
                }, 300);
              }
            }}
            data-testid="tooltip"
          >
            <div className={styles.tooltip__body} data-testid="tooltip-body">
              {title}
            </div>
          </div>
        ) : null,
      [injected, offset, title, visibilityClasses, tooltipElement, performAnimation],
    );

    useEffect(() => {
      if (disabled === true && visibility === "visible") performAnimation(false);
    }, [disabled, visibility]);

    const child = Children.only(children) as DetailedReactHTMLElement<any, HTMLElement>;

    const needFallback = !!child.props.disabled;
    if (isEnhancedTooltip) {
      // using parent/child elements allows detecting hover state on a disabled element that not emit mouseenter/mouseleave events
      const cacheIsTargetElement = useRef(new WeakMap<HTMLElement, boolean>());
      const isTargetElement = useMemo(() => {
        return (el: HTMLElement): boolean => {
          if (!el || !triggerElement.current) return false;
          const checkParent = (currentEl: HTMLElement, targetEl: HTMLElement): boolean => {
            if (currentEl === targetEl) {
              return true;
            }
            if (currentEl === triggerElement.current.parentNode || !currentEl.parentNode) {
              return false;
            }
            return checkParent(currentEl.parentNode as HTMLElement, targetEl);
          };

          if (cacheIsTargetElement.current.has(el)) {
            return cacheIsTargetElement.current.get(el) as boolean;
          }
          const result = checkParent(el, triggerElement.current);
          cacheIsTargetElement.current.set(el, result);
          return result;
        };
      }, [triggerElement.current]);
      const performAnimationRef = useRef(performAnimation);
      performAnimationRef.current = performAnimation;
      useEffect(() => {
        if (!needFallback) return;
        if (!triggerElement.current) return;
        const trigger = triggerElement.current as HTMLElement;
        let elementWasHovered = injected;
        const enterHandler = () => {
          setInjected(true);
          elementWasHovered = true;
        };
        const leaveHandler = () => {
          if (interactive) {
            clearHideTimeout();
            hideTimeoutRef.current = setTimeout(() => {
              performAnimation(false);
            }, 300);
          } else {
            performAnimation(false);
          }
          elementWasHovered = false;
        };
        const mouseMoveHandler: EventListener = (e) => {
          if (!e.target) return;
          const elementIsHovered = isTargetElement(e.target as HTMLElement);
          if (elementWasHovered !== elementIsHovered) {
            if (elementIsHovered) {
              enterHandler();
            } else {
              leaveHandler();
            }
          }
        };
        trigger.parentNode?.addEventListener("mousemove", mouseMoveHandler);
        trigger.parentNode?.addEventListener("mouseleave", leaveHandler);
        return () => {
          const trigger = triggerElement.current;
          if (trigger) {
            trigger.parentNode?.removeEventListener("mousemove", mouseMoveHandler);
            trigger.parentNode?.removeEventListener("mouseleave", leaveHandler);
          }
        };
      }, [triggerElement.current, needFallback]);
    }

    const clone = cloneElement(child, {
      ...child.props,
      ref(el: any) {
        setRef(triggerElement, el);
        setRef(ref, el);
      },
      onMouseEnter(e: React.MouseEvent<HTMLDivElement>) {
        if (disabled === true) return;
        if (!isEnhancedTooltip || !needFallback) {
          setInjected(true);
        }
        child.props.onMouseEnter?.(e);
      },
      onMouseLeave(e: React.MouseEvent<HTMLDivElement>) {
        if (disabled === true) return;
        if (!isEnhancedTooltip || !needFallback) {
          if (interactive) {
            clearHideTimeout();
            hideTimeoutRef.current = setTimeout(() => {
              performAnimation(false);
            }, 300);
          } else {
            performAnimation(false);
          }
        }
        child.props.onMouseLeave?.(e);
      },
    });

    useEffect(() => {
      if (injected) performAnimation(true);
      return () => {
        clearHideTimeout();
      };
    }, [injected, performAnimation]);

    return (
      <>
        {clone}
        {createPortal(tooltip, document.body)}
      </>
    );
  },
);

export const Tooltip = forwardRef((props: TooltipProps, ref) => {
  const { children, ...rest } = props;
  const child = Children.only(children) as DetailedReactHTMLElement<any, HTMLElement>;

  if (!props.title) return child;

  if (!children || Array.isArray(children)) {
    throw new Error("Tooltip does accept a single child only");
  }

  return <TooltipInner {...rest} children={child} ref={ref} />;
});

Tooltip.displayName = "Tooltip";
