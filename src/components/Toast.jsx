
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";

const toastConfig = {
  success: {
    icon: CheckCircle2,
    color: "#37845a",
  },
  error: {
    icon: XCircle,
    color: "#cf4545",
  },
  warning: {
    icon: AlertTriangle,
    color: "#c18a25",
  },
  info: {
    icon: Info,
    color: "#4778bd",
  },
};

export default function Toast({
  message,
  type = "success",
  duration = 3000,
  onClose,
}) {
  const [closing, setClosing] = useState(false);

  const config = toastConfig[type] || toastConfig.info;
  const Icon = config.icon;

  useEffect(() => {
    if (!message) return;

    setClosing(false);

    const closeTimer = setTimeout(() => {
      setClosing(true);
    }, duration);

    const removeTimer = setTimeout(() => {
      onClose?.();
    }, duration + 300);

    return () => {
      clearTimeout(closeTimer);
      clearTimeout(removeTimer);
    };
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      className={`
        fixed bottom-6 left-1/2 z-[9999]
        flex items-center gap-3
        w-[min(390px,calc(100vw-32px))]
        rounded-xl border border-[#e9e9e9]
        bg-white px-3.5 py-3 pr-10
        text-[#242424]
        shadow-[0_8px_30px_rgba(0,0,0,0.12)]
        ${closing ? "animate-toast-out" : "animate-toast-in"}
      `}
    >
      {/* Icon */}
      <div
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
        style={{
          color: config.color,
          backgroundColor: `${config.color}1F`,
        }}
      >
        <Icon size={18} strokeWidth={2} />
      </div>

      {/* Message */}
      <p className="m-0 min-w-0 flex-1 break-words text-[13px] font-medium leading-5 text-[#444]">
        {message}
      </p>

      {/* Close */}
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onClose}
        className="
          absolute right-2.5 top-1/2 -translate-y-1/2
          grid h-6 w-6 place-items-center
          rounded-md text-[#888]
          transition-colors duration-200
          hover:bg-[#f2f2f2] hover:text-[#222]
        "
      >
        <X size={15} />
      </button>

      {/* Progress */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden rounded-b-xl bg-[#f0f0f0]">
        <span
          key={`${message}-${duration}`}
          className="block h-full w-full origin-left animate-toast-progress"
          style={{
            backgroundColor: config.color,
            animationDuration: `${duration}ms`,
          }}
        />
      </div>

      {/* Animations */}
      <style>{`
        @keyframes toast-slide-in {
          from {
            opacity: 0;
            transform: translate(-50%, 25px) scale(.97);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }

        @keyframes toast-slide-out {
          from {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
          to {
            opacity: 0;
            transform: translate(-50%, 20px) scale(.97);
          }
        }

        @keyframes toast-countdown {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }

        .animate-toast-in {
          animation: toast-slide-in 300ms cubic-bezier(.2,.8,.2,1) both;
        }

        .animate-toast-out {
          animation: toast-slide-out 300ms ease-in both;
        }

        .animate-toast-progress {
          animation: toast-countdown linear forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-toast-in,
          .animate-toast-out {
            animation-duration: 1ms;
          }

          .animate-toast-progress {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
