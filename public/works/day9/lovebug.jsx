import React, { useState, useEffect, useRef } from 'react';

// Letter patterns - each letter as circle positions
const LETTER_PATTERNS = {
  L: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[2,4]],
  O: [[0,1],[0,2],[0,3],[1,0],[1,4],[2,0],[2,4],[3,1],[3,2],[3,3]],
  V: [[0,0],[0,1],[0,2],[1,3],[2,3],[3,0],[3,1],[3,2]],
  E: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,0],[1,2],[1,4],[2,0],[2,2],[2,4]],
  B: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,0],[1,2],[1,4],[2,0],[2,2],[2,4],[3,1],[3,3]],
  U: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[2,4],[3,0],[3,1],[3,2],[3,3],[3,4]],
  G: [[1,0],[2,0],[3,0],[0,1],[0,2],[0,3],[1,4],[2,4],[3,4],[3,3],[3,2],[2,2]]
};

const LoveBug = ({ id, initialX, initialY, onRemove }) => {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [velocity, setVelocity] = useState({ 
    x: (Math.random() - 0.5) * 4, 
    y: (Math.random() - 0.5) * 4 
  });
  const [targetVelocity, setTargetVelocity] = useState({ 
    x: (Math.random() - 0.5) * 4, 
    y: (Math.random() - 0.5) * 4 
  });
  const [isSeparating, setIsSeparating] = useState(false);
  const [separatePos, setSeparatePos] = useState({ love: { x: 0, y: 0 }, bug: { x: 0, y: 0 } });
  const [separateVel, setSeparateVel] = useState({ love: { x: 0, y: 0 }, bug: { x: 0, y: 0 } });
  const [rotation] = useState(0); // Fixed at 0 - no rotation
  const [textVibration, setTextVibration] = useState({ x: 0, y: 0 });
  const [isDashing, setIsDashing] = useState(true);
  
  const frameRef = useRef(0);
  const nextChangeRef = useRef(Math.random() * 50 + 30); // Next direction change

  useEffect(() => {
    let animationId;
    const animate = () => {
      frameRef.current++;
      
      if (!isSeparating) {
        // Fly behavior: fast dash then pause
        if (frameRef.current >= nextChangeRef.current) {
          if (isDashing) {
            // Pause/hover
            setIsDashing(false);
            setTargetVelocity({ x: 0, y: 0 });
            nextChangeRef.current = frameRef.current + Math.random() * 20 + 10; // Short pause
          } else {
            // Start new dash in random direction
            setIsDashing(true);
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 1; // 2-3 speed
            setTargetVelocity({
              x: Math.cos(angle) * speed,
              y: Math.sin(angle) * speed
            });
            nextChangeRef.current = frameRef.current + Math.random() * 60 + 40; // Longer dash
          }
        }
        
        // Quick acceleration
        setVelocity(v => ({
          x: v.x + (targetVelocity.x - v.x) * 0.25,
          y: v.y + (targetVelocity.y - v.y) * 0.25
        }));

        setPosition(prev => {
          let newX = prev.x + velocity.x;
          let newY = prev.y + velocity.y;
          
          // Bounce and change direction when hitting walls
          if (newX < 50 || newX > window.innerWidth - 350) {
            newX = Math.max(50, Math.min(window.innerWidth - 350, newX));
            // New random direction when hitting wall
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 1;
            setTargetVelocity({
              x: Math.cos(angle) * speed,
              y: Math.sin(angle) * speed
            });
            setIsDashing(true);
            nextChangeRef.current = frameRef.current + Math.random() * 60 + 40;
          }
          
          if (newY < 50 || newY > window.innerHeight - 120) {
            newY = Math.max(50, Math.min(window.innerHeight - 120, newY));
            // New random direction when hitting wall
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 1;
            setTargetVelocity({
              x: Math.cos(angle) * speed,
              y: Math.sin(angle) * speed
            });
            setIsDashing(true);
            nextChangeRef.current = frameRef.current + Math.random() * 60 + 40;
          }
          
          return { x: newX, y: newY };
        });

        // Fast wing flapping when moving fast
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        if (speed > 2) {
          // Text vibration when flying fast
          setTextVibration({
            x: Math.sin(frameRef.current * 1.2) * 1.5,
            y: Math.cos(frameRef.current * 1.5) * 1.5
          });
        } else {
          setTextVibration({ x: 0, y: 0 });
        }
        
        // No rotation - always horizontal
      } else {
        // Separation physics
        setSeparatePos(prev => ({
          love: {
            x: prev.love.x + separateVel.love.x,
            y: prev.love.y + separateVel.love.y
          },
          bug: {
            x: prev.bug.x + separateVel.bug.x,
            y: prev.bug.y + separateVel.bug.y
          }
        }));

        setSeparateVel(prev => ({
          love: { 
            x: prev.love.x * 0.98,
            y: prev.love.y + 0.5 
          },
          bug: { 
            x: prev.bug.x * 0.98,
            y: prev.bug.y + 0.5 
          }
        }));
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [velocity, targetVelocity, isDashing, isSeparating, separateVel]);

  useEffect(() => {
    if (isSeparating) {
      const maxDist = Math.max(
        Math.abs(separatePos.love.y),
        Math.abs(separatePos.bug.y)
      );
      if (maxDist > 600) {
        onRemove(id);
      }
    }
  }, [separatePos, isSeparating, id, onRemove]);

  const handleClick = () => {
    if (!isSeparating) {
      setIsSeparating(true);
      setSeparateVel({
        love: { x: -6 - Math.random() * 3, y: -8 - Math.random() * 2 },
        bug: { x: 6 + Math.random() * 3, y: -8 - Math.random() * 2 }
      });
    }
  };

  const renderLetter = (letter, offsetX, color, outlineColor) => {
    const pattern = LETTER_PATTERNS[letter];
    const circleSize = 10;
    const spacing = 14;

    return pattern.map((pos, i) => (
      <circle
        key={i}
        cx={offsetX + pos[0] * spacing}
        cy={pos[1] * spacing}
        r={circleSize}
        fill={color}
        stroke={outlineColor}
        strokeWidth={3}
      />
    ));
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        cursor: 'pointer',
        transform: `rotate(${rotation}deg)`,
        transformOrigin: '175px 50px',
        transition: 'transform 0.3s ease-out'
      }}
    >
      <svg width="350" height="120" style={{ overflow: 'visible' }}>
        {/* LOVE bug - Green (upper angle) */}
        <g transform={`translate(${separatePos.love.x}, ${-15 + separatePos.love.y}) rotate(-8, 100, 50)`}>
          {/* Antennae on L (head of LOVE bug) */}
          <line x1="5" y1="8" x2="0" y2="-8" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="12" y1="8" x2="17" y2="-8" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="0" cy="-8" r="3.5" fill="#000" />
          <circle cx="17" cy="-8" r="3.5" fill="#000" />
          
          {/* LOVE letters with vibration */}
          <g transform={`translate(${textVibration.x}, ${textVibration.y})`}>
            {renderLetter('L', 0, '#00FF00', '#FF0000')}
            {renderLetter('O', 45, '#00FF00', '#FF0000')}
            {renderLetter('V', 105, '#00FF00', '#FF0000')}
            {renderLetter('E', 160, '#00FF00', '#FF0000')}
          </g>
        </g>

        {/* BUG bug - Yellow (lower angle) */}
        <g transform={`translate(${200 + separatePos.bug.x}, ${15 + separatePos.bug.y}) rotate(8, 75, 50)`}>
          {/* BUG letters with vibration */}
          <g transform={`translate(${textVibration.x}, ${textVibration.y})`}>
            {renderLetter('B', 0, '#FFFF00', '#FF0000')}
            {renderLetter('U', 55, '#FFFF00', '#FF0000')}
            {renderLetter('G', 115, '#FFFF00', '#FF0000')}
          </g>
          
          {/* Antennae on G (head of BUG bug) */}
          <line x1="120" y1="8" x2="115" y2="-8" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="127" y1="8" x2="132" y2="-8" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="115" cy="-8" r="3.5" fill="#000" />
          <circle cx="132" cy="-8" r="3.5" fill="#000" />
        </g>
      </svg>
    </div>
  );
};

export default function LoveBugArt() {
  const [bugs, setBugs] = useState([]);
  const nextIdRef = useRef(0);

  useEffect(() => {
    // Spawn initial bugs
    const initialBugs = Array.from({ length: 2 }, () => ({
      id: nextIdRef.current++,
      x: Math.random() * (window.innerWidth - 400),
      y: Math.random() * (window.innerHeight - 120)
    }));
    setBugs(initialBugs);

    // Spawn new bug every 7 seconds
    const interval = setInterval(() => {
      setBugs(prev => {
        if (prev.length >= 4) return prev; // Max 4 bugs
        return [...prev, {
          id: nextIdRef.current++,
          x: Math.random() * (window.innerWidth - 400),
          y: Math.random() * (window.innerHeight - 120)
        }];
      });
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  const removeBug = (id) => {
    setBugs(prev => prev.filter(bug => bug.id !== id));
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0066FF 0%, #0099FF 100%)',
      overflow: 'hidden',
      position: 'relative',
      fontFamily: 'monospace'
    }}>
      {/* Title */}
      <div style={{
        position: 'fixed',
        top: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '52px',
        fontWeight: 'bold',
        color: '#FFFFFF',
        textShadow: '4px 4px 0 #FF0000, 2px 2px 8px rgba(0,0,0,0.3)',
        letterSpacing: '6px',
        zIndex: 1000,
        pointerEvents: 'none',
        fontFamily: 'monospace'
      }}>
        🐛 LOVEBUG SEASON 💕
      </div>

      {/* Instructions */}
      <div style={{
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '20px',
        color: '#FFFFFF',
        textAlign: 'center',
        zIndex: 1000,
        pointerEvents: 'none',
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
        fontFamily: 'monospace',
        fontWeight: 'bold'
      }}>
        클릭하면 뽈뽈뽈 분리! 👆
      </div>

      {/* Render all bugs */}
      {bugs.map(bug => (
        <LoveBug
          key={bug.id}
          id={bug.id}
          initialX={bug.x}
          initialY={bug.y}
          onRemove={removeBug}
        />
      ))}
    </div>
  );
}
