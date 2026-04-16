import { motion, useScroll, useTransform, AnimatePresence, useSpring, useMotionValue as motionValue } from "motion/react";
import { Camera, Video, Monitor, ArrowRight, Instagram, Mail, ChevronRight, Menu, X, Sparkles, MessageSquare, Send, Loader2, LogIn, LogOut, Plus, Trash2, Edit2, LayoutDashboard, Calendar, FileText, User as UserIcon } from "lucide-react";
import { useState, useRef, useEffect, ChangeEvent } from "react";
import { uploadToCloudinary } from "./lib/cloudinary";
import { auth, db, googleProvider, handleFirestoreError, OperationType } from "./lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { analyzeStyle } from "./lib/gemini";

// Types
interface PortfolioItem {
  id: string;
  title: string;
  category: "Fotografie" | "Video";
  subcategory?: string;
  image: string;
  videoUrl?: string; // Skutečné URL videa (YouTube/Vimeo)
  description: string;
  client?: string;
  featured?: boolean;
}

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  date: any;
  author: string;
}

interface Service {
  id: string;
  icon: string;
  title: string;
  bgImage: string;
  shortSub: string;
  description: string;
  longDescription: string;
  gallery: string[];
  video: string;
}

const getIcon = (name: string) => {
  switch (name) {
    case "Sparkles": return <Sparkles className="w-6 h-6" />;
    case "Camera": return <Camera className="w-6 h-6" />;
    case "LayoutDashboard": return <LayoutDashboard className="w-6 h-6" />;
    case "Calendar": return <Calendar className="w-6 h-6" />;
    default: return <Sparkles className="w-6 h-6" />;
  }
};

const defaultServices: Service[] = [
  {
    id: "destination",
    icon: "Sparkles",
    title: "Destinační Produkce",
    bgImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200",
    shortSub: "Světoznámé lokace, cestování",
    description: "Zachytení krásy světa v pohybu i obraze. Specializujeme se na exkluzivní lokace po celém světě.",
    longDescription: "Destinační fotografie a video produkce vyžaduje více než jen talent – vyžaduje logistiku a schopnost adaptace. Cestujeme za vaším příběhem kamkoliv na planetě.",
    gallery: ["https://picsum.photos/seed/dest1/800/600", "https://picsum.photos/seed/dest2/800/600"],
    video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  },
  {
    id: "commercial",
    icon: "Camera",
    title: "Komerční Produkce",
    bgImage: "https://picsum.photos/seed/comm_bg/1200/800",
    shortSub: "Firemní videa, reklamy, produkty",
    description: "Vytváříme vizuální identitu, která prodává. Od produktové fotografie po dynamické reklamní spoty.",
    longDescription: "V dnešním digitálním světě je komerční prezentace základem úspěchu. Nabízíme komplexní řešení od nápadu přes scénář až po finální postprodukci. Vaše značka si zaslouží špičkový vizuál.",
    gallery: ["https://picsum.photos/seed/comm1/800/600", "https://picsum.photos/seed/comm2/800/600"],
    video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  },
  {
    id: "architecture",
    icon: "LayoutDashboard",
    title: "Architektura & Reality",
    bgImage: "https://picsum.photos/seed/arch_bg/1200/800",
    shortSub: "Hotely, restaurace, rezidence",
    description: "Zachytení prostoru v jeho nejlepším světle. Precizní kompozice pro developery i majitele.",
    longDescription: "Práce s prostorem vyžaduje trpělivost a smysl pro detail. Využíváme moderní techniku pro dokonalé zachycení linií a atmosféry interiéru.",
    gallery: ["https://picsum.photos/seed/arch1/800/600", "https://picsum.photos/seed/arch2/800/600"],
    video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  },
  {
    id: "events",
    icon: "Calendar",
    title: "Eventy & Reportáž",
    bgImage: "https://picsum.photos/seed/event_bg/1200/800",
    shortSub: "Festivaly, konference, koncerty",
    description: "Emoce, momenty a energie vašeho eventu zachycená tak, aby žila navždy.",
    longDescription: "Reportážní tvorba je o rychlosti a intuici. Jsme tam, kde se děje to podstatné, a dáváme tomu filmový nádech.",
    gallery: ["https://picsum.photos/seed/event1/800/600", "https://picsum.photos/seed/event2/800/600"],
    video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  }
];

// Components
const BrandIcon = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const dimensions = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-24 h-24"
  }[size];

  const textSize = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-5xl"
  }[size];

  const borderSize = {
    sm: "w-1.5 h-1.5",
    md: "w-3 h-3",
    lg: "w-6 h-6"
  }[size];

  return (
    <div className={`${dimensions} bg-black flex items-center justify-center shrink-0 relative overflow-hidden text-white border border-white/5`}>
      {/* Structural accent lines - Viewfinder aesthetic */}
      <div className="absolute inset-0 border-[0.5px] border-white/10 m-1.5 md:m-2" />
      <span className={`font-black tracking-tighter ${textSize} translate-y-[2px]`}>M</span>
      
      {/* Corner marks */}
      <div className={`absolute top-0 right-0 ${borderSize} border-t-2 border-r-2 border-brand-accent m-1 md:m-1.5`} />
      <div className={`absolute bottom-0 left-0 ${borderSize} border-b-2 border-l-2 border-brand-accent m-1 md:m-1.5`} />
    </div>
  );
};

const getEmbedUrl = (url: string) => {
  if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/');
  if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'www.youtube.com/embed/').split('?')[0];
  if (url.includes('vimeo.com/')) return url.replace('vimeo.com/', 'player.vimeo.com/video/');
  return url;
};

const CustomCursor = () => {
  const mouseX = motionValue(0);
  const mouseY = motionValue(0);
  
  // Custom Ring spring with fast, snappy behavior
  const ringX = useSpring(mouseX, { damping: 35, stiffness: 600 });
  const ringY = useSpring(mouseY, { damping: 35, stiffness: 600 });
  
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  
  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    const handleHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      setIsHovering(!!target.closest('button, a, .cursor-pointer, input, select, textarea'));
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mouseover', handleHover);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mouseover', handleHover);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [mouseX, mouseY]);

  return (
    <>
      {/* Precision Point - Zero latency for crisp feel */}
      <motion.div 
        style={{ 
          x: mouseX, 
          y: mouseY, 
          translateX: "-50%", 
          translateY: "-50%" 
        }}
        className="fixed top-0 left-0 w-1.5 h-1.5 bg-brand-accent rounded-full pointer-events-none z-[9999] hidden md:block"
        animate={{
          scale: isClicking ? 1.5 : (isHovering ? 0.5 : 1),
        }}
      />
      {/* Dynamic Trail Ring - Snap-responsive with difference blend */}
      <motion.div 
        style={{ 
          x: ringX, 
          y: ringY, 
          translateX: "-50%", 
          translateY: "-50%",
        }}
        animate={{
          scale: isClicking ? 0.7 : (isHovering ? 1.8 : 1),
          opacity: isHovering ? 1 : 0.4,
          borderWidth: isHovering ? 1 : 1,
        }}
        className="fixed top-0 left-0 w-8 h-8 border-white rounded-full pointer-events-none z-[9998] mix-blend-difference hidden md:block"
      />
    </>
  );
};

