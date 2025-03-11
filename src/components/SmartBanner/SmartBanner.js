import { useEffect, useState } from 'react';

const marketplaceColor = '#5ae271';

const isIOS = () => {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
};

const SmartBanner = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (isIOS()) {
      setShowBanner(true);
    }
  }, []);

  if (!showBanner) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        backgroundColor: 'white',
        color: 'black',
        textAlign: 'center',
        padding: '10px',
        zIndex: 1000,
      }}
    >
      <p>Download our app for the best experience.</p>
      <button
        style={{
          backgroundColor: marketplaceColor,
          color: 'white',
          padding: '5px 10px',
          border: 'none',
          borderRadius: '5px',
          marginTop: '5px',
          cursor: 'pointer',
        }}
        onClick={() => (window.location.href = 'https://apps.apple.com/app/id6505043207')}
      >
        Open in Safari
      </button>
    </div>
  );
};

export default SmartBanner;
