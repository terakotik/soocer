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

        // Player (Flipped)
        const playerHead = Matter.Bodies.circle(200, 460, 20, {
            mass: 5,
            restitution: 0.5,
            friction: 1.0,
            frictionAir: 0.05, // Increased air friction
            render: { fillStyle: '#29ABE2' }
        });

        const playerBody = Matter.Bodies.rectangle(200, 520, 40, 80, {
            chamfer: { radius: 10 },
            mass: 10,
            restitution: 0.2,
            frictionAir: 0.2, // Increased air friction for stability
            friction: 1.0, // Increased friction
            render: { fillStyle: '#29ABE2' }
        });

        const playerConstraint = Matter.Constraint.create({
            bodyA: playerHead,
            pointA: { x: 0, y: 0 },
            bodyB: playerBody,
            pointB: { x: 0, y: -40 },
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

        Matter.Composite.add(world, [ground, leftWall, rightWall, playerBody, playerHead, playerConstraint, ball]);
        
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
            const k = 1.0; // Stiffness
            const d = 0.5; // Damping
            const restoringTorque = -k * playerBody.angle - d * playerBody.angularVelocity;
            Matter.Body.setAngularVelocity(playerBody, playerBody.angularVelocity + restoringTorque);


            // Player movement
            if (keys['ArrowLeft'] || keys['KeyA']) {
                Matter.Body.applyForce(playerBody, playerBody.position, { x: -0.05, y: 0 });
            }
            if (keys['ArrowRight'] || keys['KeyD']) {
                Matter.Body.applyForce(playerBody, playerBody.position, { x: 0.05, y: 0 });
            }
            if (keys['ArrowUp'] || keys['KeyW'] || keys['Space']) {
                const isGrounded = Matter.Query.collides(playerBody, [ground]).length > 0;
                if(isGrounded) {
                    Matter.Body.applyForce(playerBody, playerBody.position, { x: 0, y: -0.5 });
                }
            }
        });

        // Collision Handling
        Matter.Events.on(engine, 'collisionStart', (event) => {
            event.pairs.forEach(pair => {
                const { bodyA, bodyB } = pair;
                const isFootAndBall = (bodyA === playerBody && bodyB === ball) || (bodyA === ball && bodyB === playerBody);

                if (isFootAndBall) {
                    const kickDirection = playerHead.position.x < ball.position.x ? 1 : -1;
                    const tumbleTorque = kickDirection * 0.8;
                    Matter.Body.setAngularVelocity(playerBody, playerBody.angularVelocity + tumbleTorque);
                    Matter.Body.applyForce(playerBody, playerBody.position, {x: -kickDirection * 0.05, y:-0.1});
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
