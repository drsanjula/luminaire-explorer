import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  FolderOpen,
  Image as ImageIcon,
  Video,
  Search,
  Settings,
  Star,
  Clock,
  LayoutGrid
} from "lucide-react";
import { VirtuosoGrid } from "react-virtuoso";
import { motion, AnimatePresence } from "framer-motion";

interface MediaItem {
  id: string;
  path: string;
  filename: string;
  kind: "image" | "video";
  size: number;
  thumbnail_path: string | null;
}

export default function App() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadMedia = async () => {
    try {
      const result = await invoke<MediaItem[]>("get_media");
      setMedia(result);

      // Request thumbnails for visible/first batch if missing
      const untagged = result.filter(m => !m.thumbnail_path).slice(0, 50).map(m => m.id);
      if (untagged.length > 0) {
        await invoke("generate_thumbnails", { ids: untagged });
        const refreshed = await invoke<MediaItem[]>("get_media");
        setMedia(refreshed);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleScan = async () => {
    // In a real app, use a folder picker. For now, hardcode or ask user.
    // Let's assume the user wants to scan a specific folder.
    const path = "/Users/sanju/Pictures"; // Example path
    setIsScanning(true);
    try {
      await invoke("scan_dir", { path });
      await loadMedia();
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 sidebar-glass flex flex-col p-6 z-10">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <LayoutGrid className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Luminaire</h1>
        </div>

        <nav className="flex-1 space-y-1">
          <SidebarItem icon={<Clock size={20} />} label="Recents" active />
          <SidebarItem icon={<ImageIcon size={20} />} label="Photos" />
          <SidebarItem icon={<Video size={20} />} label="Videos" />
          <SidebarItem icon={<Star size={20} />} label="Favorites" />
          <div className="pt-6 pb-2 px-2 text-xs font-semibold text-white/30 uppercase tracking-wider">Folders</div>
          <SidebarItem icon={<FolderOpen size={20} />} label="Library" />
        </nav>

        <button
          onClick={handleScan}
          disabled={isScanning}
          className="mt-auto glass-card p-3 flex items-center justify-center gap-2 hover:bg-white/10 transition-all disabled:opacity-50"
        >
          <FolderOpen size={18} />
          <span>{isScanning ? "Scanning..." : "Import Folder"}</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-8 z-10">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
            <input
              type="text"
              placeholder="Search by tags, names, or content..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-accent/50 transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <Settings size={22} className="text-white/60" />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent to-blue-400 p-[2px]">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center text-xs font-bold">SJ</div>
            </div>
          </div>
        </header>

        {/* Media Grid */}
        <div className="flex-1 px-4 pb-4">
          {media.length === 0 && !isScanning ? (
            <div className="h-full flex flex-col items-center justify-center text-white/20">
              <ImageIcon size={64} className="mb-4 opacity-50" />
              <p className="text-lg">No media found. Import a folder to start.</p>
            </div>
          ) : (
            <VirtuosoGrid
              style={{ height: "100%" }}
              data={media}
              listClassName="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 p-4"
              itemContent={(index, item) => (
                <MediaCard key={item.id} item={item} index={index} />
              )}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <div className={`
      flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all
      ${active ? 'bg-accent/10 text-accent shadow-sm' : 'text-white/60 hover:bg-white/5 hover:text-white'}
    `}>
      {icon}
      <span className="font-medium">{label}</span>
    </div>
  );
}

function MediaCard({ item, index }: { item: MediaItem, index: number }) {
  const thumbUrl = item.thumbnail_path ? convertFileSrc(item.thumbnail_path) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.5) }}
      className="group relative aspect-square glass-card overflow-hidden cursor-pointer"
    >
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt={item.filename}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-white/5">
          {item.kind === "video" ? <Video className="text-white/20" /> : <ImageIcon className="text-white/20" />}
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
        <p className="text-[10px] font-medium truncate w-full opacity-80">{item.filename}</p>
      </div>

      {item.kind === "video" && (
        <div className="absolute top-2 right-2 p-1.5 bg-black/40 backdrop-blur-md rounded-lg">
          <Video size={12} />
        </div>
      )}
    </motion.div>
  );
}
