import React, { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

/**
 * MicroMedics — Investor Story Build (v4)
 * New narrative beats:
 *  - MissionBriefScene (meet the patient + animated intro)
 *  - Debriefs after each level (what you fixed + real facts)
 *  - TravelScene (animated journey through a body silhouette)
 * Flow:
 *  Title → MissionBrief → Circulatory → Debrief(Heart) → Travel(Heart→Lungs)
 *  → BodyMap → Lungs → Debrief(Lungs) → BodyMap
 */

export default function MicroMedicsGame() {
  const gameParentRef = useRef(null);
  const gameRef = useRef(null);

  // Visible KPIs
  const [hud, setHud] = useState({ score: 0, health: 100, energy: 0, level: 1 });
  const [stars, setStars] = useState(0);
  const [facts, setFacts] = useState([]);
  const [systems, setSystems] = useState({ heart: false, lungs: false });
  const [playtime, setPlaytime] = useState(0);

  const setHudRef = useRef((v) => setHud((p) => ({ ...p, ...v })));
  const setPlaytimeRef = useRef((s) => setPlaytime(s));

  useEffect(() => {
    setHudRef.current = (v) => setHud((p) => ({ ...p, ...v }));
    setPlaytimeRef.current = (s) => setPlaytime(s);
  }, []);

  useEffect(() => {
    if (gameRef.current || !gameParentRef.current) return;

    // Persistent store
    const storeKey = "mm_progress";
    const loadProgress = () => {
      try { return JSON.parse(localStorage.getItem(storeKey) || "null"); } catch { return null; }
    };
    const saveProgress = (p) => localStorage.setItem(storeKey, JSON.stringify(p));

    // Patient “profile” for the story
    const PATIENTS = [
      { name: "Ava", age: 12, hobby: "soccer", pronoun: "her", they: "she", them: "her" },
      { name: "Noah", age: 11, hobby: "coding", pronoun: "his", they: "he", them: "him" },
    ];
    const patient = PATIENTS[Math.floor(Math.random()*PATIENTS.length)];

    // Global state
    const G = {
      score: 0, health: 100, energy: 0, level: 1,
      powerMode: false, powerTimer: 0,
      stars: 0,
      systems: { heart: false, lungs: false },
      facts: [],
      startTimestamp: Date.now(),
      patient,
      get playtimeSec() { return Math.floor((Date.now() - this.startTimestamp) / 1000); },
      resetStatsForLevel() { this.health = 100; this.energy = 0; this.powerMode = false; this.powerTimer = 0; },
      syncHud() { setHudRef.current({ score: this.score, health: this.health, energy: this.energy, level: this.level }); setPlaytimeRef.current(this.playtimeSec); },
      persist() { saveProgress({ stars: this.stars, systems: this.systems, facts: this.facts }); },
      load() {
        const p = loadProgress(); if (!p) return;
        this.stars = p.stars ?? 0;
        this.systems = { heart: !!p.systems?.heart, lungs: !!p.systems?.lungs };
        this.facts = Array.isArray(p.facts) ? p.facts : [];
      }
    };
    G.load();
    setStars(G.stars); setSystems(G.systems); setFacts(G.facts);

    // React helpers
    const addStars = (n) => { G.stars = Math.max(0, G.stars + n); setStars((s)=>Math.max(0, s+n)); G.persist(); };
    const addFact = (t) => { if (!G.facts.includes(t)) { G.facts.push(t); setFacts((a)=>Array.from(new Set([...a,t]))); G.persist(); } };
    const setSystem = (k, v) => { G.systems[k]=v; setSystems((s)=>({ ...s, [k]: v })); G.persist(); };

    // Shared textures
    class BootScene extends Phaser.Scene {
      constructor(){ super("Boot"); }
      create() {
        const g = this.add.graphics();
        // cell
        g.fillStyle(0xffffff, 1); g.fillCircle(12,12,10);
        g.fillStyle(0x000000,1); g.fillCircle(8,9,2); g.fillCircle(16,9,2); g.fillCircle(12,16,1);
        g.generateTexture("playerCell",24,24); g.clear();
        // energy
        g.fillStyle(0xffd700,1); g.fillCircle(8,8,7); g.generateTexture("energyOrb",16,16); g.clear();
        // brain
        g.fillStyle(0xff69b4,1); g.fillCircle(12,12,10);
        g.fillStyle(0xffffff,1); g.fillCircle(8,8,2); g.fillCircle(16,8,2); g.fillCircle(12,16,2);
        g.generateTexture("brainPower",24,24); g.clear();
        // viruses
        g.fillStyle(0xff3b3b,1); g.fillCircle(12,12,8);
        g.fillStyle(0xffffff,1); g.fillCircle(9,9,1.5); g.fillCircle(15,9,1.5);
        g.generateTexture("virusRed",24,24); g.clear();

        g.fillStyle(0x2ecc71,1); g.fillCircle(12,12,8);
        g.fillStyle(0xffffff,1); g.fillCircle(9,9,1.5); g.fillCircle(15,9,1.5);
        g.generateTexture("virusGreen",24,24); g.clear();

        // platforms
        g.fillStyle(0x8b4513,1); g.fillRect(0,0,32,16); g.generateTexture("platform",32,16); g.clear();
        g.fillStyle(0x6d4c41,1); g.fillRect(0,0,32,10); g.generateTexture("softPlatform",32,10); g.destroy();

        this.scene.start("Title");
      }
    }

    // Title
    class TitleScene extends Phaser.Scene {
      constructor(){ super("Title"); }
      create() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor("#0a0012");
        this.add.text(width/2, 110, "MICROMEDICS", { fontSize:"48px", color:"#fff", fontFamily:"Arial" }).setOrigin(0.5);
        this.add.text(width/2, 160, "Arcade Anatomy • Learn by Playing", { fontSize:"18px", color:"#ffd700", fontFamily:"Arial" }).setOrigin(0.5);
        const hero = this.add.sprite(width/2, height/2 - 20, "playerCell").setScale(2);
        this.tweens.add({ targets: hero, y: hero.y - 10, yoyo: true, repeat:-1, duration:900 });
        const btn = this.add.text(width/2, height-120, "START MISSION", {
          fontSize:"24px", color:"#0a0012", fontFamily:"Arial", backgroundColor:"#00f5d4", padding:{x:16,y:10}
        }).setOrigin(0.5).setInteractive({useHandCursor:true});
        btn.on("pointerdown", () => this.scene.start("MissionBrief"));
      }
    }

    // Mission Briefing (animated setting + patient intro)
    class MissionBriefScene extends Phaser.Scene {
      constructor(){ super("MissionBrief"); }
      create() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor("#0d0a15");

        // “lab monitor” frame
        const frame = this.add.rectangle(width/2, height/2, 700, 420, 0x0, 0.4).setStrokeStyle(1, 0xffffff, 0.15);
        const scan = this.add.rectangle(width/2, height/2-40, 640, 160, 0x00f5d4, 0.06).setStrokeStyle(1,0x00f5d4,0.2);
        const line = this.add.rectangle(width/2-320, scan.y, 2, 2, 0x00f5d4, 0.8);
        this.tweens.add({ targets: line, x: width/2+320, duration: 1600, repeat: -1, yoyo: false });

        // patient card
        const p = G.patient;
        this.add.text(width/2, 90, "Incoming Case", { fontSize: "28px", color:"#fff", fontFamily:"Arial" }).setOrigin(0.5);
        this.add.text(width/2, 126, `${p.name}, age ${p.age}`, { fontSize:"18px", color:"#ffd700", fontFamily:"Arial" }).setOrigin(0.5);
        this.add.text(width/2, 156, `Complaint: fatigue during ${p.hobby}`, { fontSize:"14px", color:"#fff", fontFamily:"Arial" }).setOrigin(0.5);

        // micro ship launching animation
        const ship = this.add.sprite(width/2, height/2 + 100, "playerCell").setScale(2.2);
        this.tweens.add({ targets: ship, y: ship.y - 14, yoyo: true, repeat: -1, duration: 900 });

        // narrative
        const txt = this.add.text(width/2, height - 130,
          `MicroMedic, ${p.name} needs you.\nFirst, stabilize the heart so it can pump efficiently.`,
          { fontSize:"16px", color:"#fff", fontFamily:"Arial", align:"center" }
        ).setOrigin(0.5);

        const btn = this.add.text(width/2, height - 80, "Shrink & Enter →", {
          fontSize:"18px", color:"#0a0012", backgroundColor:"#ffd700", padding:{x:12,y:6}
        }).setOrigin(0.5).setInteractive({useHandCursor:true});

        btn.on("pointerdown", () => { G.level = 1; this.scene.start("CirculatoryLevel"); });
      }
    }

    // helpers for levels
    function levelPhysicsCommon(scene) {
      const { width, height } = scene.scale;
      scene.physics.world.setBounds(0,0,width,height);
      scene.platforms = scene.physics.add.staticGroup();
      return { width, height };
    }
    function enablePlayer(scene, x, y) {
      const p = scene.physics.add.sprite(x, y, "playerCell");
      p.setCollideWorldBounds(true).setBounce(0.08);
      p.body.setSize(20,20);
      p.setDragX(800);
      scene.player = p;
      return p;
    }
    function enableCursors(scene) {
      scene.cursors = scene.input.keyboard.createCursorKeys();
      scene.jumpBufferTime = 0; scene.coyoteTime = 0;
      scene.JUMP_BUFFER_MS = 140; scene.COYOTE_TIME_MS = 140; scene.JUMP_VELOCITY = -460;
      scene.input.keyboard.on("keydown-UP", () => { scene.jumpBufferTime = scene.time.now; });
    }
    function applyMoveAndJump(scene) {
      const onGround = scene.player.body.blocked.down || scene.player.body.touching.down;
      if (onGround) scene.coyoteTime = scene.time.now;
      const speed = 200;
      scene.player.setVelocityX(0);
      if (scene.cursors.left.isDown) scene.player.setVelocityX(-speed);
      else if (scene.cursors.right.isDown) scene.player.setVelocityX(speed);
      const canUseBuffer = scene.time.now - scene.jumpBufferTime <= scene.JUMP_BUFFER_MS;
      const hasCoyote = scene.time.now - scene.coyoteTime <= scene.COYOTE_TIME_MS;
      if (canUseBuffer && hasCoyote) { scene.player.setVelocityY(scene.JUMP_VELOCITY); scene.jumpBufferTime=0; scene.coyoteTime=0; }
    }

    // Level 1 — Circulatory
    class CirculatoryLevel extends Phaser.Scene {
      constructor(){ super("CirculatoryLevel"); this._completed=false; this.lastHitAt=0; this.HIT_COOLDOWN_MS=650; }
      create() {
        G.resetStatsForLevel(); G.syncHud();
        this._completed=false; this.lastHitAt=0;
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor("#1b0b21");
        for (let i=0;i<6;i++){ const b=this.add.rectangle(width/2,i*100+50,width,60,0x5b1a34,0.15); this.tweens.add({targets:b,alpha:{from:0.08,to:0.2},yoyo:true,repeat:-1,duration:1800,delay:i*150}); }
        const ctx = levelPhysicsCommon(this);
        this.platforms.create(ctx.width/2, ctx.height-20, "platform").setScale(25,1).refreshBody();
        this.platforms.create(180, ctx.height-120, "platform").setScale(4,1).refreshBody();
        this.platforms.create(ctx.width-180, ctx.height-220, "platform").setScale(4,1).refreshBody();
        this.platforms.create(ctx.width/2, ctx.height-320, "platform").setScale(6,1).refreshBody();
        enablePlayer(this, ctx.width/2, ctx.height-80); enableCursors(this);

        this.add.text(ctx.width/2, 40, "Circulatory System — Heart", { fontSize:"20px", color:"#fff", fontFamily:"Arial" }).setOrigin(0.5);
        this.add.text(ctx.width/2, 70, "Collect ⚡ to 10, grab 🧠 OR eat 🦠", { fontSize:"14px", color:"#ffd700" }).setOrigin(0.5);
        this.objectiveText = this.add.text(ctx.width/2, 16, "", { fontSize:"14px", color:"#ffd700" }).setOrigin(0.5);

        this.orbs = this.physics.add.group();
        const positions = [[120, ctx.height-60],[220, ctx.height-160],[320, ctx.height-60],[420, ctx.height-260],[520, ctx.height-160],[620, ctx.height-60],[720, ctx.height-160],[680, ctx.height-300],[240, ctx.height-300],[400, ctx.height-360],[80, ctx.height-220],[760, ctx.height-220]];
        positions.forEach(([x,y],i)=>{ const o=this.orbs.create(x,y,"energyOrb"); o.setBounce(0.3).setCollideWorldBounds(true); this.tweens.add({targets:o, scale:{from:1,to:1.25}, yoyo:true, repeat:-1, duration:800, delay:i*80}); });

        this.powerups = this.physics.add.group();
        const pu=this.powerups.create(ctx.width/2, ctx.height-360, "brainPower"); this.tweens.add({targets:pu, angle:360, repeat:-1, duration:3000});

        this.viruses = this.physics.add.group();
        const v1=this.viruses.create(150, ctx.height-240, "virusRed");
        const v2=this.viruses.create(650, ctx.height-140, "virusRed");
        [v1,v2].forEach(v=>{ v.setCollideWorldBounds(true).setBounce(1).setMaxVelocity(120,120); v.vulnerable=false; v.setVelocity(Phaser.Math.Between(-60,60),Phaser.Math.Between(-60,60)); });

        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.orbs, this.platforms);
        this.physics.add.collider(this.powerups, this.platforms);
        this.physics.add.collider(this.viruses, this.platforms);

        const maxE = 10;
        this._brain=false; this._virus=false;
        const updateObjective = () => this.objectiveText.setText(`Objectives → Energy ${G.energy}/${maxE} • Brain ${this._brain?1:0}/1 • Virus ${this._virus?1:0}/1`);
        updateObjective();

        this.physics.add.overlap(this.player, this.orbs, (_,orb)=>{ orb.destroy(); if (G.energy<maxE) G.energy+=1; G.score+=10; G.syncHud(); updateObjective(); });
        this.physics.add.overlap(this.player, this.powerups, (_,p)=>{ p.destroy(); this.activatePower(6000); this._brain=true; G.score+=100; G.syncHud(); updateObjective(); });
        this.physics.add.overlap(this.player, this.viruses, (_,v)=>{
          if (!v.active) return;
          if (G.powerMode && v.vulnerable) { v.destroy(); this._virus=true; G.score+=200; G.syncHud(); updateObjective(); }
          else {
            if (this.time.now - this.lastHitAt < this.HIT_COOLDOWN_MS) return;
            this.lastHitAt = this.time.now; G.health -= 10; if (G.health<0) G.health=0; this.cameras.main.shake(160,0.01); G.syncHud();
          }
        });

        this.dialog(`Dr. Nova: Let’s restore strong, steady flow so ${G.patient.name} can keep up with ${G.patient.hobby}.`);
      }
      dialog(text) {
        const { width } = this.scale;
        const box = this.add.rectangle(width/2, 520, 680, 60, 0x000000, 0.5).setStrokeStyle(1,0xffffff,0.2);
        const msg = this.add.text(width/2, 520, text, { fontSize:"14px", color:"#ffffff", fontFamily:"Arial", wordWrap:{width:640} }).setOrigin(0.5);
        this.time.delayedCall(3500, () => { box.destroy(); msg.destroy(); });
      }
      activatePower(ms){ G.powerMode=true; G.powerTimer=ms; this.player.setTint(0x66ffcc); this.viruses.children.iterate(v=>v && (v.vulnerable=true, v.setTint(0x5dade2))); }
      endPower(){ G.powerMode=false; G.powerTimer=0; this.player.clearTint(); this.viruses.children.iterate(v=>v && (v.vulnerable=false, v.clearTint())); }
      complete() {
        if (this._completed) return; this._completed=true;
        this.physics.pause();
        const { width, height } = this.scale;
        this.add.rectangle(width/2, height/2, width, 200, 0x000000, 0.65);
        this.add.text(width/2, height/2 - 52, "Heart Stabilized!", { fontSize:"28px", color:"#00ffad", fontFamily:"Arial" }).setOrigin(0.5);
        const p = G.patient;
        const impact = `${p.name}'s heart can pump efficiently again—${p.they} can play ${p.hobby} without tiring so fast.`;
        const fact1 = "The heart pumps ~100,000 times per day.";
        const fact2 = "Valves prevent backflow, keeping blood moving the right way.";
        this.add.text(width/2, height/2 - 12, impact, { fontSize:"16px", color:"#fff", fontFamily:"Arial", wordWrap:{width:700}, align:"center" }).setOrigin(0.5);
        this.add.text(width/2, height/2 + 18, `Facts: • ${fact1} • ${fact2}`, { fontSize:"14px", color:"#ffd700", fontFamily:"Arial", wordWrap:{width:720}, align:"center" }).setOrigin(0.5);

        addStars(1); addFact(fact1); addFact(fact2); setSystem("heart", true);

        const btn = this.add.text(width/2, height/2 + 58, "Next: Save Breathing →", {
          fontSize:"18px", color:"#0a0012", backgroundColor:"#ffd700", padding:{x:12,y:6}
        }).setOrigin(0.5).setInteractive({useHandCursor:true});
        btn.on("pointerdown", () => this.scene.start("TravelHL")); // Heart→Lungs travel
      }
      update(_, dt) {
        if (this._completed) return;
        if (G.powerMode) { G.powerTimer -= dt; if (G.powerTimer<=0) this.endPower(); }
        if (!this.player?.body) return;
        applyMoveAndJump(this);
        this.viruses.children.iterate(v=>{
          if (!v?.active) return;
          if (G.powerMode) {
            const a = Phaser.Math.Angle.Between(this.player.x, this.player.y, v.x, v.y);
            v.setVelocity(Math.cos(a)*90, Math.sin(a)*90);
          } else {
            this.physics.moveToObject(v, this.player, 70);
          }
        });
        if (G.energy>=10 && (this._brain || this._virus)) this.complete();
        if (G.health<=0) this.scene.restart();
      }
    }

    // Travel animation — Heart to Lungs
    class TravelHeartToLungs extends Phaser.Scene {
      constructor(){ super("TravelHL"); }
      create() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor("#0b1020");
        // Body silhouette
        const body = this.add.rectangle(width/2, height/2, 360, 520, 0xffffff, 0.05).setStrokeStyle(1,0xffffff,0.12);
        const heartPt = { x: width/2 - 40, y: height/2 - 40 };
        const lungsPt = { x: width/2 + 20, y: height/2 - 60 };

        // Path curve
        const path = new Phaser.Curves.Spline([
          heartPt.x, heartPt.y,
          width/2 - 20, height/2 - 120,
          width/2 + 40, height/2 - 140,
          lungsPt.x, lungsPt.y
        ]);

        // draw path
        const g = this.add.graphics({ lineStyle: { width: 2, color: 0x66ffcc, alpha: 0.5 } });
        path.draw(g);

        // traveler (our cell)
        const traveler = this.add.sprite(heartPt.x, heartPt.y, "playerCell").setScale(1.8);
        this.tweens.addCounter({
          from: 0, to: 1, duration: 1800, onUpdate: (tw) => {
            const p = path.getPoint(tw.getValue());
            traveler.setPosition(p.x, p.y);
          }, onComplete: () => {
            this.scene.start("BodyMap"); // drop them at the map before lungs (play button)
          }
        });

        // caption
        this.add.text(width/2, height - 70, "Traveling to the Lungs...", { fontSize:"18px", color:"#fff", fontFamily:"Arial" }).setOrigin(0.5);
      }
    }

    // Body Map (polished layout)
    class BodyMapScene extends Phaser.Scene {
      constructor() { super("BodyMap"); }

      create() {
        const W = this.scale.width;
        const H = this.scale.height;
        this.cameras.main.setBackgroundColor("#0d1420");
        G.syncHud();

        const PADDING = 24;
        const LEFT_W = 340;
        const MAP_W = W - LEFT_W - PADDING*3;
        const MAP_X = LEFT_W + PADDING*2;
        const MAP_Y = PADDING*2;
        const MAP_H = H - PADDING*4;

        this.add.text(PADDING, PADDING, "Body Map — Restore & Explore", {
          fontFamily: "Arial", fontSize: "22px", color: "#ffffff"
        });

        this.card(PADDING, PADDING*2 + 10, LEFT_W, H - PADDING*3 - 10, 0.06);
        this.card(MAP_X, MAP_Y, MAP_W, MAP_H, 0.04);
        this.add.text(MAP_X + MAP_W/2, MAP_Y + 12, "Select a System", {
          fontFamily: "Arial", fontSize: "18px", color: "#ffffff"
        }).setOrigin(0.5, 0);

        const y0 = PADDING*2 + 24;
        const x0 = PADDING + 16;
        const line = (t, dy, color="#ffffff") =>
          this.add.text(x0, y0 + dy, t, { fontFamily:"Arial", fontSize:"14px", color });

        const repaired = Object.values(G.systems).filter(Boolean).length;
        const factsCount = G.facts.length;
        const mmss = (s)=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
        this.add.text(x0, y0 - 10, "Learning Stats", { fontFamily:"Arial", fontSize:18, color:"#ffd700" });
        line(`⭐ Stars: ${G.stars}`, 24);
        line(`Systems Repaired: ${repaired}`, 48);
        line(`Facts Learned: ${factsCount}`, 72);
        line(`Playtime: ${mmss(G.playtimeSec)}`, 96);
        this.add.text(x0, y0 + 130, "Recent Facts:", { fontFamily:"Arial", fontSize:14, color:"#ffd700" });
        const factsToShow = G.facts.slice(-3);
        if (factsToShow.length === 0) line("— (complete a level to unlock)", 154);
        else factsToShow.forEach((f,i)=> this.add.text(x0+10, y0+154+i*20, `• ${f}`, { fontFamily:"Arial", fontSize:13, color:"#fff", wordWrap:{width: LEFT_W-40} }));

        const nodeY = MAP_Y + MAP_H/2 - 20;
        const heartX = MAP_X + MAP_W * 0.28;
        const lungsX = MAP_X + MAP_W * 0.72;

        const heartBtn = this.button(
          heartX, nodeY - 60, 180, 56,
          G.systems.heart ? "❤️ Heart\nRepaired" : "❤️ Heart\nRepair (⭐1)",
          () => {
            if (G.systems.heart) return;
            if (G.stars < 1) return this.toast("Earn a ⭐ by completing a level first.");
            addStars(-1); setSystem("heart", true); this.toast("Heart valve repaired! Lungs unlocked."); redraw();
          },
          !G.systems.heart && G.stars >= 1
        );

        const lungsBtn = this.button(
          lungsX, nodeY - 60, 160, 56,
          G.systems.heart ? "🫁 Lungs\nPlay" : "🫁 Lungs\nLocked",
          () => {
            if (!G.systems.heart) return this.toast("Repair the Heart first (⭐1).");
            G.level = 2; this.scene.start("LungsLevel");
          },
          G.systems.heart
        );

        this.button(heartX, nodeY + 40, 200, 48, "🫀 Circulatory (Replay)", () => { G.level = 1; this.scene.start("CirculatoryLevel"); }, true);
        const midY = nodeY - 32;
        this.add.line(0, 0, heartX, midY, lungsX, midY, 0xffffff, 0.12).setLineWidth(2,2);
        this.dialog(`Dr. Nova: Great start! Repair, then explore new systems to unlock more facts.`);

        const redraw = () => {
          heartBtn.updateLabel(G.systems.heart ? "❤️ Heart\nRepaired" : "❤️ Heart\nRepair (⭐1)");
          heartBtn.setEnabled(!G.systems.heart && G.stars >= 1);
          lungsBtn.updateLabel(G.systems.heart ? "🫁 Lungs\nPlay" : "🫁 Lungs\nLocked");
          lungsBtn.setEnabled(!!G.systems.heart);
        };
      }

      card(x, y, w, h, alpha=0.06) {
        const r = this.add.rectangle(x, y, w, h, 0xffffff, alpha).setOrigin(0,0);
        r.setStrokeStyle(1, 0xffffff, 0.15); this.add.rectangle(x, y, w, 8, 0xffffff, 0.04).setOrigin(0,0); return r;
      }
      button(x, y, w, h, label, onClick, enabled=true) {
        const bg = this.add.rectangle(x, y, w, h, enabled ? 0xffd700 : 0x666666, 1).setOrigin(0.5);
        bg.setStrokeStyle(1, 0x000000, 0.25);
        const txt = this.add.text(x, y, label, { fontFamily:"Arial", fontSize:16, color: enabled ? "#0a0012" : "#222", align:"center" }).setOrigin(0.5);
        bg.setInteractive({ useHandCursor: enabled });
        if (enabled) { bg.on("pointerover", () => bg.setAlpha(0.9)); bg.on("pointerout", () => bg.setAlpha(1)); bg.on("pointerdown", onClick); }
        return {
          updateLabel: (s) => txt.setText(s),
          setEnabled: (e) => { bg.removeAllListeners(); bg.fillColor = e ? 0xffd700 : 0x666666; txt.setColor(e ? "#0a0012" : "#222"); bg.setInteractive({ useHandCursor: e }); if (e) { bg.on("pointerover", () => bg.setAlpha(0.9)); bg.on("pointerout", () => bg.setAlpha(1)); bg.on("pointerdown", onClick); } }
        };
      }
      toast(text) { const t = this.add.text(this.scale.width/2, this.scale.height - 40, text, { fontFamily:"Arial", fontSize:14, color:"#fff", backgroundColor:"#000", padding:{x:8,y:4} }).setOrigin(0.5); this.tweens.add({ targets:t, alpha:0, y:t.y-18, duration:1500, onComplete:()=>t.destroy() }); }
      dialog(text) { const w=740; const box=this.add.rectangle(this.scale.width/2,520,w+20,60,0x000,0.5).setStrokeStyle(1,0xffffff,0.2); const msg=this.add.text(this.scale.width/2,520,text,{fontFamily:"Arial",fontSize:14,color:"#fff",wordWrap:{width:w}}).setOrigin(0.5); this.time.delayedCall(3200,()=>{box.destroy(); msg.destroy();}); }
    }

    // Level 2 — Lungs
    class LungsLevel extends Phaser.Scene {
      constructor(){ super("LungsLevel"); this._completed=false; this.lastHitAt=0; this.HIT_COOLDOWN_MS=650; }
      create() {
        G.resetStatsForLevel(); G.syncHud();
        this._completed=false; this.lastHitAt=0;
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor("#0b1a1d");
        for (let i=0;i<7;i++){ const b=this.add.rectangle(width/2, i*90+45, width, 50, 0x2a6f73, 0.18); this.tweens.add({targets:b, alpha:{from:0.12,to:0.25}, yoyo:true, repeat:-1, duration:1600, delay:i*120}); }

        const ctx = levelPhysicsCommon(this);
        this.platforms.create(ctx.width/2, ctx.height-16, "softPlatform").setScale(25,1).refreshBody();
        this.platforms.create(220, ctx.height-140, "softPlatform").setScale(5,1).refreshBody();
        this.platforms.create(ctx.width-240, ctx.height-240, "softPlatform").setScale(5,1).refreshBody();
        this.platforms.create(ctx.width/2, ctx.height-320, "softPlatform").setScale(7,1).refreshBody();

        enablePlayer(this, ctx.width/2, ctx.height-80);
        enableCursors(this);
        this.physics.world.gravity.y = 340;

        this.add.text(ctx.width/2, 40, "Respiratory System — Lungs", { fontSize:"20px", color:"#fff", fontFamily:"Arial" }).setOrigin(0.5);
        this.add.text(ctx.width/2, 70, "Collect ⚡ to 12, grab 🧠 OR inhale (eat) 🦠", { fontSize:"14px", color:"#ffd700" }).setOrigin(0.5);
        this.objectiveText = this.add.text(ctx.width/2, 16, "", { fontSize:"14px", color:"#ffd700" }).setOrigin(0.5);

        const maxE = 12;
        this.orbs = this.physics.add.group();
        for (let i=0;i<14;i++){
          const x = Phaser.Math.Between(60, ctx.width-60);
          const y = Phaser.Math.Between(120, ctx.height-220);
          const o = this.orbs.create(x,y,"energyOrb"); o.setBounce(0.2).setCollideWorldBounds(true);
        }
        this.powerups = this.physics.add.group();
        const pu=this.powerups.create(ctx.width-120, 120, "brainPower"); this.tweens.add({targets:pu, angle:360, repeat:-1, duration:2800});

        this.viruses = this.physics.add.group();
        for (let i=0;i<3;i++){
          const v=this.viruses.create(Phaser.Math.Between(80, ctx.width-80), Phaser.Math.Between(80, 200), "virusGreen");
          v.setCollideWorldBounds(true).setBounce(1).setMaxVelocity(140,140);
          v.vulnerable=false; v.setVelocity(Phaser.Math.Between(-40,40), Phaser.Math.Between(20,60));
        }

        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.orbs, this.platforms);
        this.physics.add.collider(this.powerups, this.platforms);
        this.physics.add.collider(this.viruses, this.platforms);

        this._brain=false; this._virus=false;
        const updateObjective = () => this.objectiveText.setText(`Objectives → Energy ${G.energy}/${maxE} • Brain ${this._brain?1:0}/1 • Virus ${this._virus?1:0}/1`);
        updateObjective();

        this.physics.add.overlap(this.player, this.orbs, (_,orb)=>{ orb.destroy(); if (G.energy<maxE) G.energy+=1; G.score+=10; G.syncHud(); updateObjective(); });
        this.physics.add.overlap(this.player, this.powerups, (_,p)=>{ p.destroy(); this.activatePower(6000); this._brain=true; G.score+=120; G.syncHud(); updateObjective(); });
        this.physics.add.overlap(this.player, this.viruses, (_,v)=>{
          if (!v.active) return;
          if (G.powerMode && v.vulnerable) { v.destroy(); this._virus=true; G.score+=220; G.syncHud(); updateObjective(); }
          else {
            if (this.time.now - this.lastHitAt < this.HIT_COOLDOWN_MS) return;
            this.lastHitAt = this.time.now; G.health -= 10; if (G.health<0) G.health=0; this.cameras.main.shake(160,0.01); G.syncHud();
          }
        });

        this.dialog(`Dr. Nova: Clear pathogens and power up oxygen exchange in the alveoli!`);
      }
      dialog(text) {
        const { width } = this.scale;
        const box = this.add.rectangle(width/2, 520, 720, 60, 0x000, 0.5).setStrokeStyle(1,0xffffff,0.2);
        const msg = this.add.text(width/2, 520, text, { fontSize:"14px", color:"#fff", fontFamily:"Arial", wordWrap:{width:680} }).setOrigin(0.5);
        this.time.delayedCall(3500, ()=>{ box.destroy(); msg.destroy(); });
      }
      activatePower(ms){ G.powerMode=true; G.powerTimer=ms; this.player.setTint(0x66ffcc); this.viruses.children.iterate(v=>v && (v.vulnerable=true, v.setTint(0x2ecc71))); }
      endPower(){ G.powerMode=false; G.powerTimer=0; this.player.clearTint(); this.viruses.children.iterate(v=>v && (v.vulnerable=false, v.clearTint())); }
      complete(){
        if (this._completed) return; this._completed=true;
        this.physics.pause();
        const { width, height } = this.scale;
        this.add.rectangle(width/2, height/2, width, 200, 0x000000, 0.65);
        this.add.text(width/2, height/2 - 52, "Breathing Restored!", { fontSize:"28px", color:"#00ffad", fontFamily:"Arial" }).setOrigin(0.5);
        const p = G.patient;
        const impact = `${p.name} can take deeper breaths—more oxygen reaches the blood, so ${p.them} energy returns.`;
        const fact1 = "Alveoli are tiny sacs where oxygen enters the blood.";
        const fact2 = "The diaphragm helps pull air into the lungs by creating negative pressure.";
        this.add.text(width/2, height/2 - 12, impact, { fontSize:"16px", color:"#fff", fontFamily:"Arial", wordWrap:{width:700}, align:"center" }).setOrigin(0.5);
        this.add.text(width/2, height/2 + 18, `Facts: • ${fact1} • ${fact2}`, { fontSize:"14px", color:"#ffd700", fontFamily:"Arial", wordWrap:{width:720}, align:"center" }).setOrigin(0.5);

        addStars(1); addFact(fact1); addFact(fact2); setSystem("lungs", true);

        const btn = this.add.text(width/2, height/2 + 58, "Return to Body Map", {
          fontSize:"18px", color:"#0a0012", backgroundColor:"#ffd700", padding:{x:12,y:6}
        }).setOrigin(0.5).setInteractive({useHandCursor:true});
        btn.on("pointerdown", ()=> this.scene.start("BodyMap"));
      }
      update(_, dt) {
        if (this._completed) return;
        if (G.powerMode) { G.powerTimer -= dt; if (G.powerTimer<=0) this.endPower(); }
        if (!this.player?.body) return;
        applyMoveAndJump(this);
        this.viruses.children.iterate(v=>{
          if (!v?.active) return;
          if (G.powerMode) {
            const a=Phaser.Math.Angle.Between(this.player.x,this.player.y,v.x,v.y); v.setVelocity(Math.cos(a)*100, Math.sin(a)*100);
          } else {
            const a=Phaser.Math.Angle.Between(v.x,v.y,this.player.x,this.player.y);
            v.body.velocity.x += Math.cos(a)*10;
            v.body.velocity.y += Math.sin(a)*10;
          }
        });
        if (G.health<=0) this.scene.restart();
        if (G.energy>=12 && (this._brain || this._virus)) this.complete();
      }
    }

    // Phaser config
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameParentRef.current,
      backgroundColor: "#0c0c0c",
      physics: { default: "arcade", arcade: { gravity: { y: 400 }, debug: false } },
      scene: [
        BootScene,
        TitleScene,
        MissionBriefScene,   // new
        CirculatoryLevel,
        TravelHeartToLungs,  // new
        BodyMapScene,
        LungsLevel
      ],
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: false },
    };

    gameRef.current = new Phaser.Game(config);

    const t = setInterval(() => setPlaytimeRef.current(G.playtimeSec), 1000);
    return () => { clearInterval(t); if (gameRef.current) { gameRef.current.destroy(true); gameRef.current = null; } };
  }, []);

  // React shell UI (unchanged)
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f0b1a 0%, #0b1a16 100%)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "14px 0",
      }}
    >
      <div style={{ width:"100%", maxWidth:1200, padding:"0 16px" }}>
        <h1 style={{ fontSize:28, fontWeight:900, margin:0 }}>MicroMedics — Scene 1 & 2</h1>
        <div style={{ opacity:0.75, marginTop:4 }}>Arcade core + Homescapes-style meta (React + Phaser)</div>
        <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
          <Badge>⭐ Stars: <b>{stars}</b></Badge>
          <Badge>🏆 Score: <b>{hud.score}</b></Badge>
          <Badge>❤️ Health: <b>{hud.health}</b></Badge>
          <Badge>⚡ Energy: <b>{hud.energy}</b></Badge>
          <Badge>🧠 Level: <b>{hud.level}</b></Badge>
          <Badge>⏱️ Time on task: <b>{mmss(playtime)}</b></Badge>
          <Badge>🔧 Systems repaired: <b>{(systems.heart?1:0)+(systems.lungs?1:0)}</b></Badge>
          <Badge>📚 Facts learned: <b>{facts.length}</b></Badge>
        </div>
      </div>

      <div style={{ width:"100%", maxWidth:1000, aspectRatio:"4/3", borderRadius:16, overflow:"hidden", border:"1px solid rgba(255,255,255,0.15)", boxShadow:"0 10px 30px rgba(0,0,0,0.35)", marginTop:12 }}>
        <div ref={gameParentRef} style={{ width:"100%", height:"100%" }} />
      </div>

      <div style={{ width:"100%", maxWidth:1200, display:"grid", gridTemplateColumns:"1fr 2fr", gap:16, marginTop:16 }}>
        <Card title="Recent Facts">
          {facts.length === 0 ? (
            <p style={{ opacity:0.7, fontSize:14, margin:0 }}>Complete a level to unlock facts.</p>
          ) : (
            <ul style={{ margin:0, paddingLeft:18 }}>
              {facts.slice(-5).map((f,i)=> <li key={i} style={{ fontSize:14, margin:"4px 0" }}>{f}</li>)}
            </ul>
          )}
        </Card>
        <Card title="What investors see (live KPIs)">
          <ul style={{ margin:0, paddingLeft:18 }}>
            <li style={{ margin:"4px 0" }}>Narrative: meet the patient → fix a system → **impact statement**.</li>
            <li style={{ margin:"4px 0" }}>Animated travel shows **progress through the body**.</li>
            <li style={{ margin:"4px 0" }}>Learning: **facts learned** & **systems repaired** persist.</li>
            <li style={{ margin:"4px 0" }}>Conversion: ⭐ → repair → unlock next system.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Badge({ children }) {
  return (
    <div style={{ padding:"6px 10px", borderRadius:12, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", fontSize:13 }}>
      {children}
    </div>
  );
}
function Card({ title, children }) {
  return (
    <div style={{ padding:16, borderRadius:16, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.15)" }}>
      <h3 style={{ marginTop:0 }}>{title}</h3>
      {children}
    </div>
  );
}
function mmss(s){ return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`; }
