import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Keyboard, MoveLeft, MoveRight, MoveUp } from 'lucide-react';
import { Logo } from '@/components/icons/logo';

const TipsyTumbleGame = dynamic(() => import('@/components/game/TipsyTumbleGame'), {
    ssr: false,
    loading: () => <div className="w-[800px] h-[600px] bg-muted rounded-lg flex items-center justify-center"><p>Loading Game...</p></div>
});

export default function Home() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
            <header className="mb-8 text-center">
                <div className="flex items-center justify-center gap-4">
                    <Logo className="h-16 w-16 text-primary" />
                    <h1 className="text-5xl md:text-6xl font-headline font-bold text-primary">Tipsy Tumble</h1>
                </div>
                <p className="mt-2 text-lg text-muted-foreground">A silly physics game about a wobbly character.</p>
            </header>

            <main className="flex flex-col lg:flex-row items-center justify-center gap-8 w-full max-w-6xl">
                <TipsyTumbleGame />
                <Card className="w-full max-w-sm lg:max-w-xs shrink-0">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Keyboard /> How to Play
                        </CardTitle>
                        <CardDescription>Use your keyboard to control the player.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="flex items-center gap-4">
                            <div className="flex gap-1">
                                <div className="p-2 border rounded-md bg-card shadow-sm"><MoveLeft /></div>
                                <div className="p-2 border rounded-md bg-card shadow-sm"><MoveRight /></div>
                            </div>
                            <span className="font-medium">Move Left & Right</span>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="p-2 border rounded-md bg-card shadow-sm"><MoveUp /></div>
                           <span className="font-medium">Jump & Kick</span>
                        </div>
                        <p className="text-sm text-muted-foreground pt-2">
                            Try to hit the ball and watch the chaos unfold. Don't worry about falling, you'll get back up... eventually!
                        </p>
                    </CardContent>
                </Card>
            </main>

            <footer className="mt-8 text-center text-sm text-muted-foreground">
                <p>Built with Next.js, Matter.js, and shadcn/ui.</p>
            </footer>
        </div>
    );
}
