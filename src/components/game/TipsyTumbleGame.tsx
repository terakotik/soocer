
"use client";

import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { Button } from '@/components/ui/button';
import { Settings, Save } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';

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
    ballMass: 1,
};

type PhysicsConfig = typeof initialPhysicsConfig;

const CONFIG_STORAGE_KEY = 'tipsyTumbleConfig';

const TipsyTumbleGame: React.FC = () => {
    const sceneRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef(Matter.Engine.create());
    const runnerRef = useRef(Matter.Runner.create());
    const renderRef = useRef<Matter.Render | null>(null);
    
    const [config, setConfig] = useState<PhysicsConfig>(() => {
        if (typeof window === 'undefined') {
            return initialPhysicsConfig;
        }
        const savedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
        try {
            return savedConfig ? { ...initialPhysicsConfig, ...JSON.parse(savedConfig) } : initialPhysicsConfig;
        } catch (e) {
            return initialPhysicsConfig;
        }
    });
    
    const playerRef = useRef<Matter.Body | null>(null);
    const ballRef = useRef<Matter.Body | null>(null);
    const keysDown = useRef<{ [key: string]: boolean }>({});
    const canJump = useRef(true);
    const groundRef = useRef<Matter.Body | null>(null);
    const { toast } = useToast();

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
                width: 1200,
                height: 700,
                wireframes: false,
                background: '#D1E9F2'
            }
        });
        renderRef.current = render;

        const ground = Matter.Bodies.rectangle(600, 710, 1220, 60, { isStatic: true, render: { fillStyle: '#90EE90' } });
        groundRef.current = ground;
        const leftWall = Matter.Bodies.rectangle(-10, 350, 20, 720, { isStatic: true, render: { fillStyle: '#ADCDE0' } });
        const rightWall = Matter.Bodies.rectangle(1210, 350, 20, 720, { isStatic: true, render: { fillStyle: '#ADCDE0' } });
        const ceiling = Matter.Bodies.rectangle(600, -10, 1220, 20, { isStatic: true, render: { fillStyle: 'transparent', strokeStyle: 'transparent' } });

        const scale = 0.8;
        const playerX = 200;
        const playerY = 600;
        
        const bottom = Matter.Bodies.circle(playerX, playerY + (20 * scale), 25 * scale, { 
            density: 0.1, 
            friction: 0.5,
            restitution: config.bodyRestitution,
            render: { fillStyle: '#1a1a1a' } 
        });

        const topVertices = Matter.Vertices.fromPath(`0 ${20*scale} -${40*scale} ${20*scale} -${40*scale} -${10*scale} -${25*scale} -${60*scale} -${15*scale} -${100*scale} ${15*scale} -${100*scale} ${25*scale} -${60*scale} ${40*scale} -${10*scale} ${40*scale} ${20*scale}`);
        const top = Matter.Bodies.fromVertices(playerX, playerY - (45 * scale), [topVertices], {
            density: 0.001,
            friction: 0.2,
            restitution: 0.1,
            render: { fillStyle: '#e54530' }
        });
        
        const playerBody = Matter.Body.create({
            parts: [bottom, top],
            frictionAir: config.bodyFrictionAir,
            friction: config.bodyFriction,
        });

        Matter.Body.setMass(playerBody, config.bodyMass * scale);

        const ball = Matter.Bodies.circle(800, 100, 15, {
            restitution: 0.8,
            friction: 0.01,
            render: {
                fillStyle: '#FFFFFF',
                strokeStyle: '#000000',
                lineWidth: 2,
            }
        });
        Matter.Body.setMass(ball, config.ballMass);
        ballRef.current = ball;


        Matter.Composite.add(world, [ground, leftWall, rightWall, ceiling, playerBody, ball]);
        
        playerRef.current = playerBody;
        
        const handleKeyDown = (event: KeyboardEvent) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyX'].includes(event.code)) {
                event.preventDefault();
            }

            const player = playerRef.current;
            const groundBody = groundRef.current;
            if (keysDown.current[event.code]) return; 

            if (event.code === 'KeyX' && ballRef.current) {
                Matter.Body.setPosition(ballRef.current, { x: 800, y: 100 });
                Matter.Body.setVelocity(ballRef.current, { x: 0, y: 0 });
                Matter.Body.setAngularVelocity(ballRef.current, 0);
            }

            if (!player || !groundBody) return;

            const currentConfig = (window as any).__tipsyTumbleConfig || config;
            const { bodyMass } = currentConfig;
            
            const hopForce = 0.01 * bodyMass * scale; 
            const verticalHopForce = 0.005 * bodyMass * scale;

            if (Matter.Query.collides(player, [groundBody]).length > 0) {
                if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
                    Matter.Body.applyForce(player, player.position, { x: -hopForce, y: -verticalHopForce });
                }
                if (event.code === 'ArrowRight' || event.code === 'KeyD') {
                    Matter.Body.applyForce(player, player.position, { x: hopForce, y: -verticalHopForce });
                }
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

            // Vertical Jump Logic
             if ((keysDown.current['ArrowUp'] || keysDown.current['KeyW'] || keysDown.current['Space'])) {
                if (canJump.current) {
                    const groundBody = groundRef.current;
                    if (!groundBody) return;
                    // Check if player is on the ground
                    const collisions = Matter.Query.collides(playerBody, [groundBody]);
                    if (collisions.length > 0) {
                        Matter.Body.applyForce(playerBody, playerBody.position, {x: 0, y: -0.05 * bodyMass * scale});
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
            const scale = 0.8;
            Matter.Body.setMass(playerBody, config.bodyMass * scale);
            // The first part of the body is the bottom circle
            const bottomPart = playerBody.parts[1]; 
            if (bottomPart) {
                bottomPart.restitution = config.bodyRestitution;
            }
            playerBody.friction = config.bodyFriction;
            playerBody.frictionAir = config.bodyFrictionAir;
        }

        if (ballRef.current) {
            Matter.Body.setMass(ballRef.current, config.ballMass);
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
    
    const saveConfig = () => {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
        toast({
            title: "Configuration Saved",
            description: "Your physics settings have been saved locally.",
        });
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
                        <DialogTitle>Physics Settings</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="gravity">Gravity</Label>
                            <Slider id="gravity" min={0} max={2} step={0.1} value={[config.gravity]} onValueChange={([val]) => handleSliderChange('gravity', val)} className="col-span-2" />
                        </div>
                         <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="rightingStiffness">Righting Stiffness</Label>
                             <Slider id="rightingStiffness" min={0} max={0.5} step={0.01} value={[config.rightingStiffness]} onValueChange={([val]) => handleSliderChange('rightingStiffness', val)} className="col-span-2" />
                        </div>
                         <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="rightingDamping">Righting Damping</Label>
                            <Slider id="rightingDamping" min={0} max={1} step={0.01} value={[config.rightingDamping]} onValueChange={([val]) => handleSliderChange('rightingDamping', val)} className="col-span-2" />
                        </div>
                        
                        <h4 className="font-semibold mt-4">Body</h4>
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="bodyFriction">Body Friction</Label>
                            <Slider id="bodyFriction" min={0} max={1} step={0.05} value={[config.bodyFriction]} onValueChange={([val]) => handleSliderChange('bodyFriction', val)} className="col-span-2" />
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="bodyFrictionAir">Body Air Friction</Label>
                            <Slider id="bodyFrictionAir" min={0} max={0.2} step={0.01} value={[config.bodyFrictionAir]} onValueChange={([val]) => handleSliderChange('bodyFrictionAir', val)} className="col-span-2" />
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="bodyMass">Body Mass</Label>
                            <Input id="bodyMass" type="number" value={config.bodyMass} onChange={(e) => handleInputChange('bodyMass', e.target.value)} className="col-span-2 h-8" />
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="bodyRestitution">Body Restitution</Label>
                            <Slider id="bodyRestitution" min={0} max={1} step={0.01} value={[config.bodyRestitution]} onValueChange={([val]) => handleSliderChange('bodyRestitution', val)} className="col-span-2" />
                        </div>

                        <h4 className="font-semibold mt-4">Ball</h4>
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="ballMass">Ball Mass</Label>
                            <Input id="ballMass" type="number" value={config.ballMass} onChange={(e) => handleInputChange('ballMass', e.target.value)} className="col-span-2 h-8" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={saveConfig}><Save className="mr-2 h-4 w-4" /> Save Config</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TipsyTumbleGame;
