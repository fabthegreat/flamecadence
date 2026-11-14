// Manifeste PWA généré à la volée : l'appli tient en un seul fichier, donc ni manifest.webmanifest ni icônes PNG à héberger à côté.
// Chrome / Brave / Edge exigent un manifeste valide avec des icônes PNG 192 et 512 px pour proposer « Installer l'application ».
// (L'installation exige aussi une adresse https:// ou http://localhost : impossible depuis un fichier ouvert en file://.)
(function(){
  if(!/^https?:$/.test(location.protocol)) return;
  const mf = document.getElementById("mf"), ic = document.querySelector('link[rel="icon"]'); if(!mf || !ic) return;
  const img = new Image(); img.width = img.height = 512;
  img.onload = () => {
    try{
      const mk = (size, pad) => { const c = document.createElement("canvas"); c.width = c.height = size; const g = c.getContext("2d"); g.fillStyle = "#141b24"; g.fillRect(0, 0, size, size); const p = size * pad; g.drawImage(img, p, p, size - 2 * p, size - 2 * p); return c.toDataURL("image/png"); };
      const path = location.pathname, m = {
        name: "FlameCadence", short_name: "FlameCadence", description: "Build, analyse and export structured cycling workouts with intervals.icu",
        start_url: location.origin + path, scope: location.origin + path.replace(/[^\/]*$/, ""), id: location.origin + path,
        display: "fullscreen", display_override: ["fullscreen", "standalone"], background_color: "#141b24", theme_color: "#141b24",
        icons: [{src: mk(192, 0), sizes: "192x192", type: "image/png", purpose: "any"}, {src: mk(512, 0), sizes: "512x512", type: "image/png", purpose: "any"}, {src: mk(512, .12), sizes: "512x512", type: "image/png", purpose: "maskable"}]
      };
      mf.href = URL.createObjectURL(new Blob([JSON.stringify(m)], {type: "application/manifest+json"}));
    }catch(e){}
  };
  img.src = ic.href;
})();
