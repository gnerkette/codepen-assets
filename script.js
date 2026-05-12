gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
PixiPlugin.registerPIXI(PIXI);

// ======================================================
// 📏 BASE LAYOUT (design coordinate system)
// ======================================================
const BASE_WIDTH = 820.25;
const BASE_HEIGHT = 300.89;

// ======================================================
// 📐 RESPONSIVE SCALE (maintains aspect ratio)
// ======================================================
function getScale() {
  const scaleX = window.innerWidth / BASE_WIDTH;
  const scaleY = window.innerHeight / BASE_HEIGHT;
  return Math.min(scaleX, scaleY);
}

// ======================================================
// 🚀 MAIN APP
// ======================================================
(async () => {
  // ====================================================
  // 🎮 PIXI APPLICATIONS
  // ====================================================

  // Character renderer (screen space, high-res)
  const characterApp = new PIXI.Application();

  await characterApp.init({ resizeTo: window, backgroundAlpha: 0 });
  document.querySelector("#pixi").appendChild(characterApp.canvas);

  // Crowd renderer (world space)
  const crowdApp = new PIXI.Application();
  await crowdApp.init({
    width: 2000,
    height: 1000,
    resolution: window.devicePixelRatio,
    autoDensity: true,
    backgroundAlpha: 0
  });
  document.querySelector("#pixi-crowd").appendChild(crowdApp.canvas);

  // ====================================================
  // 🎞 LOAD SPRITESHEET
  // ====================================================
  const sheet = await PIXI.Assets.load(
    "https://gnerkette.github.io/codepen-assets/anim_cheer.json"
  );
  const textures = Object.keys(sheet.textures)
    .sort()
    .map((k) => sheet.textures[k]);

  // ====================================================
  // 🧍 MAIN CHARACTER
  // ====================================================
  const character = new PIXI.AnimatedSprite(textures);

  character.anchor.set(0.5, 0.85);
  character.animationSpeed = 0.4;
  character.scale.set(0.5);

  characterApp.stage.addChild(character);

  // ====================================================
  // 👥 CROWD SETUP
  // ====================================================
  const placeholders = document.querySelectorAll(".crowd-placeholder");
  const fans = [];

  placeholders.forEach((el, i) => {
    const fan = new PIXI.AnimatedSprite(textures);

    // Position from SVG placeholder
    fan.x = el.getAttribute("x");
    fan.y = el.getAttribute("y");

    fan.animationSpeed = 0.4;
    fan.scale = 0.25;
    fan.anchor.set(0, 0);

    crowdApp.stage.addChild(fan);
    fans.push(fan);
  });

  // ====================================================
  // 🎬 CHARACTER ANIMATION HELPERS
  // ====================================================

  function playOnce() {
    character.loop = false;
    character.gotoAndPlay(0);

    character.onComplete = () => {
      character.gotoAndStop(0);
    };
  }

  function cheerLoop() {
    character.gotoAndPlay(0);

    character.onComplete = () => {
      character.gotoAndPlay(10);
    };
  }

  // ====================================================
  // 👥 CROWD ANIMATION (STAGGERED CHEER)
  // ====================================================
  function fanCheer() {
    fans.forEach((fan, i) => {
      setTimeout(() => {
        fan.loop = false;

        fan.onComplete = () => {
          fan.gotoAndPlay(10); 
        };

        fan.gotoAndPlay(0);
      }, i * 120);
    });
  }

  // ====================================================
  // 🧱 DOM REFERENCES
  // ====================================================
  const path = document.querySelector("#path");
  const driver = document.querySelector("#driver");
  const world = document.querySelector("#world");
  const fan1loc = document.querySelector("#crowd1");

  if (!path || !driver || !world) {
    console.error("Missing required elements");
    return;
  }

  // ====================================================
  // 🧭 SCROLL → MOTION PATH TIMELINE
  // ====================================================
  const tl = gsap.timeline({
    defaults: { duration: 1, ease: "none" },
    scrollTrigger: {
      trigger: "#scrollArea",
      start: "top top",
      end: () => "+=" + path.getTotalLength() * 5,
      scrub: true,
      invalidateOnRefresh: true,
      onRefresh: (self) => self.animation.progress(self.progress || 0.0001),
      markers: true
    }
  });

  // Driver follows SVG path
  tl.to(driver, {
    motionPath: {
      path: path,
      align: path,
      alignOrigin: [0.5, 0.5],
      autoRotate: false,
      start: 0.1
    }
  });

  // ====================================================
  // 🎥 CAMERA SYSTEM
  // ====================================================
  let camX = 0;
  let camY = 0;

  gsap.ticker.add(() => {
    const rect = driver.getBoundingClientRect();
    const crowdloc = fan1loc.getBoundingClientRect();
    // console.log(crowdloc.left);

    // Character follows driver (screen space)
    character.x = rect.left;
    character.y = rect.top;

    const scale = getScale();

    // Camera target (center character)
    const targetX = window.innerWidth / 2 - rect.left;
    const targetY = window.innerHeight / 2 - rect.top;

    // Smooth camera 
    camX += targetX * 0.1;
    camY += (targetY - camY) * 0.1;

    const scaleBuffer = 100 * scale;

    // Apply world transform
    gsap.set(world, {
      x: camX,
      y: camY + scaleBuffer,
      scale: scale
    });

    // Scale character
    gsap.set(character, {
      scale: scale * 0.25
    });
  });

  // ====================================================
  // 🔄 RESIZE HANDLING
  // ====================================================
  window.addEventListener("resize", () => {
    ScrollTrigger.refresh(true);
  });

  // ====================================================
  // 🎬 TIMELINE EVENTS
  // ====================================================

  // 🌀 Character spins
  tl.to(
    character,
    {
      rotation: "+=" + Math.PI * 2,
      duration: 0.08,
      onStart: playOnce
    },
    0.085
  );

  tl.to(
    character,
    {
      rotation: "+=" + Math.PI * 2,
      duration: 0.04,
      onStart: playOnce
    },
    0.279
  );

  // 🎤 Sign animation
  tl.to("#sign", { y: -500, duration: 0 }, 0);

  tl.to(
    "#sign",
    {
      y: -155,
      duration: 0.2,
      ease: "back.out(1.2)",
      onStart: cheerLoop
    },
    0.8
  );

  // 👥 Crowd reacts (staggered)
  tl.call(fanCheer, null, 0.75);

  // 🌄 Parallax layers
  tl.to("#bg_dist", { x: 300 }, 0);
  tl.to("#bg_mid", { x: 150 }, 0);

  // ✨ Stars
  tl.to(
    "#star-2",
    {
      xPercent: 100,
      opacity: 0.5,
      stagger: 2
    },
    0
  );

  // 🌈 Background color
  tl.to("body", { backgroundColor: "#9682F6", duration: 0.5 }, 0);
  tl.to("body", { backgroundColor: "#000000", duration: 0.5 }, 0.5);
  tl.to("#scrollArea", { backgroundColor: "#000000", opacity: 0.5 }, 0); // darkness falls
})();
