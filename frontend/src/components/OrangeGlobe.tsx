import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { brandColors } from '../utils/colors';

interface OrangeGlobeProps {
  opacity?: number;
  className?: string;
}

export function OrangeGlobe({ opacity = 0.5, className = '' }: OrangeGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });

    renderer.setSize(800, 800);
    renderer.setPixelRatio(window.devicePixelRatio);
    camera.position.z = 4.5;

    // Single orange wireframe sphere
    const orangeWireframeGeometry = new THREE.SphereGeometry(2.5, 20, 20);
    const orangeWireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0xf78405, // Atomic orange
      wireframe: true,
      transparent: true,
      opacity: opacity,
    });
    const orangeWireframe = new THREE.Mesh(
      orangeWireframeGeometry,
      orangeWireframeMaterial
    );
    scene.add(orangeWireframe);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Animation
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      orangeWireframe.rotation.y += 0.003;
      orangeWireframe.rotation.x += 0.001;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      orangeWireframeGeometry.dispose();
      orangeWireframeMaterial.dispose();
      renderer.forceContextLoss();
      renderer.dispose();
    };
  }, [opacity]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%' }}
    />
  );
}