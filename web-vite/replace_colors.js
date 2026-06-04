import fs from 'fs';
import path from 'path';

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else if (dirFile.endsWith('.tsx') || dirFile.endsWith('.ts')) {
      filelist.push(dirFile);
    }
  });
  return filelist;
};

const files = walkSync('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Backgrounds
  content = content.replace(/bg-slate-50\/50/g, 'bg-beige/50');
  content = content.replace(/bg-slate-50/g, 'bg-beige');
  content = content.replace(/bg-slate-900\/80/g, 'bg-delft/80');
  content = content.replace(/bg-slate-900/g, 'bg-delft');
  content = content.replace(/bg-slate-800/g, 'bg-delft/90');
  content = content.replace(/bg-emerald-500/g, 'bg-pistachio');
  content = content.replace(/bg-emerald-600/g, 'bg-fern');
  content = content.replace(/bg-emerald-50/g, 'bg-pistachio/30');
  content = content.replace(/bg-emerald-100/g, 'bg-pistachio/60');
  content = content.replace(/bg-slate-100/g, 'bg-carolina/20');
  content = content.replace(/bg-slate-200/g, 'bg-carolina/40');
  content = content.replace(/bg-blue-50/g, 'bg-carolina/20');
  
  // Text
  content = content.replace(/text-slate-900/g, 'text-delft');
  content = content.replace(/text-slate-800/g, 'text-delft/90');
  content = content.replace(/text-slate-700/g, 'text-delft/80');
  content = content.replace(/text-slate-600/g, 'text-delft/70');
  content = content.replace(/text-slate-500/g, 'text-delft/60');
  content = content.replace(/text-slate-400/g, 'text-carolina');
  content = content.replace(/text-slate-300/g, 'text-carolina/70');
  content = content.replace(/text-emerald-500/g, 'text-fern');
  content = content.replace(/text-emerald-600/g, 'text-fern');
  content = content.replace(/text-emerald-700/g, 'text-fern');
  content = content.replace(/text-emerald-800/g, 'text-fern');
  content = content.replace(/text-blue-600/g, 'text-delft');
  
  // Borders
  content = content.replace(/border-slate-100/g, 'border-carolina/20');
  content = content.replace(/border-slate-200/g, 'border-carolina/40');
  content = content.replace(/border-slate-300/g, 'border-carolina/60');
  content = content.replace(/border-slate-900/g, 'border-delft');
  content = content.replace(/border-emerald-100/g, 'border-pistachio/50');
  content = content.replace(/border-emerald-200/g, 'border-pistachio');
  content = content.replace(/border-emerald-500/g, 'border-fern');
  
  // Focus rings
  content = content.replace(/ring-slate-900/g, 'ring-delft');
  
  // Shadows
  content = content.replace(/shadow-slate-900\/20/g, 'shadow-delft/20');
  content = content.replace(/shadow-emerald-500\/20/g, 'shadow-fern/20');

  // Gradient (Landing page)
  content = content.replace(/from-slate-800 to-slate-950/g, 'from-delft to-delft/80');
  
  fs.writeFileSync(file, content);
});

console.log("Colors updated!");
