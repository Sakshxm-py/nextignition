import { useEffect, useRef, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // When video ends, start the fade-out then call onComplete
    const handleEnded = () => {
      setFading(true);
      setTimeout(() => {
        onComplete();
      }, 600); // matches CSS transition duration
    };

    // Fallback: if video fails to play or takes too long, skip after 5s
    const fallback = setTimeout(() => {
      setFading(true);
      setTimeout(() => onComplete(), 600);
    }, 8000);

    video.addEventListener("ended", handleEnded);

    // Attempt to play (required for autoplay on mobile)
    video.play().catch(() => {
      // If autoplay blocked, wait a moment then complete
      setTimeout(() => {
        setFading(true);
        setTimeout(() => onComplete(), 600);
      }, 500);
    });

    return () => {
      video.removeEventListener("ended", handleEnded);
      clearTimeout(fallback);
    };
  }, [onComplete]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.6s ease-in-out",
        pointerEvents: "all",
      }}
    >
      <video
        ref={videoRef}
        src="/splash.mp4"
        muted
        playsInline
        autoPlay
        preload="auto"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </div>
  );
}
