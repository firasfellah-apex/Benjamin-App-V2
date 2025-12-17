import { useEffect, useRef } from 'react';
import LottieComponent from 'lottie-react';
import chatIconAnimation from '@/assets/animations/chatIconAnimation.json';
import chatIconSvgUrl from '@/assets/icons/chatIcon.svg';

interface ChatIconProps {
  hasUnread: boolean;
  className?: string;
}

export function ChatIcon({ hasUnread, className = 'h-[22px] w-[22px]' }: ChatIconProps) {
  const lottieRef = useRef<any>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (hasUnread && lottieRef.current) {
      // Play animation immediately
      lottieRef.current.play();
      
      // Set up interval to replay every 2.5 seconds (2-3 second range)
      intervalRef.current = window.setInterval(() => {
        if (lottieRef.current) {
          lottieRef.current.goToAndPlay(0);
        }
      }, 2500);

      return () => {
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      // Stop animation when no unread messages
      if (lottieRef.current) {
        lottieRef.current.stop();
      }
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [hasUnread]);

  if (hasUnread) {
    return (
      <div className={className} style={{ color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LottieComponent
          lottieRef={lottieRef}
          animationData={chatIconAnimation}
          loop={false}
          autoplay={true}
          style={{ width: '22px', height: '22px' }}
        />
      </div>
    );
  }

  // Static SVG when no unread messages
  return (
    <img 
      src={chatIconSvgUrl} 
      alt="Chat" 
      className={className}
      style={{ width: '22px', height: '22px', objectFit: 'contain' }}
    />
  );
}

