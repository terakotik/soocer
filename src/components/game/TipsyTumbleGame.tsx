
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
    constraintIterations: 2,
    positionIterations: 6,
    velocityIterations: 4,
    bodyMass: 5,
    bodyRestitution: 0.1,
    bodyFriction: 0.1,
    bodyFrictionAir: 0.02,
    rightingStiffness: 0.2,
    rightingDamping: 0.1,
    kickForce: 0,
};

type PhysicsConfig = typeof initialPhysicsConfig;

const TipsyTumbleGame: React.FC = () => {
    const sceneRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef(Matter.Engine.create());
    const runnerRef = useRef(Matter.Runner.create());
    const renderRef = useRef<Matter.Render | null>(null);
    
    const [config, setConfig] = useState<PhysicsConfig>(initialPhysicsConfig);
    const playerRef = useRef<Matter.Body | null>(null);
    const keysDown = useRef<{ [key: string]: boolean }>({});
    const canJump = useRef(true);

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
        const ceiling = Matter.Bodies.rectangle(400, -10, 820, 20, { isStatic: true, render: { fillStyle: '#ADCDE0' } });

        // Create the new player shape
        const playerX = 200;
        const playerY = 500;
        
        const bottom = Matter.Bodies.circle(playerX, playerY + 20, 30, { 
            density: 0.1, 
            friction: 0.5,
            restitution: 0.1,
            render: { fillStyle: '#1a1a1a' } 
        });

        const topVertices = Matter.Vertices.fromPath('0 20 -40 20 -40 -10 -25 -60 -15 -100 15 -100 25 -60 40 -10 40 20');
        const top = Matter.Bodies.fromVertices(playerX, playerY - 45, [topVertices], {
            density: 0.001,
            friction: 0.2,
            restitution: 0.1,
            render: { fillStyle: '#e54530' }
        });
        
        const playerBody = Matter.Body.create({
            parts: [bottom, top],
            frictionAir: 0.02,
            friction: 0.1,
        });

        Matter.Body.setMass(playerBody, config.bodyMass);

        Matter.Composite.add(world, [ground, leftWall, rightWall, ceiling, playerBody]);
        
        playerRef.current = playerBody;
        
        const handleKeyDown = (event: KeyboardEvent) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
                event.preventDefault();
            }
            keysDown.current[event.code] = true;
        };
        const handleKeyUp = (event: KeyboardEvent) => { 
            keysDown.current[event.code] = false; 
            if (['ArrowUp', 'KeyW', 'Space'].includes(event.code)) {
                canJump.current = true;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        Matter.Events.on(engine, 'beforeUpdate', () => {
            const playerBody = playerRef.current;
            if (!playerBody) return;

            const currentConfig = (window as any).__tipsyTumbleConfig;
            if (!currentConfig) return;
            
            const { rightingStiffness, rightingDamping, bodyMass } = currentConfig;
            
            // Self-righting force
            const angle = playerBody.angle;
            const restoringTorque = -angle * rightingStiffness - playerBody.angularVelocity * rightingDamping;
            playerBody.torque += restoringTorque;

            const moveForce = 0.005 * bodyMass;

            if (keysDown.current['ArrowLeft'] || keysDown.current['KeyA']) {
                 Matter.Body.applyForce(playerBody, playerBody.position, { x: -moveForce, y: 0 });
            }
            if (keysDown.current['ArrowRight'] || keysDown.current['KeyD']) {
                Matter.Body.applyForce(playerBody, playerBody.position, { x: moveForce, y: 0 });
            }
             if ((keysDown.current['ArrowUp'] || keysDown.current['KeyW'] || keysDown.current['Space'])) {
                if (canJump.current) {
                    // Check if player is on the ground
                    const collisions = Matter.Query.collides(playerBody, [ground]);
                    if (collisions.length > 0) {
                        Matter.Body.applyForce(playerBody, playerBody.position, {x: 0, y: -0.05 * bodyMass});
                        canJump.current = false;
                    }
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
            if(render.canvas) {
              render.canvas.remove();
            }
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
            const playerBody = playerRef.current;
            Matter.Body.setMass(playerBody, config.bodyMass);
            playerBody.restitution = config.bodyRestitution;
            playerBody.friction = config.bodyFriction;
            playerBody.frictionAir = config.bodyFrictionAir;
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
                             <Slider id="rightingStiffness" min={0} max={0.5} step={0.01} value={[config.rightingStiffness]} onValueChange={([val]) => handleSliderChange('rightingStiffness', val)} className="col-span-2" />
                        </div>
                         <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="rightingDamping">Демпфирование</Label>
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
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TipsyTumbleGame;
