export const FACTS = {
    heart: [
      "The heart pumps ~100,000 times per day. If it pumped less, your organs wouldn’t get enough oxygen and nutrients to work properly.",
      "Your heart moves ~7,500 liters of blood daily. This keeps every cell supplied; when flow drops, you feel tired and dizzy.",
      "The left ventricle is the strongest chamber. It pushes blood to the whole body—if it weakens, exercise becomes harder.",
      "Heart valves act like one-way doors. If they leak, blood can flow backward and reduce your energy levels.",
      "Exercise makes the heart more efficient. A trained heart pumps more blood with fewer beats, improving endurance.",
      "Coronary arteries feed the heart itself. If they narrow, the heart starves—this can cause chest pain (angina)."
    ],
    lungs: [
      "Alveoli are tiny sacs where oxygen enters the blood. If they’re damaged, breathing becomes less efficient and you tire easily.",
      "You take ~20,000 breaths per day. Each breath exchanges gases that keep cells alive and active.",
      "The diaphragm is the main breathing muscle. When it contracts, your lungs fill; if it’s weak, breathing feels harder.",
      "Cilia sweep particles out of airways. When cilia slow (e.g., pollution), mucus builds up and coughing increases.",
      "Lung surface area is like a tennis court. This huge area lets you absorb lots of oxygen quickly for activity.",
      "Carbon dioxide removal keeps blood pH stable. If CO₂ rises, you feel breathless and light-headed."
    ]
  };
  
  export function nextFact(organ, index = 0) {
    const arr = FACTS[organ] || [];
    if (!arr.length) return { text: "", nextIndex: 0 };
    const safeIndex = Math.max(0, Math.min(index, arr.length - 1));
    const text = arr[safeIndex];
    const nextIndex = (safeIndex + 1) % arr.length;
    return { text, nextIndex };
  }