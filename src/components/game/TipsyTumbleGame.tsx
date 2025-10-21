
"use client";

import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '../ui/input';

const initialPhysicsConfig = {
    gravity: 1,
    constraintIterations: 2, // Lower for more "bendy" feel
    positionIterations: 6,
    velocityIterations: 4,
    headMass: 4, // Heavier head
    headRestitution: 0.2,
    headFriction: 0.1,
    headFrictionAir: 0.02,
    bodyMass: 2, // Lighter body
    bodyRestitution: 0.1,
    bodyFriction: 0.1,
    bodyFrictionAir: 0.08, // More air friction for floppy movement
    rightingStiffness: 0.015, // Low stiffness for wobbliness
    rightingDamping: 0.2, // High damping for a "heavy" feel
};

type PhysicsConfig = typeof initialPhysicsConfig;

const TipsyTumbleGame: React.FC = () => {
    const sceneRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef(Matter.Engine.create());
    const runnerRef = useRef(Matter.Runner.create());
    const renderRef = useRef<Matter.Render | null>(null);
    
    const [config, setConfig] = useState<PhysicsConfig>(initialPhysicsConfig);
    const playerRef = useRef<{ head: Matter.Body, body: Matter.Body } | null>(null);

    // Main game setup effect
    useEffect(() => {
        const engine = engineRef.current;
        const world = engine.world;
        const runner = runnerRef.current;
        
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

        const ground = Matter.Bodies.rectangle(400, 610, 820, 60, { isStatic: true, render: { fillStyle: '#90EE90' } });
        const leftWall = Matter.Bodies.rectangle(-10, 300, 20, 620, { isStatic: true, render: { fillStyle: '#ADCDE0' } });
        const rightWall = Matter.Bodies.rectangle(810, 300, 20, 620, { isStatic: true, render: { fillStyle: '#ADCDE0' } });
        
        const playerHead = Matter.Bodies.circle(200, 460, 20, { render: { fillStyle: '#29ABE2' } });
        const playerBody = Matter.Bodies.rectangle(200, 520, 40, 80, { chamfer: { radius: 10 }, render: { fillStyle: '#29ABE2' } });

        const playerConstraint = Matter.Constraint.create({
            bodyA: playerHead,
            bodyB: playerBody,
            stiffness: 0.1,
            length: 50,
            render: { visible: false }
        });

        const ball = Matter.Bodies.circle(600, 500, 30, {
            restitution: 0.9,
            friction: 0.01,
            mass: 1,
            render: { fillStyle: '#FFFFFF', strokeStyle: 'black', lineWidth: 2 }
        });

        Matter.Composite.add(world, [ground, leftWall, rightWall, playerBody, playerHead, playerConstraint, ball]);
        
        playerRef.current = { head: playerHead, body: playerBody };
        
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

        let jumpCooldown = false;

        Matter.Events.on(engine, 'beforeUpdate', () => {
            if (!playerRef.current) return;

            const { head: playerHead, body: playerBody } = playerRef.current;
            
            const currentConfig = (window as any).__tipsyTumbleConfig;
            if (!currentConfig) return;

            const { rightingStiffness, rightingDamping, bodyMass, bodyRestitution } = currentConfig;
            
            // Always apply self-righting torque
            const angle = playerBody.angle;
            const restitutionEffect = 1 + bodyRestitution * 5; 
            const restoringTorque = -rightingStiffness * angle * restitutionEffect - rightingDamping * playerBody.angularVelocity;
            Matter.Body.applyForce(playerBody, playerBody.position, { x: 0, y: -0.0001 * Math.abs(angle) });
            playerBody.torque += restoringTorque;

            const moveForce = 0.005 * bodyMass;

            if (keys['ArrowLeft'] || keys['KeyA']) {
                 Matter.Body.applyForce(playerHead, playerHead.position, { x: -moveForce, y: 0 });
            }
            if (keys['ArrowRight'] || keys['KeyD']) {
                Matter.Body.applyForce(playerHead, playerHead.position, { x: moveForce, y: 0 });
            }
            if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space']) && !jumpCooldown) {
                const isGrounded = Matter.Query.collides(playerBody, [ground]).length > 0;
                if (isGrounded) {
                    // Apply a "kick" force - up and a bit forward, plus torque
                    Matter.Body.applyForce(playerBody, playerBody.position, { x: 0, y: -(bodyMass * 0.3) });
                    playerBody.torque += 1.5; // Forward rotational force
                    jumpCooldown = true;
                    setTimeout(() => { jumpCooldown = false; }, 500); // 500ms cooldown
                }
            }
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

    // Effect to update physics when config changes
    useEffect(() => {
        (window as any).__tipsyTumbleConfig = config;

        const engine = engineRef.current;
        engine.gravity.y = config.gravity;
        engine.constraintIterations = config.constraintIterations;
        engine.positionIterations = config.positionIterations;
        engine.velocityIterations = config.velocityIterations;

        if (playerRef.current) {
            const { head, body } = playerRef.current;
            Matter.Body.setMass(head, config.headMass);
            head.restitution = config.headRestitution;
            head.friction = config.headFriction;
            head.frictionAir = config.headFrictionAir;

            Matter.Body.setMass(body, config.bodyMass);
            body.restitution = config.bodyRestitution;
            body.friction = config.bodyFriction;
            body.frictionAir = config.bodyFrictionAir;
        }
    }, [config]);


    const handleSliderChange = (key: keyof PhysicsConfig, value: number) => {
        setConfig(prev => ({...prev, [key]: value}));
    };
    
    const handleInputChange = (key: keyof PhysicsConfig, value: string) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            setConfig(prev => ({ ...prev, [key]: numValue }));
        }
    };


    return (
        <div className="relative">
             <div ref={sceneRef} className="rounded-lg overflow-hidden shadow-2xl border-4 border-primary bg-muted" />
             <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" size="icon" className="absolute top-4 right-4 bg-background/80 hover:bg-background">
                        <Settings className="h-5 w-5" />
                        <span className="sr-only">Game Settings</span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Настройки физики</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="gravity">Гравитация</Label>
                            <Slider id="gravity" min={0} max={2} step={0.1} value={[config.gravity]} onValueChange={([val]) => handleSliderChange('gravity', val)} className="col-span-2" />
                        </div>
                         <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="rightingStiffness">Жесткость выпрямления</Label>
                             <Slider id="rightingStiffness" min={0} max={0.2} step={0.005} value={[config.rightingStiffness]} onValueChange={([val]) => handleSliderChange('rightingStiffness', val)} className="col-span-2" />
                        </div>
                         <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="rightingDamping">Сила покачивания</Label>
                            <Slider id="rightingDamping" min={0} max={1} step={0.01} value={[config.rightingDamping]} onValueChange={([val]) => handleSliderChange('rightingDamping', val)} className="col-span-2" />
                        </div>
                        <h4 className="font-semibold mt-4">Тело</h4>
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="bodyFriction">Трение тела</Label>
                            <Slider id="bodyFriction" min={0} max={1} step={0.05} value={[config.bodyFriction]} onValueChange={([val]) => handleSliderChange('bodyFriction', val)} className="col-span-2" />
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="bodyFrictionAir">Сопр. воздуха (тело)</Label>
                            <Slider id="bodyFrictionAir" min={0} max={0.2} step={0.01} value={[config.bodyFrictionAir]} onValueChange={([val]) => handleSliderChange('bodyFrictionAir', val)} className="col-span-2" />
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="bodyMass">Масса тела</Label>
                            <Input id="bodyMass" type="number" value={config.bodyMass} onChange={(e) => handleInputChange('bodyMass', e.target.value)} className="col-span-2 h-8" />
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="bodyRestitution">Отскок тела</Label>
                            <Slider id="bodyRestitution" min={0} max={1} step={0.01} value={[config.bodyRestitution]} onValueChange={([val]) => handleSliderChange('bodyRestitution', val)} className="col-span-2" />
                        </div>

                        <h4 className="font-semibold mt-4">Голова</h4>
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="headFriction">Трение головы</Label>
                            <Slider id="headFriction" min={0} max={1} step={0.01} value={[config.headFriction]} onValueChange={([val]) => handleSliderChange('headFriction', val)} className="col-span-2" />
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="headFrictionAir">Сопр. воздуха (голова)</Label>
                            <Slider id="headFrictionAir" min={0} max={0.1} step={0.005} value={[config.headFrictionAir]} onValueChange={([val]) => handleSliderChange('headFrictionAir', val)} className="col-span-2" />
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="headMass">Масса головы</Label>
                             <Input id="headMass" type="number" value={config.headMass} onChange={(e) => handleInputChange('headMass', e.target.value)} className="col-span-2 h-8" />
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="headRestitution">Отскок головы</Label>
                            <Slider id="headRestitution" min={0} max={1} step={0.01} value={[config.headRestitution]} onValueChange={([val]) => handleSliderChange('headRestitution', val)} className="col-span-2" />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TipsyTumbleGame;
