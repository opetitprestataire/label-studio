import { observer } from "mobx-react";
import { getRoot } from "mobx-state-tree";
import { Button, Tooltip } from "@humansignal/ui";
import { PauseCircleOutlined, PlayCircleOutlined } from "@ant-design/icons";
import styles from "./Paragraphs.module.scss";
import { FF_LSDV_E_278, FF_NER_SELECT_ALL, isFF } from "../../../utils/feature-flags";
import { IconPause, IconPlay, IconLsLabeling } from "@humansignal/icons";
import { useRef, useCallback, useEffect, useState } from "react";

const formatTime = (seconds) => {
  if (isNaN(seconds)) return "";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.round(seconds % 60);

  const formattedHours = String(hours).padStart(2, "0");
  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(remainingSeconds).padStart(2, "0");

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
};

export const Phrases = observer(({ item, playingId, activeRef, setIsInViewport, hasSelectedLabels }) => {
  const [animationKeyFrame, setAnimationKeyFrame] = useState(null);
  const [seek, setSeek] = useState(0);
  const [isSeek, setIsSeek] = useState(null);
  const cls = item.layoutClasses;
  const withAudio = !!item.audio;
  let observer;

  const phraseRefs = useRef([]);

  // default function to animate the reading line
  const animateElement = useCallback(
    (element, start, duration, isPlaying = true) => {
      if (!element || !isFF(FF_LSDV_E_278) || !item.contextscroll) return;

      const _animationKeyFrame = element.animate([{ top: `${start}%` }, { top: "100%" }], {
        easing: "linear",
        duration: duration * 1000,
      });

      if (isPlaying) _animationKeyFrame.play();
      else _animationKeyFrame.pause();

      setAnimationKeyFrame(_animationKeyFrame);
    },
    [animationKeyFrame, setAnimationKeyFrame],
  );

  // this function is used to animate the reading line when user seek audio
  const setSeekAnimation = useCallback(
    (isSeeking) => {
      if (!isFF(FF_LSDV_E_278) || !item.contextscroll) return;

      const duration = item._value[playingId]?.duration || item._value[playingId]?.end - item._value[playingId]?.start;
      const endTime = !item._value[playingId]?.end
        ? item._value[playingId]?.start + item._value[playingId]?.duration
        : item._value[playingId]?.end;
      const seekDuration = endTime - seek.time;
      const startValue = 100 - (seekDuration * 100) / duration;

      if (startValue > 0 && startValue < 100)
        animateElement(activeRef.current?.querySelector(".reading-line"), startValue, seekDuration, seek.playing);
      else setIsSeek(isSeeking);
    },
    [seek, playingId],
  );

  // useRef to get the reading line element
  const readingLineRef = useCallback(
    (node) => {
      if (observer) {
        observer.disconnect();
      }

      if (node !== null) {
        const duration =
          item._value[playingId]?.duration || item._value[playingId]?.end - item._value[playingId]?.start;

        if (!isNaN(duration)) {
          animateElement(node, 0, duration, item.playing);
        }

        observer = new IntersectionObserver(
          (entries) => {
            setIsInViewport(entries[0].isIntersecting);
          },
          {
            rootMargin: "0px",
          },
        );

        observer.observe(node);
      }
    },
    [playingId],
  );

  useEffect(() => {
    if (!isFF(FF_LSDV_E_278) || !item.contextscroll) return;

    item.syncHandlers?.set("seek", (seek) => {
      item.handleSyncPlay(seek);
      setSeek(seek);
      setIsInViewport(true);
    });

    return () => {
      observer?.disconnect();
    };
  }, []);

  // when user seek audio, the useEffect will be triggered and animate the reading line to the seek position
  useEffect(() => {
    setSeekAnimation(true);
  }, [seek]);

  // when user seek audio to a different playing phrase, the useEffect will be triggered and animate the reading line to the seek position
  useEffect(() => {
    if (!isSeek) return;

    setSeekAnimation(false);
  }, [playingId]);

  // when user click on play/pause button, the useEffect will be triggered and pause or play the reading line animation
  useEffect(() => {
    if (!isFF(FF_LSDV_E_278) || !item.contextscroll) return;

    if (item.playing) animationKeyFrame?.play();
    else animationKeyFrame?.pause();
  }, [item.playing]);

  useEffect(() => {
    // Scroll the active phrase into view and focus it when playingId changes
    if (isFF(FF_NER_SELECT_ALL) && phraseRefs.current[playingId]) {
      const element = phraseRefs.current[playingId];
      element?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      element?.focus?.();
    }
  }, [playingId]);

  if (!item._value) return null;

  const val = item._value.map((v, idx) => {
    const isActive = playingId === idx;
    const isPlaying = isActive && item.playing;
    const style = isFF(FF_LSDV_E_278) && !isActive ? item.layoutStyles(v).inactive : item.layoutStyles(v);
    const classNames = [cls.phrase];

    // Add newUI class when FF_LSDV_E_278 is enabled
    if (isFF(FF_LSDV_E_278)) {
      classNames.push(styles.newUI);
    }

    // Add extra padding class when select all button is present (FF_NER_SELECT_ALL)
    if (isFF(FF_NER_SELECT_ALL)) {
      classNames.push(styles.withSelectAllButton);
    }

    const isContentVisible = item.isVisibleForAuthorFilter(v);

    const withFormattedTime = (item) => {
      const startTime = formatTime(item._value[idx]?.start);
      const endTime = formatTime(
        !item._value[idx]?.end ? item._value[idx]?.start + item._value[idx]?.duration : item._value[idx]?.end,
      );

      return `${startTime} - ${endTime}`;
    };

    if (withAudio) classNames.push(styles.withAudio);
    if (!isContentVisible) classNames.push(styles.collapsed);
    if (getRoot(item).settings.showLineNumbers) classNames.push(styles.numbered);

    return (
      <div className={styles.phraseContainer}>
        {isContentVisible && withAudio && !isNaN(v.start) && (
          <Button
            look="string"
            className={isFF(FF_LSDV_E_278) ? styles.playNewUi : styles.play}
            aria-label={isPlaying ? "pause" : "play"}
            icon={
              isPlaying ? (
                isFF(FF_LSDV_E_278) ? (
                  <IconPause />
                ) : (
                  <PauseCircleOutlined />
                )
              ) : isFF(FF_LSDV_E_278) ? (
                <IconPlay />
              ) : (
                <PlayCircleOutlined />
              )
            }
            onClick={(e) => {
              e.stopPropagation();
              setIsInViewport(true);
              item.play(idx);
            }}
          />
        )}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <div
          key={`${item.name}-${idx}`}
          ref={(el) => {
            phraseRefs.current[idx] = el;
            if (isActive && activeRef) activeRef.current = el;
          }}
          tabIndex={idx}
          data-testid={`phrase:${idx}`}
          className={`${classNames.join(" ")} ${isFF(FF_NER_SELECT_ALL) && isActive ? styles.activePhrase : ""}`}
          style={style?.phrase}
          onClick={isFF(FF_NER_SELECT_ALL) ? () => item.seekToPhrase(idx) : undefined}
        >
          {isFF(FF_NER_SELECT_ALL) && (
            <Tooltip
              title={hasSelectedLabels ? "Label whole utterance" : "Select a label first to enable labeling"}
              placement="top"
            >
              <span className={styles.selectAllBtnWrapper}>
                <Button
                  size="small"
                  look="outlined"
                  variant="neutral"
                  disabled={!hasSelectedLabels}
                  className={styles.selectAllBtn}
                  aria-label={hasSelectedLabels ? "Label whole utterance" : "Label whole utterance (disabled)"}
                  onClick={(e) => {
                    if (hasSelectedLabels) {
                      item.selectAndAnnotatePhrase?.(idx);
                    }
                  }}
                >
                  <IconLsLabeling />
                </Button>
              </span>
            </Tooltip>
          )}

          {isFF(FF_LSDV_E_278) ? (
            <span className={styles.titleWrapper} data-skip-node="true">
              <span className={cls?.name} style={style?.name}>
                {v[item.namekey]}
              </span>
              <span className={styles.time}>{withFormattedTime(item)}</span>
            </span>
          ) : (
            <span className={cls?.name} data-skip-node="true" style={style?.name}>
              {v[item.namekey]}
            </span>
          )}

          {isFF(FF_LSDV_E_278) ? (
            <span className={styles.wrapperText}>
              {isActive && (
                <span ref={readingLineRef} className={`${styles.readingLine} reading-line`} data-skip-node="true" />
              )}
              <span className={`${cls?.text}`}>{v[item.textkey]}</span>
            </span>
          ) : (
            <span className={`${cls?.text}`}>{v[item.textkey]}</span>
          )}
        </div>
      </div>
    );
  });

  return val;
});
