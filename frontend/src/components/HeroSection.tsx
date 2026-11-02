import { TrendingUp, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import logoImage from "../assets/logo.png";
import rocketImage from "figma:asset/82eb0254e6f3e728e5562a8e7c2d26574216fd8e.png";
import { brandColors } from "../utils/colors";
import api from "../services/api";
import { Capacitor } from '@capacitor/core';

export function HeroSection() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState({
    startups: '0',
    totalUsers: '0',
    successRate: '0%',
    funding: '$0',
    mentors: '0',
    investors: '0'
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/public/stats');
        if (response.data) {
          // Merge onto defaults so a field the API omits (e.g. an older backend
          // without `totalUsers`) doesn't blank out the value with `undefined`.
          setStats((prev) => ({ ...prev, ...response.data }));
        }
      } catch (error) {
        console.error('Error fetching platform stats:', error);
      }
    };
    fetchStats();
  }, []);

  const goToSignupWithRole = (role: 'founder' | 'expert' | 'investor') => {
    sessionStorage.setItem('prefillSelectedRoles', JSON.stringify([role]));
    window.location.hash = '#signup';
  };

  return (
    <div className="relative min-h-screen bg-white overflow-hidden">

      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-[9999]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 lg:px-8 py-4">
          {/* Logo - Outside background */}
          <div className="flex items-center gap-2">
            <img
              src={logoImage}
              alt="Next Ignition Logo"
              className="h-10 md:h-12 lg:h-14 w-auto object-contain"
            />
          </div>

          {/* Navigation Links and Buttons - Desktop only */}
          <div className="hidden lg:flex items-center gap-3 xl:gap-6 bg-gray-50/80 backdrop-blur-sm rounded-full px-4 xl:px-6 py-2">
            <div className="flex items-center gap-3 xl:gap-6">
              <a
                href="#features"
                className="text-xs xl:text-sm font-medium hover:text-gray-600 transition-colors"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-xs xl:text-sm font-medium hover:text-gray-600 transition-colors"
              >
                How it Works
              </a>
              <a
                href="#ai-tools"
                className="text-xs xl:text-sm font-medium hover:text-gray-600 transition-colors"
              >
                AI Tools
              </a>
              <a
                href="#community"
                className="text-xs xl:text-sm font-medium hover:text-gray-600 transition-colors"
              >
                Community
              </a>
              <a
                href="#events"
                className="text-xs xl:text-sm font-medium hover:text-gray-600 transition-colors"
              >
                Events
              </a>
              {Capacitor.getPlatform() !== 'ios' && (
                <a
                  href="#pricing"
                  className="text-xs xl:text-sm font-medium hover:text-gray-600 transition-colors"
                >
                  Pricing
                </a>
              )}
              <a
                href="#about"
                className="text-xs xl:text-sm font-medium hover:text-gray-600 transition-colors"
              >
                About
              </a>
            </div>

            <div className="flex items-center gap-2 xl:gap-3 ml-2 xl:ml-4">
              <a href="#login" className="px-5 py-2 text-sm font-medium border border-gray-300 rounded-full hover:bg-gray-100 bg-white">
                Log In
              </a>
              <a href="#register" className="px-5 py-2 text-sm font-medium text-white rounded-full bg-blue-600 hover:bg-blue-700 transition-colors">
                Free Registration
              </a>
              <a
                href="#signup"
                className="px-5 py-2 text-sm font-medium text-white rounded-full transition-colors"
                style={{
                  backgroundColor: brandColors.atomicOrange,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.opacity = "0.9")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.opacity = "1")
                }
              >
                Launch App
              </a>
            </div>
          </div>

          {/* Mobile Menu Toggle & Login */}
          <div className="flex items-center gap-2 lg:hidden">
            <a href="#login" className="px-4 py-1.5 text-sm font-medium border border-gray-300 rounded-full hover:bg-gray-100 bg-white">
              Log In
            </a>
            <button
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden absolute left-0 right-0 bg-white shadow-xl z-20 overflow-y-auto max-h-[calc(100vh-80px)] no-scrollbar border-t border-gray-100"
            style={{ top: 'calc(100px + env(safe-area-inset-top))' }}
          >
            <div className="max-w-7xl mx-auto px-6 py-8">
              <nav className="flex flex-col gap-1">
                {['Features', 'How it Works', 'AI Tools', 'Community', 'Events', 'Pricing', 'About'].map((item) => {
                  if (item === 'Pricing' && Capacitor.getPlatform() === 'ios') return null;
                  return (
                    <a
                      key={item}
                      href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                      className="text-lg font-bold text-gray-900 hover:text-blue-600 py-4 border-b border-gray-50 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item}
                    </a>
                  );
                })}
              </nav>

              <div className="mt-8 space-y-4">
                <a
                  href="#login"
                  className="block w-full px-6 py-4 text-center font-bold text-gray-900 bg-gray-50 rounded-xl"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Log In
                </a>
                <a
                  href="#register"
                  className="block w-full px-6 py-4 text-center font-bold text-white bg-blue-600 rounded-xl"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Free Registration
                </a>
                <a
                  href="#signup"
                  className="block w-full px-6 py-4 text-center font-bold text-white rounded-xl shadow-lg"
                  style={{ backgroundColor: brandColors.atomicOrange }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Join Beta
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content - Responsive Layout */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 pt-1 pb-8 lg:py-0 overflow-x-clip">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start lg:items-center lg:min-h-[calc(100dvh-5rem)] lg:pb-4">
          {/* Left Side - Content */}
          <div className="flex flex-col relative z-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-block mb-4"
            >
              <span
                className="px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-[10px] lg:text-xs font-semibold tracking-wide uppercase text-white"
                style={{
                  backgroundColor: `${brandColors.atomicOrange}33`,
                }}
              >
                <span
                  style={{ color: brandColors.atomicOrange }}
                >
                  STARTUP LAUNCH MADE EASY
                </span>
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl sm:text-5xl lg:text-7xl leading-[1.1] tracking-tight mb-4 lg:mb-6"
            >
              Turning Startup Ideas{" "}
              <br className="hidden sm:block" />
              into Reality
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-sm lg:text-base mb-6 lg:mb-8 text-gray-700 leading-relaxed max-w-md"
            >
              NextIgnition helps founders grow from idea to
              launch. Connect with experts, get mentorship,
              build your MVP, and raise funding all on one
              platform.
            </motion.p>

            {/* Feature Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap items-center gap-2 lg:gap-3 mb-6 lg:mb-8"
            >
              <span className="px-3 lg:px-4 py-1.5 lg:py-2 text-white rounded-full text-xs lg:text-sm font-bold bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 shadow-md flex items-center gap-1.5 animate-pulse">
                📸 New: Founder Stories
              </span>
              <span className="px-3 lg:px-4 py-1.5 lg:py-2 bg-gray-100 text-gray-700 rounded-full text-xs lg:text-sm font-medium">
                AI Powered Matching
              </span>
              <span className="px-3 lg:px-4 py-1.5 lg:py-2 bg-gray-100 text-gray-700 rounded-full text-xs lg:text-sm font-medium">
                All in One Platform
              </span>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="grid grid-cols-2 lg:flex items-center gap-4 mb-8 lg:mb-14"
            >
              <button
                onClick={() => goToSignupWithRole('founder')}
                className="px-4 lg:px-6 py-2.5 lg:py-3 text-white rounded-lg transition-all font-bold text-xs lg:text-sm shadow-md active:scale-95 flex items-center justify-center text-center whitespace-nowrap"
                style={{
                  backgroundColor: brandColors.atomicOrange,
                }}
              >
                Join as Founder
              </button>
              <button
                onClick={() => goToSignupWithRole('founder')}
                className="px-4 lg:px-6 py-2.5 lg:py-3 text-white rounded-lg transition-all font-bold text-xs lg:text-sm shadow-md active:scale-95 flex items-center justify-center text-center whitespace-nowrap"
                style={{
                  backgroundColor: brandColors.navyBlue,
                }}
              >
                Join as Co-founder
              </button>
              <button
                onClick={() => goToSignupWithRole('expert')}
                className="px-4 lg:px-6 py-2.5 lg:py-3 text-white rounded-lg transition-all font-bold text-xs lg:text-sm shadow-md active:scale-95 flex items-center justify-center text-center whitespace-nowrap"
                style={{
                  backgroundColor: brandColors.electricBlue,
                }}
              >
                Join as Expert
              </button>
              <button
                onClick={() => goToSignupWithRole('investor')}
                className="px-4 lg:px-6 py-2.5 lg:py-3 text-white rounded-lg transition-all font-bold text-xs lg:text-sm shadow-md active:scale-95 flex items-center justify-center text-center whitespace-nowrap"
                style={{
                  backgroundColor: brandColors.electricBlue,
                }}
              >
                Join as Investor
              </button>
            </motion.div>

            {/* Stats Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex flex-col sm:flex-row items-center sm:items-start justify-center sm:justify-start gap-4 lg:gap-6 text-center sm:text-left"
            >
              <div className="flex -space-x-2">
                <div
                  className="w-8 h-8 lg:w-10 lg:h-10 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] lg:text-xs font-semibold"
                  style={{
                    backgroundColor: brandColors.atomicOrange,
                  }}
                >
                  AC
                </div>
                <div
                  className="w-8 h-8 lg:w-10 lg:h-10 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] lg:text-xs font-semibold"
                  style={{
                    backgroundColor: brandColors.electricBlue,
                  }}
                >
                  RF
                </div>
                <div
                  className="w-8 h-8 lg:w-10 lg:h-10 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] lg:text-xs font-semibold"
                  style={{
                    backgroundColor: brandColors.navyBlue,
                  }}
                >
                  DF
                </div>
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-purple-400 border-2 border-white flex items-center justify-center text-white text-[10px] lg:text-xs font-semibold">
                  HK
                </div>
              </div>
              <div className="flex flex-col gap-1 items-center sm:items-start">
                <p className="text-xs lg:text-sm font-semibold text-gray-800">
                  {stats.totalUsers && stats.totalUsers !== '0' ? stats.totalUsers : stats.startups} members joined
                </p>
                <p className="text-[10px] lg:text-xs text-gray-600">
                  Founders, co-founders, experts &amp; investors • AI powered matching
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right Side - 3D Sphere */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="hero-sphere-mobile-fix md:relative z-0 w-full h-[240px] sm:h-[320px] md:h-[460px] lg:h-[600px] flex items-center justify-center lg:justify-end md:top-0 md:left-0 md:translate-x-0 md:scale-100 md:opacity-100 md:blur-0 md:pointer-events-auto md:mt-16 lg:mt-0"
          >
            <div className="relative w-full max-w-[310px] md:max-w-[400px] lg:max-w-[480px] h-full lg:translate-x-4 flex items-center justify-center">
              <Sphere stats={stats} />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom accent */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48 lg:h-72 pointer-events-none z-0"
        style={{
          background: `linear-gradient(to top, ${brandColors.atomicOrange}33 0%, ${brandColors.atomicOrange}11 45%, transparent 100%)`,
        }}
      />
    </div>
  );
}

