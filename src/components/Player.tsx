import { X, Maximize2, Minimize2, Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { motion } from "framer-motion";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useState, useRef } from "react";

interface PlayerProps {
    path: string;
    kind: "image" | "video";
    onClose: () => void;
}

export default function Player({ path, kind, onClose }: PlayerProps) {
    const [isPlaying, setIsPlaying] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaUrl = convertFileSrc(path);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col"
        >
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6">
                <div className="flex items-center gap-4 text-white/60">
                    <p className="text-sm font-medium truncate max-w-md">{path.split("/").pop()}</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                {kind === "image" ? (
                    <motion.img
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        src={mediaUrl}
                        className="max-w-full max-h-full object-contain"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8">
                        <video
                            ref={videoRef}
                            src={mediaUrl}
                            autoPlay
                            className="max-w-full max-h-[80%] rounded-2xl shadow-2xl border border-white/5"
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                        />

                        {/* Custom Controls */}
                        <div className="mt-8 glass-card px-8 py-4 flex items-center gap-10">
                            <button className="text-white/40 hover:text-white transition-colors"><SkipBack size={20} /></button>
                            <button
                                onClick={togglePlay}
                                className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                            >
                                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                            </button>
                            <button className="text-white/40 hover:text-white transition-colors"><SkipForward size={20} /></button>
                            <div className="w-[1px] h-6 bg-white/10" />
                            <div className="flex items-center gap-3 text-white/60">
                                <Volume2 size={20} />
                                <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="w-2/3 h-full bg-accent" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
