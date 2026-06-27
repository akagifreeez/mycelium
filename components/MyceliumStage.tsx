"use client";

import { useEffect, useRef, useState } from "react";
import { buildScene, drawFrame, LOGICAL_W, LOGICAL_H, Scene } from "@/lib/mycelium";
import { AgentTrace } from "@/lib/trace";
import leftTrace from "@/data/left.json";
import rightTrace from "@/data/right.json";

const GROW_SEC = 9;      // seconds for a full grow+bloom pass
const MAX_TF = 1.06;     // let the late bloom finish
const LOOP_HOLD = 0.28;  // extra virtual time held at the end before looping

export default function MyceliumStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const tfRef = useRef(0);
  const playingRef = useRef(true);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = LOGICAL_W * dpr;
    canvas.height = LOGICAL_H * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const glow = document.createElement("canvas");
    glow.width = LOGICAL_W;
    glow.height = LOGICAL_H;

    const scene: Scene = buildScene({
      left: leftTrace as unknown as AgentTrace,
      right: rightTrace as unknown as AgentTrace,
    });

    let raf = 0;
    let last = performance.now();
    const speed = 1 / GROW_SEC;

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (playingRef.current) {
        tfRef.current += dt * speed;
        if (tfRef.current > MAX_TF + LOOP_HOLD) tfRef.current = 0;
      }
      const tf = Math.min(MAX_TF, tfRef.current);
      drawFrame(ctx, glow, scene, tf);
      if (sliderRef.current && document.activeElement !== sliderRef.current) {
        sliderRef.current.value = String(Math.min(1, tfRef.current / MAX_TF));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const togglePlay = () => {
    const next = !playingRef.current;
    playingRef.current = next;
    setPlaying(next);
  };
  const restart = () => {
    tfRef.current = 0;
    playingRef.current = true;
    setPlaying(true);
  };
  const onScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    tfRef.current = parseFloat(e.target.value) * MAX_TF;
    playingRef.current = false;
    setPlaying(false);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="stage"
        onClick={togglePlay}
        title="クリックで再生 / 一時停止"
        aria-label="An AI agent's reasoning rendered as a growing fungus"
      />
      <div className="controls">
        <button onClick={togglePlay} aria-label={playing ? "一時停止" : "再生"}>
          {playing ? "❚❚" : "▶"}
        </button>
        <button onClick={restart} aria-label="最初から">↺</button>
        <input
          ref={sliderRef}
          className="scrub"
          type="range"
          min={0}
          max={1}
          step={0.001}
          defaultValue={0}
          onChange={onScrub}
          aria-label="タイムライン"
        />
      </div>
    </div>
  );
}
