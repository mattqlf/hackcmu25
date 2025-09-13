'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Ripple {
  id: number;
  x: number;
  y: number;
  timestamp: number;
}

export function LiquidBackground() {
  const cursorFollowerRef = useRef<HTMLDivElement>(null);
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);
  const orb3Ref = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const createRipple = useCallback((x: number, y: number) => {
    const newRipple = {
      id: Date.now() + Math.random(),
      x,
      y,
      timestamp: Date.now(),
    };

    setRipples(prev => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 2000);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (cursorFollowerRef.current) {
        cursorFollowerRef.current.style.transform = `translate(${e.clientX - 150}px, ${e.clientY - 150}px)`;
      }

      // Create subtle wave effect in orbs based on mouse position
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const distanceFromCenter = Math.sqrt((e.clientX - centerX) ** 2 + (e.clientY - centerY) ** 2);
      const maxDistance = Math.sqrt(centerX ** 2 + centerY ** 2);
      const intensity = Math.max(0, 1 - distanceFromCenter / maxDistance);

      if (orb1Ref.current) {
        const offsetX = (e.clientX - centerX) * 0.02;
        const offsetY = (e.clientY - centerY) * 0.02;
        orb1Ref.current.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${1 + intensity * 0.1})`;
      }

      if (orb2Ref.current) {
        const offsetX = (e.clientX - centerX) * -0.015;
        const offsetY = (e.clientY - centerY) * -0.015;
        orb2Ref.current.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${1 + intensity * 0.05})`;
      }

      if (orb3Ref.current) {
        const offsetX = (e.clientX - centerX) * 0.025;
        const offsetY = (e.clientY - centerY) * -0.02;
        orb3Ref.current.style.transform = `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${1 + intensity * 0.15})`;
      }
    };

    const handleClick = (e: MouseEvent) => {
      createRipple(e.clientX, e.clientY);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
    };
  }, [createRipple]);

  return (
    <>
      <div className="liquid-bg">
        <div ref={orb1Ref} className="gradient-orb gradient-orb-1"></div>
        <div ref={orb2Ref} className="gradient-orb gradient-orb-2"></div>
        <div ref={orb3Ref} className="gradient-orb gradient-orb-3"></div>
      </div>
      <div ref={cursorFollowerRef} className="cursor-follower"></div>

      {/* Ripple effects */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="ripple-effect"
          style={{
            left: ripple.x,
            top: ripple.y,
          }}
        />
      ))}
    </>
  );
}