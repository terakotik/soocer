import { Logo } from '@/components/icons/logo';
import GameClient from "@/components/game/GameClient";

export default function Home() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 font-body">
            <header className="mb-8 text-center">
                <div className="flex items-center justify-center gap-4">
                    <Logo className="h-16 w-16 text-primary" />
                    <h1 className="text-5xl md:text-6xl font-headline font-bold text-primary">Tipsy Tumble</h1>
                </div>
                <p className="mt-2 text-lg text-muted-foreground">A silly physics game about a wobbly character.</p>
            </header>

            <main className="flex flex-col items-center justify-center gap-8 w-full">
                <GameClient />
            </main>

            <footer className="mt-8 text-center text-sm text-muted-foreground">
                <p>Built with Next.js, Matter.js, and shadcn/ui.</p>
            </footer>
        </div>
    );
}
