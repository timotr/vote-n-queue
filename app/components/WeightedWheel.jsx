"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const SPIN_DURATION_MS = 4000;
const WHEEL_LABEL_ORIENTATION = "upright";
const WHEEL_COLORS = ["#20c997", "#4dabf7", "#ffd43b", "#ff8787", "#b197fc", "#63e6be"];
const CONFETTI_COLORS = ["#20c997", "#4dabf7", "#ffd43b", "#ff8787", "#b197fc", "#f06595"];
const CONFETTI_PARTICLES = Array.from({ length: 84 }, (_, index) => ({
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  delay: `${(index % 14) * 45}ms`,
  drift: `${((index * 47) % 42) - 21}vw`,
  rotation: `${((index * 83) % 1080) - 540}deg`,
  lift: `${22 + ((index * 29) % 16)}vh`,
  fall: `${48 + ((index * 31) % 28)}vh`,
  left: `${36 + ((index * 19) % 29)}%`,
  top: `${54 + ((index * 23) % 10)}%`,
  duration: `${2600 + ((index * 53) % 1500)}ms`,
}));

function normalizeName(name) {
  return String(name ?? "").trim();
}

function getWheelSegments(items) {
  const totalVotes = items.reduce((sum, item) => sum + item.votes, 0);
  let cursor = 0;

  return items.map((item, index) => {
    const start = cursor;
    const size = totalVotes > 0 ? item.votes / totalVotes : 0;
    const end = index === items.length - 1 ? 1 : start + size;
    cursor = end;

    return {
      ...item,
      color: WHEEL_COLORS[index % WHEEL_COLORS.length],
      start,
      end,
      midpoint: start + (end - start) / 2,
      size,
    };
  });
}

function getWheelLabelStyle(segment) {
  const angle = segment.midpoint * 360;
  const radians = (angle * Math.PI) / 180;
  const radius = Math.min(34, Math.max(18, 20 + segment.size * 34));
  const left = 50 + Math.sin(radians) * radius;
  const top = 50 - Math.cos(radians) * radius;

  return {
    left: `${Math.min(86, Math.max(14, left))}%`,
    top: `${Math.min(86, Math.max(14, top))}%`,
    "--label-scale": Math.min(1, Math.max(0.68, 0.6 + segment.size * 1.6)),
    "--label-width": `${Math.min(30, Math.max(12, 14 + segment.size * 40))}cqi`,
  };
}

function getWheelLabelRotation(rotation) {
  return WHEEL_LABEL_ORIENTATION === "upright" ? -rotation : 0;
}

function ConfettiBurst({ burstKey }) {
  if (!burstKey) return null;

  return (
    <div className="confetti-layer" aria-hidden="true" key={burstKey}>
      {CONFETTI_PARTICLES.map((particle, index) => (
        <span
          className="confetti-piece"
          key={`${burstKey}-${index}`}
          style={{
            "--confetti-color": particle.color,
            "--confetti-delay": particle.delay,
            "--confetti-drift": particle.drift,
            "--confetti-rotation": particle.rotation,
            "--confetti-lift": particle.lift,
            "--confetti-fall": particle.fall,
            "--confetti-left": particle.left,
            "--confetti-top": particle.top,
            "--confetti-duration": particle.duration,
          }}
        />
      ))}
    </div>
  );
}

export default function WeightedWheel({ ariaLabel = "Weighted vote wheel", isAdmin, items = [], onSpin, spinAngle, spinLabel = "SPIN" }) {
  const [confettiBurstKey, setConfettiBurstKey] = useState(0);
  const [wheelRotation, setWheelRotation] = useState(0);
  const animation = useRef();
  const labelAnimations = useRef([]);
  const lastObservedSpinAngle = useRef(null);
  const previousEndDegree = useRef(0);
  const spinToken = useRef(0);
  const wheel = useRef();

  const wheelSegments = useMemo(() => getWheelSegments(items), [items]);
  const wheelGradient =
    wheelSegments.length > 0
      ? wheelSegments
          .map(
            (segment) =>
              `${segment.color} ${Math.round(segment.start * 10000) / 100}% ${Math.round(segment.end * 10000) / 100}%`
          )
          .join(", ")
      : "#ced4da 0% 100%";

  const spinWheel = (newEndDegree) => {
    if (!wheel.current) return;
    const currentSpinToken = spinToken.current + 1;
    spinToken.current = currentSpinToken;
    const animationOptions = {
      duration: SPIN_DURATION_MS,
      direction: "normal",
      easing: "cubic-bezier(0.12, 0.82, 0.16, 1)",
      fill: "forwards",
      iterations: 1,
    };

    if (animation.current) animation.current.cancel();
    labelAnimations.current.forEach((labelAnimation) => labelAnimation.cancel());

    animation.current = wheel.current.animate(
      [
        { transform: `rotate(${previousEndDegree.current}deg)` },
        { transform: `rotate(${newEndDegree}deg)` },
      ],
      animationOptions
    );
    labelAnimations.current = Array.from(wheel.current.querySelectorAll(".wheel-label-text")).map((label) =>
      label.animate(
        [
          { transform: `rotate(${getWheelLabelRotation(previousEndDegree.current)}deg)` },
          { transform: `rotate(${getWheelLabelRotation(newEndDegree)}deg)` },
        ],
        animationOptions
      )
    );

    animation.current.finished
      .then(() => {
        if (spinToken.current === currentSpinToken) {
          setWheelRotation(newEndDegree % 360);
          setConfettiBurstKey((key) => key + 1);
        }
      })
      .catch(() => {});

    previousEndDegree.current = newEndDegree;
  };

  useEffect(() => {
    if (typeof spinAngle !== "number") return;

    if (lastObservedSpinAngle.current === null) {
      lastObservedSpinAngle.current = spinAngle;
      previousEndDegree.current = spinAngle;
      setWheelRotation(spinAngle % 360);
      return;
    }

    if (lastObservedSpinAngle.current === spinAngle) return;

    lastObservedSpinAngle.current = spinAngle;
    spinWheel(spinAngle);
  }, [spinAngle]);

  return (
    <fieldset className="ui-wheel-of-fortune">
      <div
        aria-label={ariaLabel}
        className="wheel-disc"
        ref={wheel}
        style={{
          background: `conic-gradient(from 0deg, ${wheelGradient})`,
          transform: `rotate(${wheelRotation}deg)`,
        }}
      >
        {wheelSegments.map((segment, index) => (
          <span
            className="wheel-label"
            key={`${normalizeName(segment.name).toLowerCase()}-${index}`}
            style={{
              ...getWheelLabelStyle(segment),
              "--wheel-rotation": `${getWheelLabelRotation(wheelRotation)}deg`,
            }}
          >
            <span className="wheel-label-text">{segment.name}</span>
          </span>
        ))}
      </div>
      <ConfettiBurst burstKey={confettiBurstKey} />
      {isAdmin && (
        <button type="button" onClick={onSpin}>
          {spinLabel}
        </button>
      )}
    </fieldset>
  );
}
