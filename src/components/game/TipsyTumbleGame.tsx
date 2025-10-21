"use client";

import React, { useEffect, useRef } from 'react';
import Matter from 'matter-js';

const TipsyTumbleGame: React.FC = () => {
    const sceneRef = useRef<HTMLDivElement>(null);
    // Use refs to store Matter.js objects to prevent re-creation on re-renders
    const engineRef = useRef(Matter.Engine.create({ gravity: { y: 1 }, constraintIterations: 4, positionIterations: 12, velocityIterations: 8 }));
    const runnerRef = useRef(Matter.Runner.create());
    const renderRef = useRef<Matter.Render | null>(null);

    useEffect(() => {
        const engine = engineRef.current;
        const world = engine.world;
        const runner = runnerRef.current;

        // Turn off gravity for a moment to stabilize
        engine.gravity.y = 0;

        // Ensure the component only initializes once
        if (renderRef.current || !sceneRef.current) {
            return;
        }

        const render = Matter.Render.create({
            element: sceneRef.current,
            engine: engine,
            options: {
                width: 800,
                height: 600,
                wireframes: false,
                background: '#D1E9F2'
            }
        });
        renderRef.current = render;

        // Bodies
        const ground = Matter.Bodies.rectangle(400, 610, 820, 60, { isStatic: true, render: { fillStyle: '#90EE90' } });
        const leftWall = Matter.Bodies.rectangle(-10, 300, 20, 620, { isStatic: true, render: { fillStyle: '#ADCDE0' } });
        const rightWall = Matter.Bodies.rectangle(810, 300, 20, 620, { isStatic: true, render: { fillStyle: '#ADCDE0' } });

        // Player
        const playerTorso = Matter.Bodies.rectangle(200, 480, 40, 80, {
            chamfer: { radius: 10 },
            mass: 10,
            restitution: 0.2,
            frictionAir: 0.05, // Increased air friction
            friction: 0.1,
            render: { fillStyle: '#29ABE2' }
        });

        const playerFoot = Matter.Bodies.circle(200, 540, 20, {
            mass: 5, // Increased mass for stability
            restitution: 0.5,
            friction: 1.0, // Increased friction
            render: { fillStyle: '#29ABE2' }
        });

        const playerConstraint = Matter.Constraint.create({
            bodyA: playerTorso,
            pointA: { x: 0, y: 40 },
            bodyB: playerFoot,
            pointB: { x: 0, y: 0 },
            stiffness: 0.1,
            length: 10,
            render: { visible: false }
        });

        // Ball
        const ball = Matter.Bodies.circle(600, 500, 30, {
            restitution: 0.9,
            friction: 0.01,
            mass: 1,
            render: { fillStyle: '#FFFFFF', strokeStyle: 'black', lineWidth: 2 }
        });

        Matter.Composite.add(world, [ground, leftWall, rightWall, playerTorso, playerFoot, playerConstraint, ball]);
        
        // Let the world settle, then turn gravity back on
        setTimeout(() => {
            engine.gravity.y = 1;
        }, 500);

        // Controls
        const keys: { [key: string]: boolean } = {};
        const handleKeyDown = (event: KeyboardEvent) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
                event.preventDefault();
            }
            keys[event.code] = true;
        };
        const handleKeyUp = (event: KeyboardEvent) => { keys[event.code] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Game Loop
        Matter.Events.on(engine, 'beforeUpdate', () => {
            // Stronger Self-righting torque
            const k = 0.8; // Stiffness
            const d = 0.2; // Damping
            const restoringTorque = -k * playerTorso.angle - d * playerTorso.angularVelocity;
            Matter.Body.setAngularVelocity(playerTorso, playerTorso.angularVelocity + restoringTorque);


            // Player movement
            if (keys['ArrowLeft'] || keys['KeyA']) {
                Matter.Body.applyForce(playerFoot, playerFoot.position, { x: -0.025, y: 0 });
            }
            if (keys['ArrowRight'] || keys['KeyD']) {
                Matter.Body.applyForce(playerFoot, playerFoot.position, { x: 0.025, y: 0 });
            }
            if (keys['ArrowUp'] || keys['KeyW'] || keys['Space']) {
                const isGrounded = Matter.Query.collides(playerFoot, [ground]).length > 0;
                if(isGrounded) {
                    Matter.Body.applyForce(playerFoot, playerFoot.position, { x: 0, y: -0.4 });
                }
            }
        });

        // Collision Handling
        Matter.Events.on(engine, 'collisionStart', (event) => {
            event.pairs.forEach(pair => {
                const { bodyA, bodyB } = pair;
                const isFootAndBall = (bodyA === playerFoot && bodyB === ball) || (bodyA === ball && bodyB === playerFoot);

                if (isFootAndBall) {
                    const kickDirection = playerTorso.position.x < ball.position.x ? 1 : -1;
                    const tumbleTorque = kickDirection * 0.8;
                    Matter.Body.setAngularVelocity(playerTorso, playerTorso.angularVelocity + tumbleTorque);
                    Matter.Body.applyForce(playerTorso, playerTorso.position, {x: -kickDirection * 0.05, y:-0.1});
                }
            });
        });

        Matter.Render.run(render);
        Matter.Runner.run(runner, engine);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            Matter.Render.stop(render);
            Matter.Runner.stop(runner);
            Matter.Composite.clear(world, false);
            Matter.Engine.clear(engine);
            render.canvas.remove();
            renderRef.current = null;
        };
    }, []);

    return <div ref={sceneRef} className="rounded-lg overflow-hidden shadow-2xl border-4 border-primary bg-muted" />;
};

export default TipsyTumbleGame;
