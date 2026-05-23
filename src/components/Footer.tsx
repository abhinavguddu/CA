import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative border-t border-border/30 bg-background/50 backdrop-blur-md py-8 text-center text-sm text-muted-foreground z-10 w-full mt-auto shrink-0">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <div className="flex items-center justify-center gap-2 mb-3">
        <GraduationCap className="size-4 opacity-70" />
        <span className="font-display text-lg opacity-90">CA Mentor</span>
      </div>
      
      <p className="mb-4 text-xs">© {new Date().getFullYear()} CA Mentor · Not affiliated with ICAI</p>
      
      <div className="flex items-center justify-center gap-2 mt-2">
        <span className="text-xs font-medium opacity-80 uppercase tracking-widest">Developed by</span>
        <motion.div
          initial={{ backgroundPosition: '0% 50%' }}
          animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
          transition={{ duration: 3, ease: 'linear', repeat: Infinity }}
          className="inline-block p-[2.5px] rounded-lg"
          style={{
            background: 'linear-gradient(270deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6)',
            backgroundSize: '400% 400%'
          }}
        >
          <span className="block rounded-md bg-background px-4 py-1 text-base font-normal text-foreground border border-transparent">
            Abhinav Guddu
          </span>
        </motion.div>
      </div>
    </footer>
  );
}
