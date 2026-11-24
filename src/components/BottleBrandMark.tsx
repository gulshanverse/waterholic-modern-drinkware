interface BottleBrandMarkProps {
  finish: string;
  variant: 'hero' | 'order';
}

export function BottleBrandMark({ finish, variant }: BottleBrandMarkProps) {
  const isLightBottle = finish === 'glacier' || finish === 'transparent';

  return (
    <div
      className={`bottle-brand-mark bottle-brand-mark--${variant}${isLightBottle ? ' is-dark-ink' : ''}`}
      aria-hidden="true"
    >
      <svg
        className="bottle-brand-droplet"
        viewBox="0 0 24 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2.2C12 2.2 4.2 11.4 4.2 17.4a7.8 7.8 0 0 0 15.6 0C19.8 11.4 12 2.2 12 2.2Z"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        <path
          d="M8.8 18.2a3.3 3.3 0 0 0 3.2 3.2"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      </svg>
      <span className="bottle-brand-wordmark">WATERHOLIC</span>
    </div>
  );
}
