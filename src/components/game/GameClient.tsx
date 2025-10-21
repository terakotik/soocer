"use client";

import dynamic from 'next/dynamic';

const TipsyTumbleGame = dynamic(() => import('@/components/game/TipsyTumbleGame'), {
    ssr: false,
    loading: () => <div className="w-[1200px] h-[700px] bg-muted rounded-lg flex items-center justify-center"><p>Loading Game...</p></div>
});

export default function GameClient() {
    return <TipsyTumbleGame />;
}
