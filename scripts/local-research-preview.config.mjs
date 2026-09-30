import { defineConfig } from 'vite';

// Local-only proxy lets the prototype read the shared API without changing its CORS policy.
export default defineConfig({
  define:{'import.meta.env.VITE_CHARTVIEW_API_BASE':JSON.stringify('/backend')},
  server:{host:'127.0.0.1',port:5180,strictPort:true,proxy:{
    '/backend':{target:'https://chart-view-pkv8.onrender.com',changeOrigin:true,rewrite:path=>path.replace(/^\/backend/,'')},
  }},
});