interface SphereProps {
  stats: { startups: string; successRate: string; funding: string; mentors: string; };
}

function Sphere({ stats }: SphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const isMobile = window.innerWidth < 768;

    // Scene setup
    const scene = new THREE.Scene();
    // Always use aspect ratio 1 so the sphere renders as a perfect circle
    const camera = new THREE.PerspectiveCamera(
      75,
      1,
      0.1,
      1000,
    );
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: !isMobile, // Disable antialias on mobile for performance
      powerPreference: isMobile ? 'low-power' : 'default',
    });
    // Enable scissor test so we can render into a centered square viewport
    renderer.setScissorTest(true);

    const canvasEl = canvasRef.current;
    // Store the computed square viewport for use in the render loop
    let vpX = 0, vpY = 0, vpSize = 0;

    const syncRendererToCanvas = () => {
      if (!canvasEl) return;
      const cw = canvasEl.clientWidth;
      const ch = canvasEl.clientHeight;
      if (cw < 2 || ch < 2) return;
      // Cap pixel ratio lower on mobile to reduce GPU load
      const pr = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2);
      renderer.setPixelRatio(pr);
      renderer.setSize(cw, ch, false);

      // Compute a centered square viewport so the sphere is never stretched
      // Three.js setViewport/setScissor internally multiply by pixelRatio, so pass CSS pixels.
      const side = Math.min(cw, ch);
      vpX = (cw - side) / 2;
      vpY = (ch - side) / 2;
      vpSize = side;

      // Camera aspect is always 1 (square) — never changes
      camera.aspect = 1;
      camera.updateProjectionMatrix();
    };
    syncRendererToCanvas();
    const ro = new ResizeObserver(() => syncRendererToCanvas());
    ro.observe(canvasEl);
    requestAnimationFrame(() => syncRendererToCanvas());
    camera.position.z = 4.1;

    // Create hollow orange wireframe sphere with cleaner lines
    // Use fewer segments on mobile
    const geometry = new THREE.SphereGeometry(2.45, isMobile ? 24 : 36, isMobile ? 16 : 24);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff6b00,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.y = 0;
    // Layering equivalent setting for WebGL
    sphere.renderOrder = 0;
    scene.add(sphere);

    // Rocket Emoji 🚀
    // Load custom rocket image
    let rocketSprite: THREE.Sprite | null = null;
    const textureLoader = new THREE.TextureLoader();

    textureLoader.load(
      rocketImage,
      (texture) => {
        const spriteMaterial = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
        });
        rocketSprite = new THREE.Sprite(spriteMaterial);

        // Position and scale the sprite completely outside the sphere
        // Adjust position for mobile vs desktop
        if (isMobile) {
          rocketSprite.position.set(-2.8, 2.8, 0.8); // Higher and more left on mobile
          rocketSprite.scale.set(0.4, 0.4, 1); // Smaller on mobile
        } else {
          rocketSprite.position.set(-2.0, 2.0, 0.5); // Original desktop position
          rocketSprite.scale.set(0.55, 0.55, 1);
        }

        // Tilt towards right (rotate around Z axis)
        rocketSprite.material.rotation = 1.6; // radians for right tilt

        // Guarantee rocket is drawn over the sphere mimicking z-index: 2
        rocketSprite.renderOrder = 2;
        rocketSprite.material.depthTest = false;

        scene.add(rocketSprite);
      },
      undefined,
      (error) => {
        console.error('Error loading rocket image:', error);
      }
    );

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(
      0xffa500,
      0.8,
    );
    directionalLight.position.set(0, -1, 1);
    scene.add(directionalLight);

    // Visibility tracking — pause the render loop when off-screen
    let isVisible = true;
    const observer = new IntersectionObserver(
      ([entry]) => { isVisible = entry.isIntersecting; },
      { threshold: 0 }
    );
    observer.observe(canvasEl);

    // Animation — throttle to ~30 fps on mobile
    let animationId: number;
    let lastFrame = 0;
    const frameInterval = isMobile ? 33 : 0; // ~30fps on mobile, uncapped on desktop
    const animate = (now: number) => {
      animationId = requestAnimationFrame(animate);

      // Skip rendering when off-screen
      if (!isVisible) return;

      // Throttle frame rate on mobile
      if (frameInterval && now - lastFrame < frameInterval) return;
      lastFrame = now;

      sphere.rotation.y += 0.002;
      sphere.rotation.x += 0.001;

      // Gentle floating motion for rocket
      if (rocketSprite) {
        const time = Date.now() * 0.001;
        rocketSprite.position.y = 1.6 + Math.sin(time * 0.8) * 0.1;
      }

      // Clear the entire canvas first (transparent), then render into the square viewport
      renderer.setScissor(0, 0, canvasEl.clientWidth, canvasEl.clientHeight);
      renderer.setViewport(0, 0, canvasEl.clientWidth, canvasEl.clientHeight);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();

      // Now set the square viewport and scissor so the sphere is a perfect circle
      renderer.setScissor(vpX, vpY, vpSize, vpSize);
      renderer.setViewport(vpX, vpY, vpSize, vpSize);
      renderer.render(scene, camera);
    };

    animationId = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      observer.disconnect();
      ro.disconnect();
      cancelAnimationFrame(animationId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain pointer-events-auto"
      />

      {/* Floating Analytics Card - Hide on mobile */}
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          duration: 0.8,
          delay: 1.2,
          ease: "easeOut",
        }}
        className="hidden lg:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 z-20 pointer-events-auto shadow-2xl"
      >
        <motion.div
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="bg-white rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Orange Header */}
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{
              backgroundColor: brandColors.atomicOrange,
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
              className="w-5 h-5 bg-white rounded-full flex items-center justify-center"
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: brandColors.atomicOrange,
                }}
              ></div>
            </motion.div>
            <span className="text-white text-sm font-medium">
              NextIgnition Platform Insights
            </span>
          </div>

          {/* Card Content */}
          <div className="p-5">
            <div
              className="text-xs font-semibold mb-4 tracking-wide"
              style={{ color: brandColors.atomicOrange }}
            >
              Live Platform Stats
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Active Startups */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 0.5 }}
              >
                <div className="text-xs text-gray-500 mb-1">
                  Founders
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[16px] text-gray-900">{stats.startups}</span>
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                    }}
                  >
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Success Rate */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6, duration: 0.5 }}
              >
                <div className="text-xs text-gray-500 mb-1">
                  Success
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[16px] text-gray-900">{stats.successRate}</span>
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                    }}
                  >
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Funding Raised */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.7, duration: 0.5 }}
              >
                <div className="text-xs text-gray-500 mb-1">
                  Funding
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[16px] text-gray-900">{stats.funding}</span>
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: 0.2,
                    }}
                  >
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}