const Logo = () => (
  <div className="logo-text group cursor-pointer">
    <span className="font-extrabold">MINKA</span>
    <span className="font-light italic ml-1">CREATIVE</span>
  </div>
);

const partners = [
  "National Geographic", "Red Bull", "Outdoor World", "Prague Tourism", "Adventure Co", "Tech Vision"
];

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"studio" | "blog" | "portfolio" | "info">("studio");
  const [activeCategory, setActiveCategory] = useState<"Vše" | "Fotografie" | "Video">("Vše");
  const [activeSubcategory, setActiveSubcategory] = useState<string>("Vše");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type: "image" | "video"; title?: string; description?: string } | null>(null);
  const [aiCritique, setAiCritique] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [firebaseInitStatus, setFirebaseInitStatus] = useState("Initializing...");
  const [geminiInitStatus, setGeminiInitStatus] = useState("Initializing...");
  
  // Auth & Admin State
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminTab, setAdminTab] = useState<"projects" | "blog" | "services">("projects");
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [services, setServices] = useState<Service[]>(defaultServices);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Form States
  const [newProject, setNewProject] = useState<Partial<PortfolioItem>>({
    category: "Fotografie",
    subcategory: "Komerční"
  });
  const [newPost, setNewPost] = useState<Partial<BlogPost>>({
    title: "",
    excerpt: "",
    content: "",
    image: ""
  });
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    projectType: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const heroRef = useRef(null);
  
  useEffect(() => {
    const unsubscribe = auth ? onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAdmin(currentUser?.email === "JakubMinka@gmail.com");
    }) : () => {}; // Return no-op if auth is undefined
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (db) { // Check if db is initialized
      // Odstraníme orderBy z query, aby projekty nemizely při uložení
      const q = query(collection(db, "projects"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PortfolioItem[];
        
        // Seřadíme projekty na straně klienta
        const sortedItems = [...items].sort((a: any, b: any) => {
          const timeA = a.createdAt?.seconds || Date.now();
          const timeB = b.createdAt?.seconds || Date.now();
          return timeB - timeA;
        });
        
        setPortfolioItems(sortedItems);
        setIsLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, "projects");
      });
      return () => unsubscribe();
    } else {
      setIsLoading(false); // No database to load from, so mark as loaded
    }
  }, []);

  useEffect(() => {
    if (db) { // Check if db is initialized
      const q = query(collection(db, "services"), orderBy("order", "asc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
          // If no services in Firestore, keep the default ones
          return;
        }
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Service[];
        setServices(items);
      }, (error) => {
        console.error("Error loading services:", error);
      });
      return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
    if (db) { // Check if db is initialized
      const qPosts = query(collection(db, "blog"), orderBy("date", "desc"));
      const unsubscribePosts = onSnapshot(qPosts, (snapshot) => {
        const posts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as BlogPost[];
        setBlogPosts(posts);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, "blog");
      });
      return () => unsubscribePosts();
    }
  }, []);

  useEffect(() => {
    // This will run once, and auth/db will be the result of the firebase.ts initialization
    if (auth && db) {
      setFirebaseInitStatus("Firebase initialized successfully.");
    } else {
      setFirebaseInitStatus("Firebase FAILED to initialize. Check .env and console for errors.");
    }

    if (import.meta.env.VITE_GEMINI_API_KEY) {
      setGeminiInitStatus("Gemini API Key loaded.");
    } else {
      setGeminiInitStatus("Gemini API Key MISSING from .env!");
    }
  }, []); // Run once on mount

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const filteredItems = portfolioItems.filter(item => {
    const catMatch = activeCategory === "Vše" || item.category === activeCategory;
    const subMatch = activeSubcategory === "Vše" || item.subcategory === activeSubcategory;
    return catMatch && subMatch;
  });

  const handleAiAnalyze = async (title: string, desc: string) => {
    setIsAnalyzing(true);
    try {
      const critique = await analyzeStyle(title, desc);
      setAiCritique(critique);
    } catch (e) {
      setAiCritique("Analýza momentálně není k dispozici.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLogin = async () => {
    if (!auth) { console.error("Firebase Auth not initialized."); return; }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) { console.error(e); }
  };

  const handleAddProject = async () => {
    if (!newProject.title || !newProject.image) {
      alert("Vyplňte prosím název a nahrajte obrázek před uložením projektu.");
      return;
    }
    if (!db) { console.error("Firestore not initialized."); return; }
    try {
      await addDoc(collection(db, "projects"), {
        ...newProject,
        createdAt: serverTimestamp()
      });
      setNewProject({ category: "Fotografie", subcategory: "Komerční" });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "projects");
    }
  };

  const handleAddPost = async () => {
    if (!newPost.title || !newPost.content) return;
    if (!db) { console.error("Firestore not initialized."); return; }
    try {
      await addDoc(collection(db, "blog"), {
        ...newPost,
        date: serverTimestamp(),
        author: user?.displayName || "Jakub Minka"
      });
      setNewPost({ title: "", excerpt: "", content: "", image: "" });
      alert("Příspěvek zveřejněn!");
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "blog");
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const downloadURL = await uploadToCloudinary(file);
      setNewProject({ ...newProject, image: downloadURL });
      alert("Obrázek byl nahrán. Nyní můžete projekt uložit.");
    } catch (error) {
      console.error("Upload error:", error);
      alert(`Chyba při nahrávání souboru: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    if (!db) { console.error("Firestore not initialized."); return; }
    try {
      await deleteDoc(doc(db, "projects", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `projects/${id}`);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      alert("Vyplňte prosím všechna povinná pole.");
      return;
    }

    if (!db) { console.error("Firestore not initialized."); return; }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "contacts"), {
        ...contactForm,
        createdAt: serverTimestamp()
      });
      setContactForm({ name: "", email: "", projectType: "", message: "" });
      alert("Vaše poptávka byla odeslána! Brzy vás budu kontaktovat.");
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "contacts");
      alert("Chyba při odesílání. Zkuste to prosím znovu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    // SEO Structured Data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.innerHTML = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Photographer",
      "name": "MINKA creative",
      "image": "https://picsum.photos/seed/minka-logo/200/200",
      "description": "Profesionální fotograf a tvůrce cinematic videí se zaměřením na moderní vizuální styl.",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Praha",
        "addressCountry": "CZ"
      },
      "url": "https://minkacreative.com"
    });
    document.head.appendChild(script);
    return () => { if (document.head.contains(script)) document.head.removeChild(script); };
  }, []);

  return (
    <div className="min-h-screen selection:bg-brand-accent selection:text-black bg-black text-white cursor-none">
      {/* Temporary Debugging Overlay - REMOVE THIS ONCE EVERYTHING IS WORKING! */}
      {(!auth && !db && !import.meta.env.VITE_FIREBASE_API_KEY) || !import.meta.env.VITE_GEMINI_API_KEY || !import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || !import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ? (
        <div className="fixed inset-0 bg-red-900/90 text-white p-8 z-[9999] flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl font-bold mb-4">Problém s konfigurací API klíčů! 🚨</h1>
          <p className="text-lg mb-2">Web nemůže běžet, protože chybí nebo jsou neplatné API klíče.</p>
          <p className="text-lg mb-2">**Zkontrolujte konzoli prohlížeče (F12) pro detailní chyby!**</p>
          <ul className="text-left mt-8 text-sm font-mono bg-red-800/50 p-6 rounded-lg border border-red-700">
            <li><strong>Firebase Init Status:</strong> {firebaseInitStatus}</li>
            <li><strong>Gemini Init Status:</strong> {geminiInitStatus}</li>
            <li className="mt-4">--- Proměnné z .env ---</li>
            <li><strong>VITE_FIREBASE_API_KEY:</strong> {import.meta.env.VITE_FIREBASE_API_KEY ? '✅ Loaded' : '❌ MISSING / Undefined'}</li>
            <li><strong>VITE_FIREBASE_AUTH_DOMAIN:</strong> {import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? '✅ Loaded' : '❌ MISSING / Undefined'}</li>
            <li><strong>VITE_FIREBASE_PROJECT_ID:</strong> {import.meta.env.VITE_FIREBASE_PROJECT_ID ? '✅ Loaded' : '❌ MISSING / Undefined'}</li>
            <li><strong>VITE_FIREBASE_STORAGE_BUCKET:</strong> {import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ? '✅ Loaded' : '❌ MISSING / Undefined'}</li>
            <li><strong>VITE_FIREBASE_MESSAGING_SENDER_ID:</strong> {import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? '✅ Loaded' : '❌ MISSING / Undefined'}</li>
            <li><strong>VITE_FIREBASE_APP_ID:</strong> {import.meta.env.VITE_FIREBASE_APP_ID ? '✅ Loaded' : '❌ MISSING / Undefined'}</li>
            <li className="mt-4">--- Cloudinary ---</li>
            <li><strong>VITE_CLOUDINARY_CLOUD_NAME:</strong> {import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ? '✅ Loaded' : '❌ MISSING / Undefined'}</li>
            <li><strong>VITE_CLOUDINARY_UPLOAD_PRESET:</strong> {import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ? '✅ Loaded' : '❌ MISSING / Undefined'}</li>
            <li className="mt-4">--- Gemini AI ---</li>
            <li><strong>VITE_GEMINI_API_KEY:</strong> {import.meta.env.VITE_GEMINI_API_KEY ? '✅ Loaded' : '❌ MISSING / Undefined'}</li>
          </ul>
          <p className="mt-8 text-yellow-300 font-bold text-lg">
            KROKY PRO OPRAVU:<br/>
            1. Otevřete soubor `.env` v kořenovém adresáři projektu.<br/>
            2. Důkladně zkontrolujte, že VŠECHNY proměnné (`VITE_FIREBASE_API_KEY`, `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`, `VITE_GEMINI_API_KEY` atd.) jsou správně vyplněné a nemají uvozovky.<br/>
            3. Pokud jste `.env` soubor upravili, **Vypněte (`Ctrl+C`) a ZNOVU SPUŤTE (`npm run dev`) vývojový server!**<br/>
            4. Znovu zkontrolujte tuto hlášku a konzoli prohlížeče.
          </p>
          <button onClick={() => window.location.reload()} className="mt-8 px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-200 font-bold uppercase tracking-wider">
            Zkusit znovu po opravě
          </button>
        </div>
      ) : (
        <>
      <CustomCursor />
      
      {/* Lightbox */}
      <AnimatePresence>
        {lightboxMedia && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setLightboxMedia(null); setAiCritique(null); }}
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button className="absolute top-10 right-10 text-white hover:text-brand-accent z-[210]">
              <X className="w-10 h-10" />
            </button>
            
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="max-w-7xl max-h-[90vh] w-full flex flex-col items-center justify-center gap-6"
              onClick={e => e.stopPropagation()}
            >
              {lightboxMedia.type === "image" ? (
                <img src={lightboxMedia.url} className="max-w-full max-h-[90vh] object-contain shadow-2xl" alt="Lightbox" />
              ) : (
                <div className="w-full aspect-video bg-black shadow-2xl">
                   <iframe 
                    src={getEmbedUrl(lightboxMedia.url)} 
                    className="w-full h-full"
                    allowFullScreen
                    allow="autoplay; encrypted-media"
                   />
                </div>
              )}

              {lightboxMedia.title && (
                <div className="max-w-2xl text-center bg-black/60 p-6 rounded-2xl backdrop-blur-md border border-white/10">
                  <h3 className="text-xl font-bold text-brand-accent uppercase tracking-widest mb-2">{lightboxMedia.title}</h3>
                  <p className="text-sm text-gray-400 mb-4">{lightboxMedia.description}</p>
                  
                  {!aiCritique ? (
                    <button 
                      onClick={() => handleAiAnalyze(lightboxMedia.title!, lightboxMedia.description || "")}
                      disabled={isAnalyzing}
                      className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 mx-auto hover:text-brand-accent transition-colors"
                    >
                      {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Generovat AI analýzu stylu
                    </button>
                  ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs italic text-brand-accent/80 border-t border-white/10 pt-4">
                      "{aiCritique}"
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <nav className="fixed top-0 w-full z-50 p-6 md:p-10 flex justify-between items-center bg-gradient-to-b from-black/90 to-transparent">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => setActiveTab("studio")}
          className="cursor-pointer"
        >
          <Logo />
        </motion.div>
        
        <div className="hidden md:flex gap-10 text-[10px] items-center font-bold tracking-[0.3em] uppercase">
          <button 
            onClick={() => setActiveTab("studio")}
            className={`transition-colors ${activeTab === "studio" ? "text-brand-accent" : "text-gray-400 hover:text-white"}`}
          >
            Studio
          </button>
          <button 
            onClick={() => setActiveTab("portfolio")}
            className={`transition-colors ${activeTab === "portfolio" ? "text-brand-accent" : "text-gray-400 hover:text-white"}`}
          >
            Portfolio
          </button>
          <button 
            onClick={() => setActiveTab("blog")}
            className={`transition-colors ${activeTab === "blog" ? "text-brand-accent" : "text-gray-400 hover:text-white"}`}
          >
            Blog
          </button>
          <div className="w-px h-4 bg-white/10 mx-2" />
          <a href="#services" onClick={() => setActiveTab("studio")} className="text-gray-400 hover:text-white transition-colors">Služby</a>
          <button 
            onClick={() => setActiveTab("info")}
            className={`transition-colors ${activeTab === "info" ? "text-brand-accent" : "text-gray-400 hover:text-white"}`}
          >
            Kontakt & Info
          </button>
          {isAdmin && (
             <button 
               onClick={() => setShowAdminPanel(!showAdminPanel)}
               className="text-brand-accent flex items-center gap-2 hover:scale-105 transition-transform"
             >
               <LayoutDashboard className="w-4 h-4" /> Admin
             </button>
          )}
        </div>

        <button 
          className="md:hidden text-white"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            className="fixed inset-0 bg-black z-40 flex flex-col items-center justify-center gap-10 text-xl font-bold uppercase tracking-[0.4em]"
          >
            <button onClick={() => { setActiveTab("studio"); setIsMenuOpen(false); }}>Studio</button>
            <button onClick={() => { setActiveTab("portfolio"); setIsMenuOpen(false); }}>Portfolio</button>
            <button onClick={() => { setActiveTab("blog"); setIsMenuOpen(false); }}>Blog</button>
            <button onClick={() => { setActiveTab("info"); setIsMenuOpen(false); }}>Kontakt & Info</button>
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === "studio" ? (
        <>
          {/* Hero Section */}
          <header ref={heroRef} className="relative h-[90vh] flex flex-col justify-center items-center p-6 text-center overflow-hidden">
            <motion.div 
              style={{ 
                y: heroY, 
                opacity: heroOpacity,
                backgroundImage: "url('https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=2000')" 
              }}
              className="absolute inset-0 z-0 bg-cover bg-center grayscale opacity-40 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black z-1" />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              className="relative z-10"
            >
              <h1 className="text-[14vw] md:text-[10vw] leading-[0.8] font-black tracking-tighter uppercase mb-6 drop-shadow-2xl">
                Authentic<br />
                <span className="text-brand-accent">Stories.</span>
              </h1>
              <p className="max-w-2xl mx-auto text-gray-300 font-light text-lg md:text-xl leading-relaxed mb-10 text-balance px-4">
                Profesionální vizuální tvorba, která zachycuje pravdu. <br className="hidden md:block"/>
                Žádná AI – jen skutečné emoce a precizní řemeslo.
              </p>
              <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                <button 
                  onClick={() => setActiveTab("portfolio")}
                  className="px-10 py-5 bg-brand-accent text-white font-bold uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl shadow-brand-accent/20"
                >
                  Prohlédnout portfolio
                </button>
                <button 
                  onClick={() => setActiveTab("info")}
                  className="px-10 py-5 border border-white/20 text-white font-bold uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all"
                >
                  Nezávazná poptávka
                </button>
              </div>
            </motion.div>
          </header>

          {/* Partners / Brands Marquee - Immediate Trust */}
          <section className="py-16 overflow-hidden bg-black border-y border-white/5">
            <div className="max-w-7xl mx-auto mb-10 px-6">
              <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-gray-500">Spolupracovali jsme na projektech těchto značek</span>
            </div>
            <div className="relative flex overflow-x-hidden">
              <div className="animate-marquee whitespace-nowrap flex items-center gap-20 px-10">
                {[...partners, ...partners].map((partner, i) => (
                  <span key={i} className="text-4xl md:text-6xl font-black uppercase text-white/10 hover:text-brand-accent transition-colors cursor-default whitespace-nowrap">
                    {partner}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Top Selection - Masonry Gallery directly hook visitor */}
          <section className="py-20 px-6 md:px-20 bg-black">
             <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-16">
                   <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-accent whitespace-nowrap">Top 10 Momentů</span>
                   <div className="h-px flex-1 bg-white/10" />
                </div>
                <div className="masonry-grid">
                  {(portfolioItems.length > 0 ? portfolioItems.slice(0, 6) : defaultServices.map(s => ({ image: s.bgImage, title: s.title }))).map((item: any, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      viewport={{ once: true }}
                      onClick={() => setLightboxMedia({ url: item.image, type: "image", title: item.title })}
                      className="masonry-item group cursor-none"
                    >
                      <img src={item.image} className="w-full grayscale group-hover:grayscale-0 transition-all duration-1000" alt={item.title || "Top Selection"} />
                    </motion.div>
                  ))}
                </div>
             </div>
          </section>

          {/* Services Grid (Tile Style) - Clear value proposition */}
          <section id="services" className="py-32 px-6 md:px-20 bg-black border-y border-white/10">
            <div className="max-w-7xl mx-auto mb-20 text-center">
              <span className="text-brand-accent text-[10px] font-bold uppercase tracking-[0.4em] mb-4 block">Specializace</span>
              <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">Co pro vás vytvoříme.</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {services.map((service, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  onClick={() => setSelectedService(service)}
                  className="service-tile group"
                >
                  <div 
                    className="absolute inset-0 bg-cover bg-center grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000"
                    style={{ backgroundImage: `url(${service.bgImage})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80" />
                  <div className="relative h-full flex flex-col justify-end p-10 z-10">
                    <div className="text-brand-accent mb-6 group-hover:scale-110 transition-transform origin-left">
                      {getIcon(service.icon)}
                    </div>
                    <div className="text-[10px] text-brand-accent uppercase font-bold tracking-[0.2em] mb-4 opacity-70">
                      {service.shortSub}
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">{service.title}</h3>
                    <div className="h-0 group-hover:h-auto overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-500">
                      <p className="text-xs text-gray-400 font-light mb-6">{service.description}</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50 group-hover:text-brand-accent transition-colors">
                      Zjistit více <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Featured Highlights (Gallery & Video) */}
          <section className="py-24 px-6 md:px-20 bg-black">
             <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-20">
                   <div className="h-px flex-1 bg-white/10" />
                   <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-accent">Visual Highlights</span>
                   <div className="h-px flex-1 bg-white/10" />
                </div>
                
                  {/* Videos Showcase */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
                     {[
                       { title: "Komerční Showreel", url: "https://picsum.photos/seed/vid1/800/600", video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", desc: "Průřez naší komerční tvorbou" },
                       { title: "Sport Essence", url: "https://picsum.photos/seed/vid2/800/600", video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", desc: "Dynamika a adrenalin v pohybu" },
                       { title: "Architektonický Flow", url: "https://picsum.photos/seed/vid3/800/600", video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", desc: "Krása prostoru a detailu" }
                     ].map((vid, i) => (
                       <motion.div 
                         key={i}
                         initial={{ opacity: 0, y: 20 }}
                         whileInView={{ opacity: 1, y: 0 }}
                         transition={{ delay: i * 0.2 }}
                         viewport={{ once: true }}
                         onClick={() => setLightboxMedia({ url: vid.video, type: "video" })}
                         className="aspect-video relative group overflow-hidden rounded-2xl border border-white/5 cursor-pointer"
                       >
                          <img src={vid.url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-110 group-hover:scale-100" alt={vid.title} />
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-8 text-center">
                             <div className="w-16 h-16 rounded-full bg-brand-accent flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                <Video className="w-8 h-8 text-white" />
                             </div>
                             <h4 className="text-xl font-black uppercase mb-2">{vid.title}</h4>
                             <p className="text-[10px] text-gray-400 uppercase tracking-widest leading-relaxed">{vid.desc}</p>
                          </div>
                       </motion.div>
                     ))}
                  </div>

                {/* Quick Portfolio Preview Link */}
                <div className="text-center">
                   <button 
                     onClick={() => setActiveTab("portfolio")}
                     className="px-12 py-6 border border-white/10 hover:border-brand-accent hover:text-brand-accent transition-all text-[10px] font-black uppercase tracking-[0.4em] rounded-full"
                   >
                     Vstoupit do kompletního portfolia
                   </button>
                </div>
             </div>
          </section>

          {/* External Projects / Family Brands */}
          <section className="py-24 px-6 md:px-20 bg-[#050505] border-t border-white/5">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <motion.a 
                  href="https://www.minka-weddings.cz" 
                  target="_blank"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  className="group relative p-12 bg-white/5 rounded-[40px] overflow-hidden border border-white/10 flex flex-col justify-end min-h-[400px]"
                >
                  <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/wed1/1200/800')] bg-cover bg-center grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000 opacity-30" />
                  <div className="relative z-10">
                    <span className="text-brand-accent text-[10px] font-bold uppercase tracking-[0.4em] mb-4 block">Svatební Brand</span>
                    <h3 className="text-4xl font-black uppercase tracking-tighter mb-4">Minka Weddings</h3>
                    <p className="text-gray-400 text-sm mb-8 max-w-sm">Emoce, slzy a smích. Zachycujeme váš velký den s největší péčí a elegancí.</p>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white underline underline-offset-8">Navštívit web</div>
                  </div>
                </motion.a>

                <motion.a 
                  href="https://www.fotovideodronem.cz" 
                  target="_blank"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  className="group relative p-12 bg-white/5 rounded-[40px] overflow-hidden border border-white/10 flex flex-col justify-end min-h-[400px]"
                >
                  <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/drone1/1200/800')] bg-cover bg-center grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000 opacity-30" />
                  <div className="relative z-10">
                    <span className="text-brand-accent text-[10px] font-bold uppercase tracking-[0.4em] mb-4 block">Letecké záběry</span>
                    <h3 className="text-4xl font-black uppercase tracking-tighter mb-4">Foto Video Dronem</h3>
                    <p className="text-gray-400 text-sm mb-8 max-w-sm">Pohled z ptačí perspektivy. Certifikovaná letecká produkce po celé ČR.</p>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white underline underline-offset-8">Navštívit web</div>
                  </div>
                </motion.a>
              </div>
            </div>
          </section>
        </>
      ) : activeTab === "portfolio" ? (
        /* Full Portfolio View */
        <section className="py-40 px-6 md:px-20 bg-black min-h-screen">
          <div className="max-w-7xl mx-auto">
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-32 border-b border-white/10 pb-20">
                <div>
                   <span className="text-brand-accent text-[10px] font-bold uppercase tracking-[0.4em] mb-4 block">Crafting Visuals</span>
                   <h2 className="text-6xl md:text-9xl font-black uppercase tracking-tighter leading-[0.8]">Všechny<br/><span className="text-brand-accent italic">Projekty.</span></h2>
                </div>
                <div className="flex flex-wrap gap-4">
                  {["Vše", "Fotografie", "Video"].map((cat) => (
                     <button 
                       key={cat}
                       onClick={() => setActiveCategory(cat as any)}
                       className={`text-[10px] font-bold uppercase tracking-widest px-8 py-4 rounded-full border ${activeCategory === cat ? "bg-white text-black border-white" : "bg-transparent text-gray-400 border-white/10 hover:border-white/40"} transition-all`}
                     >
                       {cat}
                     </button>
                  ))}
                </div>
             </div>

             <div className="masonry-grid pb-40">
                <AnimatePresence mode="popLayout">
                  {isLoading ? (
                    <div className="col-span-full py-40 flex justify-center items-center gap-4 text-xs uppercase tracking-[0.5em] font-bold">
                       <Loader2 className="w-6 h-6 animate-spin text-brand-accent" /> Načítám umění...
                    </div>
                  ) : filteredItems.length > 0 ? filteredItems.map((item, idx) => (
                    <motion.div 
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => setLightboxMedia({ 
                        url: item.videoUrl && item.category === "Video" ? item.videoUrl : item.image, 
                        type: item.videoUrl && item.category === "Video" ? "video" : "image",
                        title: item.title,
                        description: item.description
                      })}
                      className="masonry-item group cursor-zoom-in relative"
                    >
                       <img src={item.image} alt={item.title} className="w-full grayscale group-hover:grayscale-0 transition-all duration-1000" />
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity p-8 flex flex-col justify-end">
                          <span className="text-brand-accent text-[9px] font-bold uppercase tracking-widest">{item.subcategory}</span>
                          <h4 className="text-2xl font-black uppercase tracking-tight">{item.title}</h4>
                          <p className="text-[10px] text-gray-400 mt-2 line-clamp-2">{item.description}</p>
                       </div>
                    </motion.div>
                  )) : ( // If filteredItems.length is 0
                    <div className="col-span-full py-40 text-center opacity-30 uppercase tracking-[1em] text-sm">Prázdná plátna.</div>
                  )}
                </AnimatePresence>
             </div>
          </div>
        </section>
      ) : activeTab === "info" ? (
        /* Info / Contact View */
        <section className="py-40 px-6 md:px-20 bg-black min-h-screen">
          <div className="max-w-7xl mx-auto">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-32">
                <div>
                   <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-20 leading-none">O mně &<br/><span className="text-brand-accent italic">Kontakt.</span></h2>
                   
                   <div className="space-y-16">
                      <div id="contact">
                         <h4 className="text-brand-accent text-[10px] font-bold uppercase tracking-[0.4em] mb-6">Spojte se se mnou</h4>
                         
                         {/* Contact Form */}
                         <form onSubmit={handleContactSubmit} className="space-y-6">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <input 
                               type="text" 
                               placeholder="Vaše jméno *"
                               value={contactForm.name}
                               onChange={e => setContactForm({...contactForm, name: e.target.value})}
                               className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:border-brand-accent transition-colors"
                               required
                             />
                             <input 
                               type="email" 
                               placeholder="Váš e-mail *"
                               value={contactForm.email}
                               onChange={e => setContactForm({...contactForm, email: e.target.value})}
                               className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:border-brand-accent transition-colors"
                               required
                             />
                           </div>
                           
                           <select 
                             value={contactForm.projectType}
                             onChange={e => setContactForm({...contactForm, projectType: e.target.value})}
                             className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:border-brand-accent transition-colors"
                           >
                             <option value="">Vyberte typ projektu</option>
                             <option value="photography">Fotografie</option>
                             <option value="video">Video produkce</option>
                             <option value="commercial">Komerční projekt</option>
                             <option value="wedding">Svatební fotografie</option>
                             <option value="other">Jiné</option>
                           </select>
                           
                           <textarea 
                             placeholder="Popište váš projekt nebo nápad... *"
                             rows={4}
                             value={contactForm.message}
                             onChange={e => setContactForm({...contactForm, message: e.target.value})}
                             className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:border-brand-accent transition-colors resize-none"
                             required
                           />
                           
                           <button 
                             type="submit"
                             disabled={isSubmitting}
                             className="w-full py-5 bg-brand-accent text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-xl hover:scale-[1.02] transition-all shadow-xl shadow-brand-accent/30 flex items-center justify-center gap-3 disabled:opacity-50"
                           >
                             {isSubmitting ? (
                               <Loader2 className="w-4 h-4 animate-spin" />
                             ) : (
                               <Send className="w-4 h-4" />
                             )}
                             {isSubmitting ? "Odesílám..." : "Odeslat poptávku"}
                           </button>
                         </form>
                      </div>

                      <div>
                         <h4 className="text-brand-accent text-[10px] font-bold uppercase tracking-[0.4em] mb-6">Přímý kontakt</h4>
                         <div className="space-y-4">
                            <a href="mailto:JakubMinka@gmail.com" className="text-2xl md:text-3xl font-light hover:text-brand-accent transition-colors block">JakubMinka@gmail.com</a>
                            <div className="flex gap-6 mt-8">
                               <a href="#" className="p-4 bg-white/5 rounded-full hover:bg-brand-accent hover:text-black transition-all"><Instagram className="w-6 h-6" /></a>
                               <a href="#" className="p-4 bg-white/5 rounded-full hover:bg-brand-accent hover:text-black transition-all"><Video className="w-6 h-6" /></a>
                            </div>
                         </div>
                      </div>

                      <div>
                         <h4 className="text-brand-accent text-[10px] font-bold uppercase tracking-[0.4em] mb-6">Fakturační údaje</h4>
                         <div className="font-mono text-sm leading-relaxed text-gray-400">
                            <strong>Jakub Minka</strong><br/>
                            Podnikatel zapsán v živnostenském rejstříku.<br/>
                            IČO: [DOPLNIT IČO]<br/>
                            DIČ: [DOPLNIT DIČ - neplátce DPH]<br/>
                            Sídlo: Praha, Česká republika
                         </div>
                      </div>
                   </div>
                </div>

                <div className="space-y-12">
                   <div className="p-10 bg-white/5 rounded-[40px] border border-white/10">
                      <h4 className="text-lg font-bold uppercase tracking-widest mb-6">AI Prohlášení</h4>
                      <p className="text-sm text-gray-400 font-light leading-relaxed">
                         Veškerý vizuální obsah (fotografie, videa) prezentovaný na tomto webu byl vytvořen tradičními metodami produkce. Nepoužíváme generativní AI pro tvorbu finálních děl. Věříme v autenticitu lidského pohledu a neopakovatelnost skutečného okamžiku.
                      </p>
                   </div>
                   
                   <div className="p-10 bg-white/5 rounded-[40px] border border-white/10">
                      <h4 className="text-lg font-bold uppercase tracking-widest mb-6">GDPR & Zásady</h4>
                      <p className="text-sm text-gray-400 font-light leading-relaxed">
                         Vaše osobní údaje (jméno, e-mail) zpracováváme výhradně za účelem vyřízení vaší poptávky. Údaje jsou uloženy v zabezpečeném systému Firebase a nejsou předávány třetím stranám bez vašeho výslovného souhlasu.
                      </p>
                   </div>

                   <div className="p-10 bg-white/5 rounded-[40px] border border-white/10">
                      <h4 className="text-lg font-bold uppercase tracking-widest mb-6">Obchodní podmínky</h4>
                      <p className="text-[10px] text-gray-500 font-mono leading-relaxed">
                         Standardní licenční podmínky: Klient získává licenci k užití díla pro vlastní prezentaci. Autorské právo zůstává zhotoviteli. Platební podmínky: 50% záloha před zahájením produkce, doplatek po schválení náhledů.
                      </p>
                   </div>
                </div>
             </div>
          </div>
        </section>
      ) : activeTab === "blog" ? (
        <section className="py-40 px-6 md:px-20 bg-black min-h-screen">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-32">
               <span className="text-brand-accent text-[10px] font-bold uppercase tracking-[0.4em] mb-4 block underline underline-offset-12">Stories & Insights</span>
               <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter">Minka Blog.</h2>
            </div>
            
            <div className="space-y-40">
              {blogPosts.length > 0 ? blogPosts.map((post) => (
                <motion.article 
                  key={post.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center group cursor-pointer"
                >
                  <div className="aspect-[16/10] overflow-hidden rounded-3xl border border-white/5 bg-gray-900 shadow-2xl">
                    <img src={post.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-100" alt={post.title} />
                  </div>
                  <div>
                    <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-accent mb-6">
                       <Calendar className="w-4 h-4" /> {post.date ? new Date(post.date.seconds * 1000).toLocaleDateString('cs-CZ') : "Dnes"}
                    </div>
                    <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-6 group-hover:text-brand-accent transition-colors leading-[0.9]">
                      {post.title}
                    </h3>
                    <p className="text-gray-400 font-light text-lg leading-relaxed mb-8">
                      {post.excerpt}
                    </p>
                    <button className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-white group-hover:translate-x-4 transition-all duration-500">
                       Číst celý článek <ArrowRight className="w-5 h-5 text-brand-accent" />
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={() => deleteDoc(doc(db, "blog", post.id))}
                        className="mt-4 text-red-500 text-[9px] uppercase font-bold tracking-widest flex items-center gap-2"
                      >
                         <Trash2 className="w-3 h-3" /> Smazat článek
                      </button>
                    )}
                  </div>
                </motion.article>
              )) : (
                <div className="text-center py-20 text-gray-700 font-bold uppercase tracking-[0.5em] text-xs">Příspěvky brzy přibudou.</div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* Service Detail Modal/Overlay */}
      <AnimatePresence>
        {selectedService && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-12 overflow-y-auto backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#050505] w-full max-w-6xl rounded-[40px] overflow-hidden shadow-2xl border border-white/10 relative"
            >
              <button 
                onClick={() => setSelectedService(null)}
                className="absolute top-8 right-8 p-4 bg-white/5 hover:bg-white/10 rounded-full transition-all z-10"
              >
                <X className="w-6 h-6 text-white" />
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="p-12 md:p-20 flex flex-col justify-center">
                  <div className="text-brand-accent mb-8 w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-brand-accent/20">
                    {getIcon(selectedService.icon)}
                  </div>
                  <h2 className="text-5xl md:text-7xl font-black mb-8 uppercase tracking-tighter leading-none">{selectedService.title}</h2>
                  <p className="text-xl text-gray-400 font-light leading-relaxed mb-12">
                    {selectedService.longDescription}
                  </p>
                  
                  <div className="space-y-8">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-accent">Klíčové Výhody</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                        <Monitor className="w-6 h-6 mb-4 text-brand-accent" />
                        <div className="text-[10px] font-black uppercase tracking-widest text-white">4K / 8K Master</div>
                        <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-wide">Nejvyšší kvalita obrazu</p>
                      </div>
                      <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                        <Sparkles className="w-6 h-6 mb-4 text-brand-accent" />
                        <div className="text-[10px] font-black uppercase tracking-widest text-white">Vlastní Grading</div>
                        <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-wide">Unikátní barevný styl</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 p-8 md:p-16 space-y-10 max-h-[90vh] lg:max-h-[85vh] overflow-y-auto scrollbar-hide">
                  <div 
                    onClick={() => setLightboxMedia({ url: selectedService.video || "", type: "video" })}
                    className="rounded-[32px] overflow-hidden aspect-video relative group border border-white/10 shadow-2xl cursor-pointer"
                  >
                    <img src={selectedService.gallery[0] || ""} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000" alt="Detail služby" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-brand-accent flex items-center justify-center shadow-2xl shadow-brand-accent/50 cursor-pointer hover:scale-110 transition-transform">
                        <Video className="w-10 h-10 text-white" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    {selectedService.gallery.slice(1).map((img, i) => (
                      <div 
                        key={i} 
                        onClick={() => setLightboxMedia({ url: img, type: "image" })}
                        className="rounded-[24px] overflow-hidden aspect-square border border-white/10 cursor-pointer"
                      >
                        <img src={img} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000 hover:scale-110" alt="Ukázka práce" />
                      </div>
                    ))}
                  </div>
                  <div className="p-12 text-center border-2 border-dashed border-white/10 rounded-[40px] bg-black/40">
                    <p className="text-gray-400 mb-8 font-light italic text-lg leading-relaxed">Pojďme společně vytvořit něco, co bude mít skutečný dopad.</p>
                    <a 
                      href="#contact"
                      onClick={() => setSelectedService(null)}
                      className="w-full py-5 bg-white text-black font-black rounded-2xl hover:bg-brand-accent hover:text-white transition-all shadow-2xl shadow-white/5 uppercase tracking-[0.4em] text-[10px] flex items-center justify-center"
                    >
                      Poptat spolupráci
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quote / Vision Section - Facts & Human Approach */}
      <section className="py-40 px-6 bg-brand-bg relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.05 }}
          className="absolute inset-0 z-0 pointer-events-none select-none flex items-center justify-center"
        >
          <span className="text-[30vw] font-black italic">DATA</span>
        </motion.div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
            <motion.div
               initial={{ opacity: 0, x: -40 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
            >
              <span className="text-brand-accent text-xs font-mono uppercase tracking-[0.4em] mb-12 block">Manifest Autenticity</span>
              <h3 className="text-4xl md:text-7xl font-black leading-[0.9] uppercase tracking-tighter mb-12">
                Pravda je tvárnější<br />
                <span className="text-brand-accent italic">než algoritmus.</span>
              </h3>
              <p className="text-gray-400 font-light leading-relaxed text-lg max-w-xl mb-12">
                AI umí vytvořit pixelově dokonalý svět, ale neumí zachytit duši vaší značky, upřímnou emoci vašeho týmu nebo autentickou atmosféru vašeho interiéru. Moje práce je o pravdě – o tom, co je skutečné.
              </p>
              
              <div className="flex flex-wrap gap-8">
                {[
                  { label: "Spokojených klientů", value: "98%" },
                  { label: "Dokončených projektů", value: "150+" },
                  { label: "Let zkušeností", value: "10" }
                ].map((stat, i) => (
                  <div key={i}>
                    <div className="text-4xl font-black text-white">{stat.value}</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div 
               initial={{ opacity: 0, x: 40 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               className="bg-white/5 p-12 rounded-[60px] border border-white/10 flex flex-col justify-between"
            >
              <div>
                <MessageSquare className="w-12 h-12 text-brand-accent mb-8" />
                <p className="text-2xl font-light italic leading-relaxed text-white mb-10">
                  "Hledali jsme někoho, kdo by zachytil podstatu naší práce bez zbytečných příkras. Výsledek předčil očekávání nejen technickou kvalitou, ale především lidským přístupem."
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-brand-accent/20 flex items-center justify-center font-bold text-brand-accent">JM</div>
                  <div>
                    <div className="text-sm font-bold uppercase tracking-widest">Tomáš Novák</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest">Brand Manager, TechVision</div>
                  </div>
                </div>
              </div>

              <div className="mt-16 pt-12 border-t border-white/10">
                <a href="#contact" className="group flex items-center justify-between text-2xl font-black uppercase tracking-tighter hover:text-brand-accent transition-colors">
                  Pojďme tvořit společně <ArrowRight className="w-8 h-8 group-hover:translate-x-4 transition-transform" />
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 md:px-20 bg-black border-t border-white/10 text-center relative">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-12">
          <Logo />
          <div className="flex gap-12 text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">
            <button onClick={() => setActiveTab("portfolio")} className="hover:text-white transition-colors">Portfólio</button>
            <a href="#services" onClick={() => setActiveTab("studio")} className="hover:text-white transition-colors">Služby</a>
            <button onClick={() => setActiveTab("info")} className="hover:text-white transition-colors">Kontakt</button>
            <button onClick={() => setActiveTab("blog")} className="hover:text-white transition-colors">Blog</button>
          </div>
          <div className="text-[9px] text-gray-700 font-mono tracking-widest uppercase mt-4">
            © 2026 MINKA creative • Všechna práva vyhrazena
          </div>
          
          <div className="mt-8 flex items-center gap-4 text-[9px] text-gray-800 uppercase tracking-widest">
             <span>Digital by Minka</span>
             <span className="w-1 h-1 rounded-full bg-gray-800" />
             {!user ? (
               <button onClick={handleLogin} className="hover:text-brand-accent transition-colors">Admin Login</button>
             ) : (
               <button onClick={() => setShowAdminPanel(true)} className="text-brand-accent hover:underline">Admin Panel</button>
             )}
          </div>
        </div>
      </footer>

      {/* Admin Panel Drawer */}
      {showAdminPanel && (
        <div className="fixed inset-y-0 right-0 w-[600px] bg-[#0c0c0c] z-[100] border-l border-white/10 p-10 overflow-y-auto text-white">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-black uppercase tracking-tighter">Admin <span className="text-brand-accent">Panel</span></h2>
            <button onClick={() => setShowAdminPanel(false)} className="p-2 hover:bg-white/5 rounded-full"><X className="w-6 h-6" /></button>
          </div>

            <div className="flex gap-4 mb-10 p-1 bg-white/5 rounded-xl border border-white/5">
               <button 
                 onClick={() => setAdminTab("projects")}
                 className={`flex-1 py-3 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${adminTab === "projects" ? "bg-brand-accent text-white shadow-lg shadow-brand-accent/20" : "text-gray-500 hover:text-white"}`}
               >
                  Projekty
               </button>
               <button 
                 onClick={() => setAdminTab("blog")}
                 className={`flex-1 py-3 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${adminTab === "blog" ? "bg-brand-accent text-white shadow-lg shadow-brand-accent/20" : "text-gray-500 hover:text-white"}`}
               >
                  Blog
               </button>
               <button 
                 onClick={() => setAdminTab("services")}
                 className={`flex-1 py-3 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${adminTab === "services" ? "bg-brand-accent text-white shadow-lg shadow-brand-accent/20" : "text-gray-500 hover:text-white"}`}
               >
                  Služby
               </button>
            </div>

            <div className="space-y-12 pb-20">
              {adminTab === "projects" ? (
                <div className="p-8 bg-white/5 border border-white/5 rounded-2xl space-y-8">
                  <h3 className="text-xs uppercase tracking-[0.4em] font-bold text-brand-accent flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Nový Projekt Portfolio
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <input 
                         type="text" 
                         placeholder="Název projektu"
                         value={newProject.title || ""}
                         onChange={e => setNewProject({...newProject, title: e.target.value})}
                         className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:border-brand-accent transition-colors"
                       />
                       <select 
                         value={newProject.category}
                         onChange={e => setNewProject({...newProject, category: e.target.value as any})}
                         className="bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-bold uppercase tracking-widest text-gray-400"
                       >
                         <option value="Fotografie">Fotografie</option>
                         <option value="Video">Video</option>
                       </select>
                    </div>

                    <input 
                      type="text" 
                      placeholder="URL přehrávače (YouTube/Vimeo) - volitelné u Videí"
                      value={newProject.videoUrl || ""}
                      onChange={e => setNewProject({...newProject, videoUrl: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:border-brand-accent transition-colors"
                    />

                    <select 
                      value={newProject.subcategory}
                      onChange={e => setNewProject({...newProject, subcategory: e.target.value as any})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-bold uppercase tracking-widest text-gray-400"
                    >
                      <option value="Komerční">Komerční / Brand</option>
                      <option value="Destinační">Destinační / Cestování</option>
                      <option value="Architektura">Architektura / Interiéry</option>
                      <option value="Eventy">Kulturní akce / Eventy</option>
                    </select>

                    <div className="space-y-4">
                      <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-2">Hlavní média (Obrázek / Poster)</label>
                      <div className="flex flex-col gap-4">
                        {newProject.image && (
                          <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 group">
                            <img src={newProject.image} className="w-full h-full object-cover" alt="Preview" />
                            <button 
                              onClick={() => setNewProject({...newProject, image: ""})}
                              className="absolute top-4 right-4 p-2 bg-black/80 rounded-full hover:bg-red-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        <label className={`w-full py-16 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-brand-accent transition-all bg-black/20 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                          <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                          {isUploading ? (
                            <Loader2 className="w-10 h-10 animate-spin text-brand-accent" />
                          ) : (
                            <>
                              <Plus className="w-10 h-10 text-gray-600" />
                              <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Nahrajte z počítače</span>
                            </>
                          )}
                        </label>
                        <input 
                          type="text" 
                          placeholder="Nebo vložte přímý URL obrázku"
                          value={newProject.image || ""}
                          onChange={e => setNewProject({...newProject, image: e.target.value})}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm"
                        />
                      </div>
                    </div>

                    <textarea 
                      placeholder="Krátký popis projektu"
                      value={newProject.description || ""}
                      onChange={e => setNewProject({...newProject, description: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm h-32 focus:border-brand-accent transition-colors resize-none"
                    />

                    <button 
                      onClick={handleAddProject}
                      disabled={isUploading}
                      className="w-full py-5 bg-brand-accent text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-xl hover:scale-[1.02] transition-all shadow-xl shadow-brand-accent/30 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      Publikovat do portfolia
                    </button>
                  </div>
                </div>
              ) : adminTab === "blog" ? (
                /* Admin Blog Tab */
                <div className="p-8 bg-white/5 border border-white/5 rounded-2xl space-y-8">
                  <h3 className="text-xs uppercase tracking-[0.4em] font-bold text-brand-accent flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Nový článek na Blog
                  </h3>
                  
                  <div className="space-y-6">
                    <input 
                      type="text" 
                      placeholder="Název článku"
                      value={newPost.title || ""}
                      onChange={e => setNewPost({...newPost, title: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:border-brand-accent transition-colors font-bold"
                    />
                    
                    <div className="space-y-4">
                      <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-2">Náhledový obrázek</label>
                      <input 
                        type="text" 
                        placeholder="Vložte URL obrázku (Pexels, Unsplash...)"
                        value={newPost.image || ""}
                        onChange={e => setNewPost({...newPost, image: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm"
                      />
                    </div>

                    <textarea 
                      placeholder="Krátké shrnutí (Excerpt)"
                      value={newPost.excerpt || ""}
                      onChange={e => setNewPost({...newPost, excerpt: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm h-24 focus:border-brand-accent transition-colors resize-none"
                    />

                    <textarea 
                      placeholder="Hlavní obsah článku"
                      value={newPost.content || ""}
                      onChange={e => setNewPost({...newPost, content: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm h-64 focus:border-brand-accent transition-colors resize-none mb-4"
                    />

                    <button 
                      onClick={handleAddPost}
                      className="w-full py-5 bg-brand-accent text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-xl hover:scale-[1.02] transition-all shadow-xl shadow-brand-accent/30 flex items-center justify-center gap-3"
                    >
                      <ArrowRight className="w-4 h-4" /> Publikovat článek
                    </button>
                  </div>
                </div>
              ) : (
                /* Admin Services Tab */
                <div className="p-8 bg-white/5 border border-white/5 rounded-2xl space-y-8">
                  <h3 className="text-xs uppercase tracking-[0.4em] font-bold text-brand-accent flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Správa Služeb
                  </h3>
                  
                  <div className="space-y-6">
                    {services.map((service) => (
                      <div key={service.id} className="p-4 bg-black/20 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-white">{service.title}</h4>
                          <button className="p-2 hover:bg-white/5 rounded-full">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-400">{service.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center py-10 border-t border-white/10 mt-20">
                <div className="flex items-center gap-4">
                  <img src={user?.photoURL || "https://picsum.photos/seed/admin/100/100"} className="w-12 h-12 rounded-full border border-brand-accent p-1 bg-black" alt="" />
                  <div className="text-[10px]">
                    <p className="font-black uppercase tracking-widest text-white">{user?.displayName}</p>
                    <p className="text-gray-500 font-mono tracking-tighter">{user?.email}</p>
                  </div>
                </div>
                <button onClick={() => signOut(auth)} className="px-6 py-3 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-500 hover:text-white transition-all">
                  <LogOut className="w-4 h-4 inline-block mr-2" /> Logout
                </button>
              </div>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}
